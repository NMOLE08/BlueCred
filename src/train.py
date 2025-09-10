import os
import torch
import torch.optim as optim
import torch.nn as nn
from torch.utils.data import DataLoader
from src.data.dataset import get_dataloaders
from src.models.model import BlueCarbonModel
import numpy as np
import yaml
from pathlib import Path
from datetime import datetime
import shutil
import logging
from tqdm import tqdm
from typing import Dict, Any

# Add these lines after imports
import torch.multiprocessing as mp
mp.set_sharing_strategy('file_system')

# Add these imports at the top of train.py
import time
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Trainer:
    """Training class for Blue Carbon segmentation model."""
    
    def __init__(self, config_path: str):
        """
        Initialize the trainer.
        
        Args:
            config_path: Path to config YAML file
        """
        # Load config
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Set device
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        
        # Create output directories
        self.experiment_dir = self._create_experiment_dir()
        
        # Save config
        self._save_config()
        
        # Initialize model, dataloaders, optimizer, etc.
        self._init_components()
    
    def _create_experiment_dir(self) -> Path:
        """Create experiment directory with timestamp."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        experiment_name = f"{self.config['training']['experiment_name']}_{timestamp}"
        experiment_dir = Path(self.config['training']['save_dir']) / experiment_name
        
        # Create directories
        experiment_dir.mkdir(parents=True, exist_ok=True)
        (experiment_dir / 'checkpoints').mkdir(exist_ok=True)
        
        logger.info(f"Experiment directory: {experiment_dir}")
        return experiment_dir
    
    def _save_config(self):
        """Save config to experiment directory."""
        config_path = self.experiment_dir / 'config.yaml'
        with open(config_path, 'w') as f:
            yaml.dump(self.config, f, default_flow_style=False)
    
    def _init_components(self):
        """Initialize model, dataloaders, optimizer, etc."""
        # Create model
        self.model = BlueCarbonModel(self.config).to(self.device)
        
        # Create dataloaders
        self.train_loader, self.val_loader = get_dataloaders(self.config)
        
        # Optimizer
        self.optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=self.config['optimizer']['lr'],
            weight_decay=self.config['optimizer']['weight_decay']
        )
        
        # Learning rate scheduler
        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer,
            mode='max',
            factor=self.config['scheduler']['factor'],
            patience=self.config['scheduler']['patience'],
            min_lr=self.config['scheduler']['min_lr']
        )
        
        # Loss function
        self.criterion = nn.BCEWithLogitsLoss()
    
    def _verify_data(self):
        """Verify that all data can be loaded without errors."""
        print("Verifying data...")
        for i in range(len(self.train_loader.dataset)):
            try:
                sample = self.train_loader.dataset[i]
                if i % 10 == 0:
                    print(f"Verified {i}/{len(self.train_loader.dataset)} samples")
            except Exception as e:
                print(f"Error in sample {i}: {str(e)}")
                raise
        print("Data verification complete!")
    
    def train_epoch(self, epoch: int) -> Dict[str, float]:
        """Train for one epoch."""
        self.model.train()
        total_loss = 0.0
        start_time = time.time()
        batch_times = []
        
        for batch_idx, batch in enumerate(tqdm(self.train_loader, desc=f"Epoch {epoch}")):
            batch_start = time.time()
            
            # Move data to device
            images = batch['image'].to(self.device)
            masks = batch['mask'].to(self.device)
            
            # Zero the parameter gradients
            self.optimizer.zero_grad()
            
            # Forward pass
            outputs = self.model(images)
            
            # Compute loss
            loss = self.criterion(outputs, masks)
            
            # Backward pass and optimize
            loss.backward()
            self.optimizer.step()
            
            # Update statistics
            total_loss += loss.item()
            
            # After processing batch
            batch_time = time.time() - batch_start
            batch_times.append(batch_time)
            
            # Print progress every 10 batches
            if batch_idx % 10 == 0:
                avg_batch_time = sum(batch_times[-10:]) / len(batch_times[-10:]) if batch_times else 0
                remaining_batches = len(self.train_loader) - batch_idx
                eta = avg_batch_time * remaining_batches
                print(f"\nBatch {batch_idx}/{len(self.train_loader)} - "
                      f"Loss: {loss.item():.4f} - "
                      f"Avg batch time: {avg_batch_time:.2f}s - "
                      f"ETA: {str(datetime.timedelta(seconds=int(eta)))}")
        
        # Calculate average loss for the epoch
        avg_loss = total_loss / len(self.train_loader)
        return {'train_loss': avg_loss}
    
    def validate(self) -> Dict[str, float]:
        """Validate the model."""
        self.model.eval()
        total_loss = 0.0
        all_metrics = []
        
        with torch.no_grad():
            for batch in tqdm(self.val_loader, desc="Validating"):
                # Move data to device
                images = batch['image'].to(self.device)
                masks = batch['mask'].to(self.device)
                
                # Forward pass
                outputs = self.model(images)
                
                # Compute loss
                loss = self.criterion(outputs, masks)
                total_loss += loss.item()
                
                # Compute metrics
                metrics = self.model.get_metrics(
                    torch.sigmoid(outputs),
                    masks
                )
                all_metrics.append(metrics)
        
        # Average metrics
        avg_loss = total_loss / len(self.val_loader)
        avg_metrics = {
            'val_loss': avg_loss,
            'val_iou': np.mean([m['iou'] for m in all_metrics]),
            'val_f1': np.mean([m['f1'] for m in all_metrics]),
            'val_accuracy': np.mean([m['accuracy'] for m in all_metrics]),
            'val_precision': np.mean([m['precision'] for m in all_metrics]),
            'val_recall': np.mean([m['recall'] for m in all_metrics])
        }
        
        return avg_metrics
    
    def save_checkpoint(self, epoch: int, is_best: bool = False):
        """Save model checkpoint."""
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict(),
            'config': self.config
        }
        
        # Ensure checkpoints directory exists
        checkpoint_dir = self.experiment_dir / 'checkpoints'
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        
        # Save latest checkpoint
        checkpoint_path = checkpoint_dir / 'latest.pth'
        torch.save(checkpoint, str(checkpoint_path))  # Convert to string for Windows compatibility
        logger.info(f"Checkpoint saved to {checkpoint_path}")
        
        # Save best checkpoint
        if is_best:
            best_path = checkpoint_dir / 'best.pth'
            shutil.copyfile(str(checkpoint_path), str(best_path))  # Convert to string for Windows
            logger.info(f"New best model saved to {best_path}")
    
    def train(self):
        """Run the training loop."""
        logger.info("Starting training...")
        
        best_iou = 0.0
        
        for epoch in range(self.config['training']['max_epochs']):
            # Train for one epoch
            train_metrics = self.train_epoch(epoch)
            
            # Validate
            val_metrics = self.validate()
            
            # Update learning rate
            self.scheduler.step(val_metrics['val_iou'])
            
            # Log metrics
            log_str = f"Epoch {epoch + 1}/{self.config['training']['max_epochs']} - "
            log_str += ", ".join([f"{k}: {v:.4f}" for k, v in {**train_metrics, **val_metrics}.items()])
            logger.info(log_str)
            
            # Save checkpoint
            is_best = val_metrics['val_iou'] > best_iou
            if is_best:
                best_iou = val_metrics['val_iou']
                logger.info(f"New best model with IoU: {best_iou:.4f}")
            
            self.save_checkpoint(epoch, is_best)
            
            # Early stopping could be added here
        
        logger.info("Training complete!")


def main():
    """Main function."""
    import argparse
    
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Train Blue Carbon Segmentation Model')
    parser.add_argument('--config', type=str, 
                       default=str(Path(__file__).parent.parent / 'config' / 'config.yaml'),
                       help='Path to config file')
    args = parser.parse_args()
    
    # Initialize and run trainer with the specified config
    trainer = Trainer(args.config)
    trainer.train()


if __name__ == "__main__":
    main()
