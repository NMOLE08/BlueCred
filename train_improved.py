import os
import torch
import yaml
from ultralytics import YOLO
import numpy as np

def calculate_class_weights(labels_dir):
    """Calculate class weights based on label distribution"""
    class_counts = [0] * 8  # We have 8 classes
    total = 0
    
    # Count instances of each class
    for label_file in os.listdir(labels_dir):
        if label_file.endswith('.txt'):
            with open(os.path.join(labels_dir, label_file)) as f:
                for line in f:
                    class_id = int(line.split()[0])
                    if class_id < len(class_counts):
                        class_counts[class_id] += 1
                        total += 1
    
    # Calculate weights (inverse frequency)
    weights = [total / (len(class_counts) * count) if count > 0 else 0 for count in class_counts]
    return weights

def main():
    print("\n=== Enhanced Training with Class Balancing and Augmentation ===")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory/1024**3:.1f}GB")
    
    # Calculate class weights
    train_labels_dir = 'mangrove.v1i.yolov8/train/labels'
    class_weights = calculate_class_weights(train_labels_dir)
    print("\nClass Weights:", [f"{w:.2f}" for w in class_weights])
    
    # Training configuration
    config = {
        # Model configuration
        'model': 'yolov8m.pt',  # Using medium model for better performance
        'pretrained': True,
        
        # Data configuration
        'data': 'mangrove_data.yaml',
        
        # Training parameters
        'epochs': 150,  # Increased epochs
        'batch': 32,    # Reduced batch size for stability
        'imgsz': 640,
        'device': 0 if torch.cuda.is_available() else 'cpu',
        'workers': 8,
        'cache': 'ram',
        'close_mosaic': 10,
        'patience': 30,  # Early stopping patience
        
        # Class weighting
        'cls': 0.5,  # Class loss gain
        
        # Optimizer settings
        'optimizer': 'AdamW',
        'lr0': 0.001,  # Lower initial learning rate
        'lrf': 0.01,  # Final learning rate (lr0 * lrf)
        'momentum': 0.9,
        'weight_decay': 0.0005,
        'warmup_epochs': 3.0,
        'warmup_momentum': 0.8,
        'warmup_bias_lr': 0.1,
        
        # Performance optimizations
        'amp': True,  # Mixed precision training
        'cos_lr': True,  # Cosine learning rate scheduler
        'label_smoothing': 0.1,
        'deterministic': False,
        'overlap_mask': False,
        'single_cls': False,
        'rect': False,
        
        # Enhanced data augmentation
        'hsv_h': 0.015,
        'hsv_s': 0.8,  # Increased saturation augmentation
        'hsv_v': 0.5,  # Increased value augmentation
        'degrees': 15.0,  # Increased rotation
        'translate': 0.15,  # Increased translation
        'scale': 0.5,
        'shear': 2.0,  # Increased shear
        'perspective': 0.001,  # Added perspective
        'flipud': 0.1,  # Added flip up-down
        'fliplr': 0.5,  # Flip left-right
        'mosaic': 1.0,  # Mosaic augmentation
        'mixup': 0.2,   # Increased mixup
        'copy_paste': 0.1,  # Added copy-paste
        
        # Validation and logging
        'val': True,
        'plots': True,
        'save': True,
        'save_period': 10,
        'exist_ok': True,
        'project': 'runs/train',
        'name': 'mangrove_improved',
    }
    
    # Initialize model
    print("\nInitializing YOLOv8m model...")
    model = YOLO(config['model'])
    
    # Start training
    print("\n🚀 Starting enhanced training with class balancing and augmentation...")
    print(f"⚡ Using mixed precision training on {config['device']}")
    print(f"📊 Batch size: {config['batch']}, Epochs: {config['epochs']}")
    print(f"🎯 Class weights: {[f'{w:.2f}' for w in class_weights]}")
    
    try:
        results = model.train(**config)
        print("\n✅ Training completed successfully!")
    except Exception as e:
        print(f"\n❌ Error during training: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
