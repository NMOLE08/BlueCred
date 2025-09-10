import os
import torch
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
import yaml
import cv2
from tqdm import tqdm
import torch.nn.functional as F
from torch.utils.data import DataLoader

from src.data.dataset import BlueCarbonDataset, get_transforms
from src.models.model import create_model

def load_model(checkpoint_path, config):
    """Load model from checkpoint."""
    # Initialize model
    model = create_model(config)
    
    # Load checkpoint
    checkpoint = torch.load(checkpoint_path, map_location='cpu')
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    return model

def visualize_prediction(image, mask, pred_mask, save_path=None):
    """Display/save image, ground truth mask, and prediction."""
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    
    # Convert tensors to numpy arrays if needed
    if torch.is_tensor(image):
        image = image.permute(1, 2, 0).cpu().numpy()
    if torch.is_tensor(mask):
        mask = mask.squeeze().cpu().numpy()
    if torch.is_tensor(pred_mask):
        pred_mask = pred_mask.squeeze().cpu().numpy()
    
    # Plot
    axes[0].imshow(image)
    axes[0].set_title('Input Image')
    axes[0].axis('off')
    
    axes[1].imshow(mask, cmap='gray')
    axes[1].set_title('Ground Truth')
    axes[1].axis('off')
    
    axes[2].imshow(pred_mask > 0.5, cmap='gray')  # Threshold at 0.5
    axes[2].set_title('Prediction')
    axes[2].axis('off')
    
    plt.tight_layout()
    
    if save_path:
        save_path.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(save_path, bbox_inches='tight', dpi=150)
        plt.close()
    else:
        plt.show()

def main():
    # Configuration
    config_path = "config/config.yaml"
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Find the latest checkpoint
    exp_dir = Path("models") / f"blue_carbon_segmentation_20250910_053028"
    checkpoint_path = exp_dir / "checkpoints" / "best.pth"
    
    if not checkpoint_path.exists():
        checkpoint_path = exp_dir / "checkpoints" / "latest.pth"
        if not checkpoint_path.exists():
            print(f"No checkpoint found in {exp_dir}")
            return
    
    # Load model
    print(f"Loading model from {checkpoint_path}")
    model = load_model(checkpoint_path, config)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    
    # Prepare data
    val_transform = get_transforms(config['data']['image_size'], is_train=False)
    val_dataset = BlueCarbonDataset(
        root_dir=config['data']['root_dir'],
        split='val',
        transform=val_transform
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=2,
        shuffle=False,
        num_workers=2
    )
    
    # Create output directory
    output_dir = exp_dir / "predictions"
    output_dir.mkdir(exist_ok=True)
    
    # Evaluate on a few samples
    num_samples = min(5, len(val_loader))
    print(f"Generating predictions for {num_samples} samples...")
    
    with torch.no_grad():
        for i, batch in enumerate(val_loader):
            if i >= num_samples:
                break
                
            images = batch['image'].to(device)
            masks = batch['mask'].to(device)
            paths = batch['image_path']
            
            # Get predictions
            outputs = model(images)
            preds = torch.sigmoid(outputs)
            
            # Save visualizations
            for j in range(images.size(0)):
                img_idx = i * images.size(0) + j
                save_path = output_dir / f"pred_{img_idx:03d}.png"
                visualize_prediction(
                    images[j],
                    masks[j],
                    preds[j],
                    save_path=save_path
                )
    
    print(f"\nPredictions saved to: {output_dir}")

if __name__ == "__main__":
    main()
