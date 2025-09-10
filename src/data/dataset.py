import os
import cv2
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
import albumentations as A
from albumentations.pytorch import ToTensorV2
from pathlib import Path
from typing import Tuple, Dict, List, Optional, Any
import yaml

class BlueCarbonDataset(Dataset):
    """
    Dataset class for Blue Carbon segmentation.
    Assumes the following directory structure:
    data/
    ├── raw/
    │   ├── images/
    │   └── masks/
    """
    
    def __init__(self, 
                 root_dir: str,
                 split: str = 'train',
                 transform: Optional[A.Compose] = None,
                 image_size: int = 512,
                 cache: bool = True):  # Add caching option
        """
        Initialize the dataset.
        
        Args:
            root_dir: Root directory containing 'raw/images' and 'raw/masks' subdirectories
            split: 'train' or 'val' split
            transform: Albumentations transformations
            image_size: Size to resize images to (square)
        """
        self.root_dir = Path(root_dir)
        self.split = split
        self.image_size = image_size
        self.transform = transform
        
        # Set up paths
        self.image_dir = self.root_dir / 'raw' / 'images'
        self.mask_dir = self.root_dir / 'raw' / 'masks'
        
        # Get list of images and masks (only once)
        if not hasattr(self.__class__, '_all_image_files'):
            self.__class__._all_image_files = sorted(
                list(self.image_dir.glob('*.png')) + 
                list(self.image_dir.glob('*.jpg')) +
                list(self.image_dir.glob('*.tif'))
            )
        self.image_files = self.__class__._all_image_files
        
        # Split into train/val and take a smaller subset for testing
        split_idx = int(0.8 * len(self.image_files))
        if self.split == 'train':
            self.image_files = self.image_files[:split_idx][:100]  # Take first 100 training samples
        else:
            self.image_files = self.image_files[split_idx:][:50]   # Take first 50 validation samples
        
        print(f'Found {len(self.image_files)} {self.split} images')
    
    def __len__(self) -> int:
        return len(self.image_files)
    
    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        try:
            # Load image and mask
            img_path = self.image_files[idx]
            # Construct mask path by inserting '_mask' before the file extension
            mask_path = self.mask_dir / f"{img_path.stem}_mask{img_path.suffix}"
            
            # Debug print
            if idx == 0:  # Only print for first item to avoid flooding the output
                print(f"Loading image: {img_path}")
                print(f"Looking for mask at: {mask_path}")
            
            # Read image
            if not img_path.exists():
                raise FileNotFoundError(f"Image file not found: {img_path}")
                
            image = cv2.imread(str(img_path))
            if image is None:
                raise ValueError(f"Failed to load image: {img_path}")
                
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Read mask
            if not mask_path.exists():
                print(f"Warning: Mask not found at {mask_path}, using zeros")
                mask = np.zeros((image.shape[0], image.shape[1]), dtype=np.uint8)
            else:
                mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
                if mask is None:
                    print(f"Warning: Failed to load mask at {mask_path}, using zeros")
                    mask = np.zeros((image.shape[0], image.shape[1]), dtype=np.uint8)
                else:
                    # Ensure mask is binary (0 or 1)
                    mask = (mask > 0).astype(np.uint8)
            
            # Verify dimensions
            if mask.shape[0] != image.shape[0] or mask.shape[1] != image.shape[1]:
                print(f"Warning: Image and mask dimensions don't match for {img_path}. Resizing mask.")
                mask = cv2.resize(mask, (image.shape[1], image.shape[0]), interpolation=cv2.INTER_NEAREST)
                
        except Exception as e:
            print(f"Error loading data at index {idx}: {str(e)}")
            # Return a random sample if there's an error
            if idx > 0:  # Try to return previous sample if possible
                return self[idx-1]
            # If first sample fails, create dummy data
            dummy_size = (256, 256)
            image = np.zeros((*dummy_size, 3), dtype=np.uint8)
            mask = np.zeros(dummy_size, dtype=np.uint8)
        
        # Apply transformations
        if self.transform is not None:
            transformed = self.transform(image=image, mask=mask)
            image = transformed['image']
            mask = transformed['mask']
        else:
            # If no transform was applied, manually convert to tensors
            if not isinstance(image, torch.Tensor):
                image = torch.from_numpy(image).float().permute(2, 0, 1)  # Convert HWC to CHW
            if not isinstance(mask, torch.Tensor):
                mask = torch.from_numpy(mask).float().unsqueeze(0)  # Add channel dimension
        
        # Ensure mask has the right shape (C, H, W) and type
        if mask.dim() == 2:
            mask = mask.unsqueeze(0)
        
        # Ensure mask is float32 for loss calculation
        if isinstance(mask, torch.Tensor):
            mask = mask.float()
        
        return {
            'image': image,
            'mask': mask,
            'image_path': str(img_path)
        }

def get_transforms(image_size: int = 512, is_train: bool = True) -> A.Compose:
    """
    Get data augmentation transforms.
    
    Args:
        image_size: Size to resize images to
        is_train: Whether to include training augmentations
        
    Returns:
        Albumentations Compose object
    """
    if is_train:
        return A.Compose([
            A.Resize(image_size, image_size),
            A.HorizontalFlip(p=0.5),
            A.VerticalFlip(p=0.5),
            A.RandomRotate90(p=0.5),
            A.OneOf([
                A.ElasticTransform(alpha=120, sigma=120 * 0.05, p=0.5),
                A.GridDistortion(p=0.5),
                A.OpticalDistortion(distort_limit=1, p=1),
            ], p=0.8),
            A.CLAHE(p=0.8),
            A.RandomBrightnessContrast(p=0.2),
            A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
            ToTensorV2(),
        ])
    else:
        return A.Compose([
            A.Resize(image_size, image_size),
            A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
            ToTensorV2(),
        ])

def get_dataloaders(config: Dict) -> Tuple[DataLoader, DataLoader]:
    """
    Create train and validation dataloaders.
    
    Args:
        config: Configuration dictionary
        
    Returns:
        Tuple of (train_loader, val_loader)
    """
    # Get transforms
    train_transform = get_transforms(config['data']['image_size'], is_train=True)
    val_transform = get_transforms(config['data']['image_size'], is_train=False)
    
    # Create datasets
    train_dataset = BlueCarbonDataset(
        root_dir=config['data']['root_dir'],
        split='train',
        transform=train_transform,
        image_size=config['data']['image_size']
    )
    
    val_dataset = BlueCarbonDataset(
        root_dir=config['data']['root_dir'],
        split='val',
        transform=val_transform,
        image_size=config['data']['image_size']
    )
    
    # Create dataloaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=config['data']['batch_size'],
        num_workers=config['data']['num_workers'],
        shuffle=True,
        pin_memory=True
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=config['data']['batch_size'],
        num_workers=config['data']['num_workers'],
        shuffle=False,
        pin_memory=True
    )
    
    return train_loader, val_loader
