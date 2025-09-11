import os
import yaml
import torch
from ultralytics import YOLO
import numpy as np
from pathlib import Path

# Set random seed for reproducibility
torch.manual_seed(42)
np.random.seed(42)

# Configuration
class Config:
    # Model
    MODEL_SIZE = 'm'  # Options: n, s, m, l, x
    PRETRAINED = True
    
    # Dataset
    DATA_YAML = 'mangrove_data.yaml'
    IMG_SIZE = 640
    BATCH_SIZE = 16  # Reduced for stability
    
    # Training
    EPOCHS = 150
    PATIENCE = 30  # Early stopping patience
    DEVICE = '0' if torch.cuda.is_available() else 'cpu'
    WORKERS = min(os.cpu_count(), 8)
    
    # Optimization
    LR0 = 0.01  # Initial learning rate
    LRF = 0.1   # Final learning rate (lr0 * lrf)
    MOMENTUM = 0.937
    WEIGHT_DECAY = 0.0005
    WARMUP_EPOCHS = 3.0
    WARMUP_MOMENTUM = 0.8
    WARMUP_BIAS_LR = 0.1
    
    # Data Augmentation
    HUE = 0.02
    SATURATION = 0.8
    VALUE = 0.5
    DEGREES = 10.0
    TRANSLATE = 0.1
    SCALE = 0.5
    SHEAR = 2.0
    PERSPECTIVE = 0.0
    FLIPUD = 0.1
    FLIPLR = 0.5
    MOSAIC = 1.0
    MIXUP = 0.1
    COPY_PASTE = 0.1
    
    # Model Saving
    SAVE_PERIOD = 10
    PROJECT = 'runs/train'
    NAME = 'mangrove_optimized'

def analyze_class_distribution(data_yaml):
    """Analyze class distribution in the dataset."""
    with open(data_yaml) as f:
        data = yaml.safe_load(f)
    
    class_counts = {}
    for split in ['train', 'val', 'test']:
        if split not in data:
            continue
            
        label_dir = data[split].replace('images', 'labels')
        if not os.path.exists(label_dir):
            print(f"Warning: {label_dir} not found")
            continue
            
        class_counts[split] = {i: 0 for i in range(data['nc'])}
        
        for label_file in Path(label_dir).glob('*.txt'):
            with open(label_file) as f:
                for line in f:
                    cls_id = int(line.strip().split()[0])
                    if cls_id < data['nc']:  # Validate class ID
                        class_counts[split][cls_id] += 1
    
    # Print class distribution
    print("\n=== Class Distribution ===")
    for split, counts in class_counts.items():
        print(f"\n{split.upper()}:")
        for cls_id, count in counts.items():
            cls_name = data['names'][cls_id] if 'names' in data and cls_id < len(data['names']) else f'class_{cls_id}'
            print(f"  {cls_name}: {count} instances")
    
    return class_counts

def calculate_class_weights(class_counts):
    """Calculate class weights based on inverse frequency."""
    total_instances = sum(sum(split_counts.values()) for split_counts in class_counts.values())
    avg_instances = total_instances / len(class_counts.get('train', [])) if class_counts.get('train') else 1
    
    # Calculate weights (inverse frequency)
    weights = {}
    for cls_id, count in class_counts.get('train', {}).items():
        if count > 0:
            weights[cls_id] = avg_instances / count
        else:
            weights[cls_id] = 1.0  # Default weight for classes with no instances
    
    # Normalize weights
    min_weight = min(weights.values()) if weights else 1.0
    weights = {k: v / min_weight for k, v in weights.items()}
    
    print("\n=== Class Weights ===")
    for cls_id, weight in weights.items():
        cls_name = f'class_{cls_id}'
        print(f"  {cls_name}: {weight:.2f}")
    
    return weights

def train():
    print("=== Starting Training ===")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # Analyze dataset
    class_counts = analyze_class_distribution(Config.DATA_YAML)
    class_weights = calculate_class_weights(class_counts)
    
    # Load model
    model = YOLO(f'yolov8{Config.MODEL_SIZE}.pt' if Config.PRETRAINED else 'yolov8n.yaml')
    
    # Training arguments
    train_args = {
        'data': Config.DATA_YAML,
        'epochs': Config.EPOCHS,
        'batch': Config.BATCH_SIZE,
        'imgsz': Config.IMG_SIZE,
        'device': Config.DEVICE,
        'workers': Config.WORKERS,
        'patience': Config.PATIENCE,
        'save_period': Config.SAVE_PERIOD,
        'project': Config.PROJECT,
        'name': Config.NAME,
        'exist_ok': True,
        'optimizer': 'AdamW',
        'lr0': Config.LR0,
        'lrf': Config.LRF,
        'momentum': Config.MOMENTUM,
        'weight_decay': Config.WEIGHT_DECAY,
        'warmup_epochs': Config.WARMUP_EPOCHS,
        'warmup_momentum': Config.WARMUP_MOMENTUM,
        'warmup_bias_lr': Config.WARMUP_BIAS_LR,
        'box': 7.5,  # Box loss gain
        'cls': 0.5,  # Class loss gain
        'dfl': 1.5,  # Distribution Focal Loss gain
        'hsv_h': Config.HUE,
        'hsv_s': Config.SATURATION,
        'hsv_v': Config.VALUE,
        'degrees': Config.DEGREES,
        'translate': Config.TRANSLATE,
        'scale': Config.SCALE,
        'shear': Config.SHEAR,
        'perspective': Config.PERSPECTIVE,
        'flipud': Config.FLIPUD,
        'fliplr': Config.FLIPLR,
        'mosaic': Config.MOSAIC,
        'mixup': Config.MIXUP,
        'copy_paste': Config.COPY_PASTE,
        'close_mosaic': 10,  # Disable mosaic for last N epochs
        'focal_loss': True,  # Use focal loss
        'label_smoothing': 0.1,  # Label smoothing epsilon
        'overlap_mask': True,
        'nbs': 64,  # Nominal batch size
        'single_cls': False,
        'rect': False,  # Rectangular training
        'cos_lr': True,  # Cosine LR scheduler
        'resume': False,  # Resume training from last.pt
        'amp': True,  # Automatic Mixed Precision (AMP) training
        'v5loader': False,  # Use YOLOv5 dataloader
        'cache': 'ram',  # Cache images in RAM for faster training
        'image_weights': True,  # Use weighted image selection for training
        'multi_scale': False,  # Vary image size by +/- 50%
    }
    
    # Start training
    print("\n=== Starting Training ===")
    results = model.train(**train_args)
    
    print("\n=== Training Complete ===")
    print(f"Results saved to {os.path.join(Config.PROJECT, Config.NAME)}")

if __name__ == "__main__":
    train()
