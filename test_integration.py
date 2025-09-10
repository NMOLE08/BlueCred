import os
import sys
import torch
import numpy as np
from pathlib import Path
import shutil
import tempfile
import cv2
import io
import sys

# Fix Windows console encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add src to path
sys.path.append(str(Path(__file__).parent))

def create_test_data(output_dir, num_samples=5, img_size=(512, 512)):
    """Create test images and masks for integration testing."""
    # Create directories
    img_dir = output_dir / 'raw' / 'images'
    mask_dir = output_dir / 'raw' / 'masks'
    img_dir.mkdir(parents=True, exist_ok=True)
    mask_dir.mkdir(parents=True, exist_ok=True)
    
    # Create test images and masks
    for i in range(num_samples):
        # Create a simple gradient image
        img = np.zeros((*img_size, 3), dtype=np.uint8)
        cv2.rectangle(img, (100, 100), (400, 400), (0, 128, 0), -1)  # Green rectangle
        
        # Create corresponding mask (1 for green areas, 0 otherwise)
        mask = np.zeros(img_size, dtype=np.uint8)
        mask[100:400, 100:400] = 1
        
        # Save files
        img_path = img_dir / f'test_{i}.png'
        mask_path = mask_dir / f'test_{i}_mask.png'
        
        cv2.imwrite(str(img_path), img)
        cv2.imwrite(str(mask_path), mask * 255)  # Scale to 0-255 for saving
    
    print(f"Created {num_samples} test images and masks in {output_dir}")

def test_data_loading():
    """Test if data loading works correctly."""
    from src.data.dataset import BlueCarbonDataset, get_transforms
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir = Path(temp_dir)
        create_test_data(temp_dir)
        
        # Test dataset
        transform = get_transforms(512, is_train=True)
        dataset = BlueCarbonDataset(
            root_dir=temp_dir,
            split='train',
            transform=transform,
            image_size=512
        )
        
        # Test __getitem__
        sample = dataset[0]
        assert 'image' in sample
        assert 'mask' in sample
        assert sample['image'].shape == (3, 512, 512)  # CHW format
        assert sample['mask'].shape == (1, 512, 512)   # 1xHxW for mask
        
        print("[PASS] Data loading test passed!")

def test_model_creation():
    """Test if model can be created and forward pass works."""
    from src.models.model import create_model
    
    # Create a minimal config
    config = {
        'model': {
            'name': 'unet',
            'encoder_name': 'resnet18',  # Use smaller model for testing
            'encoder_weights': None,     # No pretrained weights for faster testing
            'in_channels': 3,
            'classes': 1
        }
    }
    
    # Create model
    model = create_model(config)
    
    # Test forward pass
    x = torch.randn(1, 3, 512, 512)
    out = model(x)
    assert out.shape == (1, 1, 512, 512)
    
    print("[PASS] Model creation test passed!")

def test_training_components():
    """Test if training components work together."""
    import yaml
    from src.train import Trainer
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create test data
        temp_dir = Path(temp_dir)
        data_dir = temp_dir / 'data'
        create_test_data(data_dir, num_samples=10)
        
        # Create a minimal config
        config = {
            'data': {
                'root_dir': str(data_dir),
                'image_size': 256,  # Smaller size for faster testing
                'batch_size': 2,
                'num_workers': 0
            },
            'model': {
                'name': 'unet',
                'encoder_name': 'resnet18',
                'encoder_weights': None,
                'in_channels': 3,
                'classes': 1
            },
            'optimizer': {
                'lr': 1e-3,
                'weight_decay': 1e-4
            },
            'scheduler': {
                'factor': 0.1,
                'patience': 3,
                'min_lr': 1e-6
            },
            'training': {
                'max_epochs': 2,  # Just test for 2 epochs
                'experiment_name': 'test_run',
                'save_dir': str(temp_dir / 'models')
            }
        }
        
        # Save config
        config_path = temp_dir / 'test_config.yaml'
        with open(config_path, 'w') as f:
            yaml.dump(config, f)
        
        # Initialize trainer
        trainer = Trainer(str(config_path))
        
        # Test one training epoch
        train_metrics = trainer.train_epoch(0)
        assert 'train_loss' in train_metrics
        
        # Test validation
        val_metrics = trainer.validate()
        assert 'val_loss' in val_metrics
        assert 'val_iou' in val_metrics
        
        print("[PASS] Training components test passed!")

if __name__ == "__main__":
    print("Running integration tests...\n")
    
    # Run tests
    test_data_loading()
    test_model_creation()
    test_training_components()
    
    print("\n[PASS] All tests passed!")
