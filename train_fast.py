import os
import torch
from ultralytics import YOLO
import argparse

def parse_args():
    parser = argparse.ArgumentParser(description='Train YOLOv8 on mangrove dataset with RTX 4090 optimizations')
    parser.add_argument('--resume', action='store_true', help='resume training from last.pt')
    return parser.parse_args()

def main():
    args = parse_args()
    
    # Clear any existing processes
    os.system('taskkill /F /IM python.exe 2>nul')
    
    print("\n=== RTX 4090 Optimized Training ===")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory/1024**3:.1f}GB")
    else:
        print("\n⚠️  WARNING: CUDA not available. Training will be very slow on CPU!")
    
    # Training configuration optimized for RTX 4090
    config = {
        # Data configuration
        'data': 'mangrove_data.yaml',
        
        # Model configuration
        'model': 'yolov8s.pt',
        'pretrained': True,
        
        # Training parameters
        'epochs': 100,
        'batch': 64,  # Large batch size for RTX 4090
        'imgsz': 640,
        'device': 0 if torch.cuda.is_available() else 'cpu',
        'workers': 8,  # Increased workers for faster data loading
        'cache': 'ram',  # Cache dataset in RAM for faster training
        'close_mosaic': 10,  # Disable mosaic in last 10 epochs
        'patience': 50,  # Early stopping patience
        
        # Optimizer settings
        'optimizer': 'AdamW',  # Better optimizer for this task
        'lr0': 0.001,  # Initial learning rate
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
        'deterministic': False,  # Slightly faster training
        'overlap_mask': False,  # Slight speed improvement
        'single_cls': False,  # Multi-class training
        'rect': False,  # Rectangular training can be faster
        
        # Data augmentation
        'hsv_h': 0.015,
        'hsv_s': 0.7,
        'hsv_v': 0.4,
        'degrees': 10.0,
        'translate': 0.1,
        'scale': 0.5,
        'shear': 0.0,
        'perspective': 0.0,
        'flipud': 0.0,
        'fliplr': 0.5,
        'mosaic': 1.0,  # Enable mosaic augmentation
        'mixup': 0.1,   # Enable mixup augmentation
        'copy_paste': 0.0,  # Disable copy-paste for speed
        
        # Validation and logging
        'val': True,  # Enable validation
        'plots': True,  # Save training plots
        'save': True,  # Save checkpoints
        'save_period': 10,  # Save checkpoints every 10 epochs
        'exist_ok': True,  # Overwrite existing files
        'project': 'runs/train',
        'name': 'mangrove_rtx4090_optimized',
    }
    
    # Initialize model with the last saved weights if resuming
    weights_dir = os.path.join('runs', 'train', 'mangrove_rtx4090_optimized', 'weights')
    last_weights = os.path.join(weights_dir, 'last.pt')
    
    if args.resume and os.path.exists(last_weights):
        print(f"\nResuming training from: {last_weights}")
        model = YOLO(last_weights)
        config['resume'] = True
    else:
        print("\nStarting new training with YOLOv8s model...")
        model = YOLO(config['model'])
    
    # Start training
    print("\n🚀 Starting optimized training for RTX 4090...")
    print("⚡ Using mixed precision training for maximum speed")
    print(f"📊 Batch size: {config['batch']}, Workers: {config['workers']}")
    print(f"💾 Caching dataset in RAM for faster training")
    
    try:
        results = model.train(**config)
        print("\n✅ Training completed successfully!")
    except Exception as e:
        print(f"\n❌ Error during training: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
