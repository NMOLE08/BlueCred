import os
import torch
import numpy as np
from pathlib import Path
from torch.utils.data import DataLoader
from biomass_estimation import BiomassEstimator, TreeDataset, CNNRGB
import matplotlib.pyplot as plt
from tqdm import tqdm
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error

def load_dataset(data_path):
    """Load the dataset and return image paths and AGB values."""
    # This function should be similar to the data loading part in main()
    # but only for loading and preparing the test data
    data_path = Path(data_path)
    metadata_path = data_path / 'field_data.csv'
    
    if not metadata_path.exists():
        print(f"Error: Could not find metadata file at {metadata_path}")
        return None, None
    
    # Load metadata
    metadata = pd.read_csv(metadata_path)
    
    # Group by site and collect all images with their AGB values
    image_paths = []
    agb_values = []
    
    for site_name, group in metadata.groupby('site'):
        site_dir = data_path / 'tiles' / site_name
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
    
    return image_paths, np.array(agb_values)

def main():
    # Configuration - Update these paths as needed
    DATA_PATH = Path(r"C:\\ml_models\\biomass-estimation\\data")
    YOLO_MODEL_PATH = r"C:\\ml_models\\object-detection\\BlueCred\\runs\\train\\mangrove_optimized_v2\\weights\\best.pt"
    MODEL_PATH = r"C:\\ml_models\\biomass-estimation\\output\\best_cnn_model.pth"
    
    # Create output directory if it doesn't exist
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    
    # Initialize the biomass estimator
    print("Initializing biomass estimator...")
    estimator = BiomassEstimator(
        data_path=DATA_PATH,
        yolo_model_path=YOLO_MODEL_PATH,
        use_cnn=True
    )
    
    # Load the saved model
    print(f"Loading model from {MODEL_PATH}...")
    if not Path(MODEL_PATH).exists():
        print(f"Error: Model file not found at {MODEL_PATH}")
        return
    
    # Load model state dict
    checkpoint = torch.load(MODEL_PATH, map_location=estimator.device)
    estimator.cnn_model.load_state_dict(checkpoint['model_state_dict'])
    estimator.cnn_model.eval()
    print("Model loaded successfully.")
    
    # Load dataset
    print("Loading dataset...")
    image_paths, agb_values = load_dataset(DATA_PATH)
    
    if not image_paths or len(agb_values) == 0:
        print("Error: No data found for evaluation.")
        return
    
    print(f"Loaded {len(image_paths)} samples for evaluation.")
    
    # Create test dataset and dataloader
    test_dataset = TreeDataset(image_paths, agb_values)
    test_loader = DataLoader(
        test_dataset,
        batch_size=8,
        shuffle=False,
        num_workers=2,
        pin_memory=True
    )
    
    # Evaluate the model
    print("\nEvaluating model...")
    self = estimator  # For easier access to instance methods
    self.cnn_model.eval()
    
    all_outputs = []
    all_labels = []
    
    with torch.no_grad():
        for inputs, labels in tqdm(test_loader, desc="Evaluating"):
            inputs = inputs.to(self.device, non_blocking=True)
            labels = labels.to(self.device, non_blocking=True)
            
            # Forward pass
            outputs = self.cnn_model(inputs)
            
            # Ensure outputs and labels are 1D
            outputs = outputs.view(-1).cpu().numpy()
            labels = labels.view(-1).cpu().numpy()
            
            all_outputs.append(outputs)
            all_labels.append(labels)
    
    # Convert to numpy arrays and flatten
    y_true = np.concatenate([x.reshape(-1) for x in all_labels])
    y_pred = np.concatenate([x.reshape(-1) for x in all_outputs])
    
    # Calculate metrics
    mse = mean_squared_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    mape = np.mean(np.abs((y_true - y_pred) / (y_true + 1e-8))) * 100  # Add small epsilon to avoid division by zero
    
    # Print evaluation results
    print("\nEvaluation Results:")
    print(f"  MSE: {mse:.4f}")
    print(f"  R²: {r2:.4f}")
    print(f"  MAE: {mae:.4f}")
    print(f"  RMSE: {rmse:.4f}")
    print(f"  MAPE: {mape:.2f}%")
    
    # Plot predictions vs actual values
    plt.figure(figsize=(10, 6))
    plt.scatter(y_true, y_pred, alpha=0.5)
    min_val = min(min(y_true), min(y_pred))
    max_val = max(max(y_true), max(y_pred))
    plt.plot([min_val, max_val], [min_val, max_val], 'r--')
    plt.xlabel('Actual AGB')
    plt.ylabel('Predicted AGB')
    plt.title('Actual vs Predicted AGB')
    plt.grid(True)
    
    # Save the plot
    plot_path = output_dir / 'evaluation_plot.png'
    plt.savefig(plot_path)
    print(f"\nEvaluation plot saved to {plot_path}")
    
    # Save results to a text file
    results_path = output_dir / 'evaluation_results.txt'
    with open(results_path, 'w') as f:
        f.write("Evaluation Results\n")
        f.write("="*50 + "\n")
        f.write(f"MSE: {mse:.4f}\n")
        f.write(f"R²: {r2:.4f}\n")
        f.write(f"MAE: {mae:.4f}\n")
        f.write(f"RMSE: {rmse:.4f}\n")
        f.write(f"MAPE: {mape:.2f}%\n")
    
    print(f"Evaluation results saved to {results_path}")

if __name__ == "__main__":
    import pandas as pd  # Moved here to avoid circular import
    main()
