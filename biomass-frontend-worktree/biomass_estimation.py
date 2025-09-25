import os
import cv2
import numpy as np
import pandas as pd
import torch
import contextlib
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from pathlib import Path
from ultralytics import YOLO
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split, KFold, cross_val_score
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import matplotlib.pyplot as plt
import seaborn as sns
import yaml
from tqdm import tqdm
import joblib
from datetime import datetime

# Set random seeds for reproducibility
np.random.seed(42)
torch.manual_seed(42)

class CNNRGB(nn.Module):
    """CNN model for processing RGB images and predicting biomass."""
    def __init__(self):
        super(CNNRGB, self).__init__()
        self.features = nn.Sequential(
            # First conv block
            nn.Conv2d(3, 16, kernel_size=3, padding=1, stride=2),  # /2
            nn.BatchNorm2d(16),
            nn.ReLU(inplace=True),
            
            # Second conv block
            nn.Conv2d(16, 32, kernel_size=3, padding=1, stride=2),  # /4
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            
            # Third conv block
            nn.Conv2d(32, 64, kernel_size=3, padding=1, stride=2),  # /8
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            
            # Global average pooling
            nn.AdaptiveAvgPool2d((1, 1))
        )
        self.classifier = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(inplace=True),
            nn.Linear(32, 1)  # Single output for regression
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x

class TreeDataset(Dataset):
    """Dataset class for loading tree images and their corresponding AGB values."""
    def __init__(self, image_paths, agb_values, transform=None):
        self.image_paths = image_paths
        self.agb_values = agb_values
        self.transform = transform or transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        image = cv2.imread(str(img_path))
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        if self.transform:
            image = self.transform(image)
            
        agb = torch.tensor(self.agb_values[idx], dtype=torch.float32)
        return image, agb

