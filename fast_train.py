import os
import torch
from ultralytics import YOLO

def main():
    # Clear any existing Python processes
    os.system('taskkill /F /IM python.exe 2>nul')
    
    print("=== Starting Fast Training ===")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory/1024**3:.1f}GB")
    
    # Initialize model
    weights_dir = os.path.join('runs', 'train', 'mangrove_training_100epochs', 'weights')
    last_weights = os.path.join(weights_dir, 'last.pt')
    
    if os.path.exists(last_weights):
        print(f"\nResuming training from: {last_weights}")
        model = YOLO(last_weights)
    else:
        print("\nStarting new training with YOLOv8s model...")
        model = YOLO('yolov8s.pt')
    
    # Training configuration
    train_args = {
        'data': 'mangrove_data.yaml',
        'epochs': 100,
        'batch': 32,  # Increased batch size for RTX 4090
        'imgsz': 640,
        'device': 0,  # Use first GPU
        'workers': 8,  # Increased data loading workers
        'project': 'runs/train',
        'name': 'mangrove_fast_training',
        'exist_ok': True,
        'resume': True,
        'amp': True,  # Mixed precision training
        'optimizer': 'AdamW',
        'lr0': 0.001,
        'lrf': 0.01,
        'momentum': 0.9,
        'weight_decay': 0.0005,
        'warmup_epochs': 3.0,
        'warmup_momentum': 0.8,
        'warmup_bias_lr': 0.1,
        'label_smoothing': 0.1,
        'cos_lr': True,
        'cache': 'ram',
        'close_mosaic': 10,
        'overlap_mask': False,
        'single_cls': False,
        'val': False,  # Skip validation during training
        'plots': True,
        'deterministic': False,
        'rect': False,
    }
    
    print("\n🚀 Starting training with optimized settings...")
    try:
        # Start training
        results = model.train(**train_args)
        print("\n✅ Training completed successfully!")
    except Exception as e:
        print(f"\n❌ Error during training: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