class BiomassEstimator:
    """Main class for biomass estimation using both traditional ML and CNN approaches."""
    def __init__(self, data_path, yolo_model_path, unet_model_path=None, use_cnn=False, device=None):
        """
        Initialize the BiomassEstimator with paths to data and models.
        
        Args:
            data_path (str): Path to the root directory of the dataset
            yolo_model_path (str): Path to the pre-trained YOLOv8 model
            unet_model_path (str, optional): Path to the pre-trained UNet model. Defaults to None.
        """
        self.data_path = Path(data_path)
        
        # Set up device with CUDA optimizations for RTX 4090
        if device is None:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            if torch.cuda.is_available():
                torch.backends.cudnn.benchmark = True  # Optimize for fixed input sizes
                torch.backends.cuda.matmul.allow_tf32 = True  # Enable TensorFloat-32 on Ampere GPUs
                torch.backends.cudnn.allow_tf32 = True
                print(f"Using GPU: {torch.cuda.get_device_name(0)}")
                print(f"CUDA version: {torch.version.cuda}")
                print(f"cuDNN version: {torch.backends.cudnn.version()}")
        else:
            self.device = torch.device(device)
            
        self.use_cnn = use_cnn
        self.yolo_model = self._load_yolo_model(yolo_model_path)
        self.unet_model = self._load_unet_model(unet_model_path) if unet_model_path else None
        
        if self.use_cnn:
            self.cnn_model = CNNRGB().to(self.device)
            self.criterion = nn.MSELoss()
            self.optimizer = optim.Adam(self.cnn_model.parameters(), lr=0.001)
            self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(self.optimizer, 'min', patience=3)
        else:
            self.rf_model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        
    def _load_yolo_model(self, model_path):
        """Load the YOLOv8 model."""
        try:
            model = YOLO(model_path)
            print(f"Loaded YOLO model from {model_path}")
            return model
        except Exception as e:
            print(f"Error loading YOLO model: {e}")
            return None
    
    def _load_unet_model(self, model_path):
        """Load the UNet model."""
        try:
            # This is a placeholder - you'll need to implement UNet model loading
            # based on your specific UNet implementation
            print(f"Loaded UNet model from {model_path}")
            return None
        except Exception as e:
            print(f"Error loading UNet model: {e}")
            return None
    
    def load_metadata(self):
        """Load the field data CSV containing biomass information."""
        metadata_path = self.data_path / 'field_data.csv'
        try:
            df = pd.read_csv(metadata_path)
            print(f"Loaded metadata with {len(df)} entries")
            return df
        except Exception as e:
            print(f"Error loading metadata: {e}")
            return None
    
    def extract_features_for_image(self, image_path):
        """
        Extract features from an image using YOLOv8 and UNet models.
        
        Args:
            image_path (str): Path to the input image
            
        Returns:
            list: List of feature vectors, one per detected tree
        """
        if not self.yolo_model:
            print("YOLO model not loaded")
            return []
        
        try:
            # Read the image
            image = cv2.imread(str(image_path))
            if image is None:
                print(f"Could not read image: {image_path}")
                return []
                
            # Convert from BGR to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Run YOLO detection
            results = self.yolo_model(image_rgb)
            
            features_list = []
            
            for result in results:
                boxes = result.boxes.xyxy.cpu().numpy()  # Get bounding boxes
                
                for box in boxes:
                    x1, y1, x2, y2 = map(int, box[:4])
                    
                    # Calculate bounding box area
                    bbox_area = (x2 - x1) * (y2 - y1)
                    
                    # Extract the region of interest
                    roi = image_rgb[y1:y2, x1:x2]
                    
                    # Initialize features
                    canopy_area = bbox_area  # Default to bbox area if no UNet
                    avg_red = np.mean(roi[:, :, 0])
                    avg_green = np.mean(roi[:, :, 1])
                    avg_blue = np.mean(roi[:, :, 2])
                    
                    # If UNet model is available, refine the canopy area
                    if self.unet_model:
                        # This is a placeholder - implement UNet segmentation here
                        # mask = self._segment_canopy(roi)
                        # canopy_area = np.sum(mask > 0.5)  # Assuming binary mask
                        pass
                    
                    # Compile features
                    features = [
                        bbox_area,
                        canopy_area,
                        avg_red,
                        avg_green,
                        avg_blue,
                        (x2 - x1) / (y2 - y1) if (y2 - y1) > 0 else 0,  # Aspect ratio
                        np.sqrt(bbox_area / np.pi)  # Equivalent radius
                    ]
                    
                    features_list.append(features)
            
            return features_list
            
        except Exception as e:
            print(f"Error processing image {image_path}: {e}")
            return []
    
    def process_dataset(self, metadata):
        """
        Process the entire dataset to extract features and prepare for training.
        
        Args:
            metadata (pd.DataFrame): DataFrame containing metadata about the images
            
        Returns:
            tuple: (X, y) where X is the feature matrix and y is the target vector
        """
        X = []
        y = []
        processed_count = 0
        
        # Group by site to process each image once
        for site_name, group in metadata.groupby('site'):
            site_dir = self.data_path / 'tiles' / site_name
            
            if not site_dir.exists():
                print(f"Directory not found: {site_dir}")
                continue
                
            # Get all images for this site
            image_files = list(site_dir.glob('*.png'))
            if not image_files:
                print(f"No images found in {site_dir}")
                continue
                
            print(f"Processing {len(image_files)} images for site: {site_name}")
            
            # Process each image
            for img_path in image_files:
                try:
                    # Extract features for all trees in the image
                    features_list = self.extract_features_for_image(str(img_path))
                    
                    if not features_list:
                        print(f"No trees detected in {img_path.name}")
                        continue
                        
                    # For each tree detected, add its features and the corresponding AGB
                    # In this simplified version, we'll use the average AGB for the site
                    # In a real scenario, you'd want to match trees with their specific AGB values
                    site_avg_agb = group['AGB'].mean()
                    
                    # Add each tree's features with the site's average AGB
                    for features in features_list:
                        X.append(features)
                        y.append(site_avg_agb)
                    
                    processed_count += 1
                    if processed_count % 5 == 0:
                        print(f"Processed {processed_count} images, {len(X)} samples collected")
                        
                except Exception as e:
                    print(f"Error processing {img_path.name}: {str(e)}")
        
        return np.array(X), np.array(y)
    
    def train_cnn(self, train_loader, val_loader, num_epochs=20, mixed_precision=True):
        # Enable TF32 for faster training on Ampere GPUs (RTX 4090)
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True
        torch.backends.cudnn.benchmark = True
        
        # Initialize gradient scaler for mixed precision training
        scaler = torch.cuda.amp.GradScaler(enabled=mixed_precision)
        autocast = torch.cuda.amp.autocast if mixed_precision else contextlib.nullcontext
        
        # Gradient accumulation steps (simulates larger batch size)
        accumulation_steps = 4
        
        best_val_loss = float('inf')
        train_losses = []
        val_losses = []
        
        # Clear CUDA cache
        torch.cuda.empty_cache()
        
        for epoch in range(num_epochs):
            # Training phase
            self.cnn_model.train()
            running_loss = 0.0
            
            # Training loop with gradient accumulation
            self.optimizer.zero_grad(set_to_none=True)
            
            for i, (inputs, labels) in enumerate(tqdm(train_loader, desc=f'Epoch {epoch+1}/{num_epochs}')):
                inputs = inputs.to(self.device, non_blocking=True, memory_format=torch.channels_last)
                labels = labels.to(self.device, non_blocking=True)
                
                # Mixed precision training
                with autocast():
                    outputs = self.cnn_model(inputs).squeeze()
                    loss = self.criterion(outputs, labels) / accumulation_steps
                
                # Scale the loss and backpropagate
                scaler.scale(loss).backward()
                
                # Update weights every accumulation_steps
                if (i + 1) % accumulation_steps == 0 or (i + 1) == len(train_loader):
                    scaler.step(self.optimizer)
                    scaler.update()
                    self.optimizer.zero_grad(set_to_none=True)
                
                running_loss += loss.item() * inputs.size(0) * accumulation_steps
            
            epoch_loss = running_loss / len(train_loader.dataset)
            train_losses.append(epoch_loss)
            
            # Validation phase
            eval_metrics = self._evaluate_cnn(val_loader, mixed_precision=mixed_precision)
            val_loss = eval_metrics['mse']  # Use MSE for LR scheduling
            val_losses.append(val_loss)
            
            # Step the scheduler with the validation loss
            if self.scheduler is not None:
                self.scheduler.step(val_loss)
            
            # Save the best model
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                torch.save({
                    'epoch': epoch,
                    'model_state_dict': self.cnn_model.state_dict(),
                    'optimizer_state_dict': self.optimizer.state_dict(),
                    'loss': val_loss,
                }, 'output/best_cnn_model.pth')
            
            print(f'Epoch {epoch+1}/{num_epochs} - Train Loss: {epoch_loss:.4f} - Val Loss: {val_loss:.4f}')
        
        return train_losses, val_losses
    
    def _evaluate_cnn(self, data_loader, mixed_precision=True):
        """
        Evaluate the CNN model on the given data loader with mixed precision.
        
        Returns:
            dict: Dictionary containing evaluation metrics (MSE, R², MAE, RMSE, MAPE)
        """
        self.cnn_model.eval()
        all_outputs = []
        all_labels = []
        
        with torch.no_grad():
            for inputs, labels in data_loader:
                inputs, labels = inputs.to(self.device, non_blocking=True), labels.to(self.device, non_blocking=True)
                
                with torch.cuda.amp.autocast(enabled=mixed_precision):
                    outputs = self.cnn_model(inputs).squeeze()
                
                all_outputs.append(outputs.cpu().numpy())
                all_labels.append(labels.cpu().numpy())
        
        # Convert to numpy arrays
        y_true = np.concatenate(all_labels)
        y_pred = np.concatenate(all_outputs)
        
        # Calculate metrics
        mse = mean_squared_error(y_true, y_pred)
        r2 = r2_score(y_true, y_pred)
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mse)
        mape = np.mean(np.abs((y_true - y_pred) / (y_true + 1e-8))) * 100  # Add small epsilon to avoid division by zero
        
        return {
            'mse': mse,
            'r2': r2,
            'mae': mae,
            'rmse': rmse,
            'mape': mape,
            'y_true': y_true,
            'y_pred': y_pred
        }
    
    def cross_validate(self, X, y, cv=5, model_type='rf'):
        """
        Perform k-fold cross-validation.
        
        Args:
            X: Feature matrix or list of image paths
            y: Target vector
            cv: Number of folds
            model_type: 'rf' for Random Forest or 'cnn' for CNN
            
        Returns:
            dict: Dictionary containing cross-validation results with detailed metrics
        """
        kf = KFold(n_splits=cv, shuffle=True, random_state=42)
        
        # Initialize metric lists
        metrics = {
            'mse': [],
            'r2': [],
            'mae': [],
            'rmse': [],
            'mape': [],
            'y_true': [],
            'y_pred': []
        }
        
        print(f"Performing {cv}-fold cross-validation using {model_type.upper()}...")
        
        if model_type == 'cnn':
            # For CNN, X is a list of image paths
            X = np.array(X)
            y = np.array(y)
            
            for fold, (train_idx, val_idx) in enumerate(kf.split(X)):
                print(f"\nFold {fold + 1}/{cv}")
                
                # Create data loaders for this fold with smaller batch size
                train_dataset = TreeDataset(X[train_idx], y[train_idx])
                val_dataset = TreeDataset(X[val_idx], y[val_idx])
                
                # Use smaller batch size and pin_memory for faster data transfer to GPU
                train_loader = DataLoader(
                    train_dataset, 
                    batch_size=8,  # Reduced from 16
                    shuffle=True,
                    pin_memory=True,
                    num_workers=4,
                    persistent_workers=True
                )
                val_loader = DataLoader(
                    val_dataset, 
                    batch_size=8,  # Reduced from 16
                    shuffle=False,
                    pin_memory=True,
                    num_workers=2,
                    persistent_workers=True
                )
                
                # Train the model
                self.cnn_model = CNNRGB().to(self.device)
                self.optimizer = optim.Adam(self.cnn_model.parameters(), lr=0.001)
                self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(self.optimizer, 'min', patience=3)
                self.criterion = nn.MSELoss()
                
                train_losses, val_losses = self.train_cnn(train_loader, val_loader, num_epochs=20)
                
                # Evaluate on validation set
                eval_results = self._evaluate_cnn(val_loader)
                
                # Store metrics
                for metric in metrics:
                    if metric in eval_results:
                        metrics[metric].append(eval_results[metric])
                
                print(f"\nFold {fold + 1} Results:")
                print(f"  MSE: {eval_results['mse']:.4f}")
                print(f"  R²: {eval_results['r2']:.4f}")
                print(f"  MAE: {eval_results['mae']:.4f}")
                print(f"  RMSE: {eval_results['rmse']:.4f}")
                print(f"  MAPE: {eval_results['mape']:.2f}%")
                
                # Store predictions for overall metrics
                metrics['y_true'].extend(eval_results['y_true'])
                metrics['y_pred'].extend(eval_results['y_pred'])
                
                print(f"Fold {fold + 1} - MSE: {eval_results['mse']:.4f}, R²: {eval_results['r2']:.4f}, MAE: {eval_results['mae']:.4f}")
        
        else:  # Random Forest
            for fold, (train_idx, val_idx) in enumerate(kf.split(X)):
                print(f"\nFold {fold + 1}/{cv}")
                
                X_train, X_val = X[train_idx], X[val_idx]
                y_train, y_val = y[train_idx], y[val_idx]
                
                # Train the model
                self.rf_model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
                self.rf_model.fit(X_train, y_train)
                
                # Make predictions
                y_pred = self.rf_model.predict(X_val)
                
                # Calculate metrics
                mse = mean_squared_error(y_val, y_pred)
                r2 = r2_score(y_val, y_pred)
                mae = mean_absolute_error(y_val, y_pred)
                rmse = np.sqrt(mse)
                mape = np.mean(np.abs((y_val - y_pred) / (y_val + 1e-8))) * 100
                
                metrics['mse'].append(mse)
                metrics['r2'].append(r2)
                metrics['mae'].append(mae)
                metrics['rmse'].append(rmse)
                metrics['mape'].append(mape)
                metrics['y_true'].extend(y_val)
                metrics['y_pred'].extend(y_pred)
                
                print(f"Fold {fold + 1} - MSE: {mse:.4f}, R²: {r2:.4f}, MAE: {mae:.4f}")
        
        # Calculate overall metrics using all predictions
        y_true = np.array(metrics['y_true'])
        y_pred = np.array(metrics['y_pred'])
        
        # Calculate final metrics
        results = {
            'mean_mse': mean_squared_error(y_true, y_pred),
            'mean_r2': r2_score(y_true, y_pred),
            'mean_mae': mean_absolute_error(y_true, y_pred),
            'mean_rmse': np.sqrt(mean_squared_error(y_true, y_pred)),
            'mean_mape': np.mean(np.abs((y_true - y_pred) / (y_true + 1e-8))) * 100,
            'cv_metrics': {
                'mse': metrics['mse'],
                'r2': metrics['r2'],
                'mae': metrics['mae'],
                'rmse': metrics['rmse'],
                'mape': metrics['mape']
            },
            'y_true': y_true,
            'y_pred': y_pred
        }
        
        # Print final results
        print("\n" + "="*50)
        print("Cross-Validation Results:")
        print("="*50)
        print(f"Mean MSE: {results['mean_mse']:.4f} ± {np.std(metrics['mse']):.4f}")
        print(f"Mean R²: {results['mean_r2']:.4f} ± {np.std(metrics['r2']):.4f}")
        print(f"Mean MAE: {results['mean_mae']:.4f} ± {np.std(metrics['mae']):.4f}")
        print(f"Mean RMSE: {results['mean_rmse']:.4f} ± {np.std(metrics['rmse']):.4f}")
        print(f"Mean MAPE: {results['mean_mape']:.2f}% ± {np.std(metrics['mape']):.2f}%")
        print("="*50)
        
        # Plot results
        self._plot_predictions(y_true, y_pred, is_cnn=model_type=='cnn')
        
        return results
    
    def train(self, X, y, test_size=0.2, use_cnn=False, mixed_precision=True):
        """
        Train the model (Random Forest or CNN).
        
        Args:
            X: Feature matrix (for RF) or list of image paths (for CNN)
            y: Target vector
            test_size: Proportion of data to use for testing
            use_cnn: Whether to use CNN instead of Random Forest
            
        Returns:
            dict: Dictionary containing evaluation metrics
        """
        if use_cnn:
            # For CNN, X is a list of image paths
            train_paths, test_paths, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42
            )
            
            # Create data loaders
            train_dataset = TreeDataset(train_paths, y_train)
            test_dataset = TreeDataset(test_paths, y_test)
            
            train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)
            test_loader = DataLoader(test_dataset, batch_size=16, shuffle=False)
            
            # Train the model with mixed precision
            print("Training CNN model with mixed precision...")
            train_losses, val_losses = self.train_cnn(train_loader, test_loader, mixed_precision=mixed_precision)
            
            # Evaluate on test set
            self.cnn_model.load_state_dict(torch.load('output/best_cnn_model.pth')['model_state_dict'])
            self.cnn_model.eval()
            
            y_true = []
            y_pred = []
            
            with torch.no_grad():
                for inputs, labels in test_loader:
                    inputs, labels = inputs.to(self.device), labels.to(self.device)
                    outputs = self.cnn_model(inputs).squeeze()
                    y_true.extend(labels.cpu().numpy())
                    y_pred.extend(outputs.cpu().numpy())
            
            # Calculate metrics
            metrics = {
                'train': {
                    'mse': mean_squared_error(y_train, [0] * len(y_train)),  # Placeholder
                    'r2': 0.0,  # Placeholder
                    'losses': train_losses
                },
                'test': {
                    'mse': mean_squared_error(y_true, y_pred),
                    'r2': r2_score(y_true, y_pred),
                    'mae': mean_absolute_error(y_true, y_pred),
                    'losses': val_losses
                },
                'y_true': y_true,
                'y_pred': y_pred
            }
            
            # Plot training history
            self._plot_training_history(train_losses, val_losses)
            
        else:
            # For Random Forest
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42
            )
            
            # Train the model
            print("Training Random Forest model...")
            self.rf_model.fit(X_train, y_train)
            
            # Make predictions
            y_pred_train = self.rf_model.predict(X_train)
            y_pred_test = self.rf_model.predict(X_test)
            
            # Calculate metrics
            metrics = {
                'train': {
                    'mse': mean_squared_error(y_train, y_pred_train),
                    'r2': r2_score(y_train, y_pred_train),
                    'mae': mean_absolute_error(y_train, y_pred_train)
                },
                'test': {
                    'mse': mean_squared_error(y_test, y_pred_test),
                    'r2': r2_score(y_test, y_pred_test),
                    'mae': mean_absolute_error(y_test, y_pred_test)
                },
                'feature_importances': dict(zip(
                    ['bbox_area', 'canopy_area', 'avg_red', 'avg_green', 'avg_blue', 'aspect_ratio', 'equivalent_radius'],
                    self.rf_model.feature_importances_
                )),
                'y_true': y_test,
                'y_pred': y_pred_test
            }
            
            # Plot feature importances
            self._plot_feature_importances(metrics['feature_importances'])
        
        # Plot predictions vs actual
        self._plot_predictions(metrics['y_true'], metrics['y_pred'], use_cnn)
        
        return metrics
    
    def _plot_training_history(self, train_losses, val_losses):
        """Plot training and validation loss history."""
        plt.figure(figsize=(10, 6))
        plt.plot(train_losses, label='Training Loss')
        plt.plot(val_losses, label='Validation Loss')
        plt.title('Training and Validation Loss')
        plt.xlabel('Epoch')
        plt.ylabel('Loss (MSE)')
        plt.legend()
        plt.grid(True)
        plt.savefig('output/training_history.png')
        plt.close()
    
    def _plot_feature_importances(self, feature_importances, top_n=20):
        """
        Plot feature importances for Random Forest.
        
        Args:
            feature_importances: Dictionary of feature importances
            top_n: Number of top features to display
        """
        importances = list(feature_importances.values())
        indices = np.argsort(importances)[::-1]
        
        # Limit to top_n features
        indices = indices[:min(top_n, len(importances))]
        
        # Get feature names if available
        feature_names = list(feature_importances.keys())
        
        plt.figure(figsize=(12, 8))
        plt.title("Top {} Feature Importances".format(len(indices)))
        
        # Create horizontal bar plot
        bars = plt.barh(range(len(indices)), importances[indices][::-1], align='center')
        plt.yticks(range(len(indices)), feature_names[::-1])
        
        # Add value labels on the bars
        for bar in bars:
            width = bar.get_width()
            plt.text(width + 0.01, bar.get_y() + bar.get_height()/2.,
                   f'{width:.4f}',
                   va='center', ha='left')
        
        plt.xlabel('Relative Importance')
        plt.tight_layout()
        
        # Save the plot
        os.makedirs('output', exist_ok=True)
        plt.savefig('output/feature_importances.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        # Save feature importances to file
        feature_importance = dict(zip(feature_names, importances))
        with open('output/feature_importances.yaml', 'w') as f:
            yaml.dump(feature_importance, f, default_flow_style=False)
    
    def _plot_predictions(self, y_true, y_pred, is_cnn=False):
        """
        Plot predicted vs actual values with additional visualizations.
        
        Args:
            y_true: Array of true target values
            y_pred: Array of predicted values
            is_cnn: Whether the model is a CNN (for title/labeling)
        """
        model_type = 'CNN' if is_cnn else 'Random Forest'
        
        # Create figure with subplots
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 8))
        
        # Scatter plot with regression line
        sns.regplot(x=y_true, y=y_pred, ax=ax1, scatter_kws={'alpha':0.5}, line_kws={'color':'red'})
        ax1.plot([y_true.min(), y_true.max()], [y_true.min(), y_true.max()], 'r--')
        ax1.set_xlabel('Actual Biomass')
        ax1.set_ylabel('Predicted Biomass')
        ax1.set_title(f'Predicted vs Actual Biomass ({model_type})')
        
        # Add metrics to the plot
        r2 = r2_score(y_true, y_pred)
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        mape = np.mean(np.abs((y_true - y_pred) / (y_true + 1e-8))) * 100
        
        metrics_text = (
            f'R² = {r2:.3f}\n'
            f'MAE = {mae:.3f}\n'
            f'RMSE = {rmse:.3f}\n'
            f'MAPE = {mape:.2f}%'
        )
        
        ax1.text(0.02, 0.98, metrics_text, 
                transform=ax1.transAxes,
                verticalalignment='top',
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
        
        # Residual plot
        residuals = y_true - y_pred
        sns.residplot(x=y_pred, y=residuals, lowess=True, ax=ax2, 
                     line_kws={'color': 'red', 'lw': 1})
        ax2.axhline(y=0, color='r', linestyle='--')
        ax2.set_xlabel('Predicted Values')
        ax2.set_ylabel('Residuals')
        ax2.set_title(f'Residual Plot ({model_type})')
        
        plt.tight_layout()
        
        # Save the plot
        os.makedirs('output', exist_ok=True)
        plt.savefig(f'output/{model_type.lower().replace(" ", "_")}_evaluation.png', 
                   dpi=300, bbox_inches='tight')
        plt.close()
        
        # Print feature importance if using Random Forest
        if not is_cnn and hasattr(self, 'rf_model'):
            self._plot_feature_importances(dict(zip(
                ['bbox_area', 'canopy_area', 'avg_red', 'avg_green', 'avg_blue', 'aspect_ratio', 'equivalent_radius'],
                self.rf_model.feature_importances_
            )))
    
    def save_model(self, output_dir, is_cnn=False):
        """
        Save the trained model and metadata.
        
        Args:
            output_dir: Directory to save the model
            is_cnn: Whether the model is a CNN or Random Forest
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if is_cnn:
            # Save CNN model
            model_path = output_dir / f'cnn_model_{timestamp}.pth'
            torch.save({
                'model_state_dict': self.cnn_model.state_dict(),
                'optimizer_state_dict': self.optimizer.state_dict(),
            }, model_path)
            print(f"CNN model saved to {model_path}")
        else:
            # Save Random Forest model
            model_path = output_dir / f'random_forest_model_{timestamp}.joblib'
            joblib.dump(self.rf_model, model_path)
            
            # Save feature importances
            feature_importances = dict(zip(
                ['bbox_area', 'canopy_area', 'avg_red', 'avg_green', 'avg_blue', 'aspect_ratio', 'equivalent_radius'],
                self.rf_model.feature_importances_
            ))
            
            with open(output_dir / 'feature_importances.yaml', 'w') as f:
                yaml.dump(feature_importances, f)
            
            print(f"Random Forest model saved to {model_path}")
    
    def predict_image(self, image_path, is_cnn=False):
        """
        Predict biomass for a single image.
        
        Args:
            image_path: Path to the input image
            is_cnn: Whether to use CNN or Random Forest for prediction
            
        Returns:
            float: Predicted biomass value
        """
        if is_cnn:
            # Load and preprocess the image
            transform = transforms.Compose([
                transforms.ToPILImage(),
                transforms.Resize((640, 640)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            image = cv2.imread(str(image_path))
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            image = transform(image).unsqueeze(0).to(self.device)
            
            # Make prediction
            self.cnn_model.eval()
            with torch.no_grad():
                prediction = self.cnn_model(image).item()
                
            return prediction
        else:
            # Extract features using YOLO
            features_list = self.extract_features_for_image(image_path)
            if not features_list:
                return 0.0  # No trees detected
                
            # Use average features for prediction
            avg_features = np.mean(features_list, axis=0).reshape(1, -1)
            prediction = self.rf_model.predict(avg_features)[0]
            
            return prediction

def main():
    # Configuration
    DATA_PATH = Path(r"C:\\ml_models\\biomass-estimation\\data")
    YOLO_MODEL_PATH = r"C:\\ml_models\\object-detection\\BlueCred\\runs\\train\\mangrove_optimized_v2\\weights\\best.pt"  # YOLO model path
    OUTPUT_DIR = Path("output")
    
    # Model settings
    USE_CNN = True  # Set to False to use Random Forest instead
    CROSS_VALIDATE = True  # Set to True to perform cross-validation
    MIXED_PRECISION = True  # Use mixed precision training (recommended for RTX 4090)
    
    # Print CUDA information
    print("CUDA available:", torch.cuda.is_available())
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"CUDA version: {torch.version.cuda}")
        print(f"cuDNN version: {torch.backends.cudnn.version()}")
        print(f"PyTorch version: {torch.__version__}")
    
    # Create output directory
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    # Initialize the biomass estimator
    estimator = BiomassEstimator(
        data_path=DATA_PATH,
        yolo_model_path=YOLO_MODEL_PATH,
        use_cnn=USE_CNN
    )
    
    # Load metadata
    print("Loading metadata...")
    metadata = estimator.load_metadata()
    if metadata is None:
        print("Failed to load metadata. Exiting.")
        return
    
    if USE_CNN:
        # For CNN, we need to process the images directly
        print("\nPreparing image dataset for CNN...")
        image_paths = []
        agb_values = []
        
        # Group by site and collect all images with their AGB values
        for site_name, group in metadata.groupby('site'):
            site_dir = DATA_PATH / 'tiles' / site_name
            if not site_dir.exists():
                continue
                
            # Get all images for this site
            site_images = list(site_dir.glob('*.png'))
            if not site_images:
                continue
            
            # Use the average AGB for this site
            site_avg_agb = group['AGB'].mean()
            
            # Add all images from this site with the site's average AGB
            for img_path in site_images:
                image_paths.append(img_path)
                agb_values.append(site_avg_agb)
        
        X = image_paths
        y = np.array(agb_values)
        
    else:
        # For Random Forest, extract features first
        print("\nExtracting features...")
        X, y = estimator.process_dataset(metadata)
    
    if len(X) == 0 or len(y) == 0:
        print("No valid data found. Exiting.")
        return
    
    print(f"\nProcessing {len(X)} samples")
    
    # Perform cross-validation if requested
    if CROSS_VALIDATE:
        print(f"\nPerforming cross-validation with {'CNN' if USE_CNN else 'Random Forest'}...")
        cv_results = estimator.cross_validate(
            X, y, 
            cv=5, 
            model_type='cnn' if USE_CNN else 'rf'
        )
    
    # Train the final model on the full dataset
    print("\nTraining final model...")
    metrics = estimator.train(X, y, use_cnn=USE_CNN, mixed_precision=MIXED_PRECISION)
    
    # Print results
    print("\nTraining Results:")
    if USE_CNN:
        print(f"  Test MSE: {metrics['test']['mse']:.4f}")
        print(f"  Test R²: {metrics['test']['r2']:.4f}")
        print(f"  Test MAE: {metrics['test']['mae']:.4f}")
    else:
        print(f"  Training MSE: {metrics['train']['mse']:.4f}")
        print(f"  Training R²: {metrics['train']['r2']:.4f}")
        print(f"  Test MSE: {metrics['test']['mse']:.4f}")
        print(f"  Test R²: {metrics['test']['r2']:.4f}")
        
        print("\nFeature Importances:")
        for feature, importance in metrics['feature_importances'].items():
            print(f"  {feature}: {importance:.4f}")
    
    # Save the model
    print("\nSaving model...")
    estimator.save_model(OUTPUT_DIR, is_cnn=USE_CNN)
    
    # Example prediction on a single image
    if len(X) > 0:
        example_image = X[0] if isinstance(X[0], (str, Path)) else None
        if example_image and Path(example_image).exists():
            print(f"\nMaking prediction on example image: {example_image}")
            prediction = estimator.predict_image(example_image, is_cnn=USE_CNN)
            actual = y[0] if not isinstance(y[0], (list, np.ndarray)) else y[0][0]
            print(f"  Predicted AGB: {prediction:.4f}")
            print(f"  Actual AGB: {actual:.4f}" if not USE_CNN else "")
    
    print("\nDone! Check the 'output' directory for results and visualizations.")

if __name__ == "__main__":
    main()
