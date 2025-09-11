import torch
from ultralytics import YOLO
import os

def main():
    print("=== Environment Setup ===")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory/1024**3:.1f}GB")

    # Clear any existing processes
    os.system('taskkill /F /IM python.exe')

    # Initialize model with the last saved weights if available
    weights_dir = os.path.join('runs', 'train', 'mangrove_training_100epochs', 'weights')
    last_weights = os.path.join(weights_dir, 'last.pt')
    
    if os.path.exists(last_weights):
        print(f"\nResuming training from: {last_weights}")
        model = YOLO(last_weights)
    else:
        print("\nStarting new training with YOLOv8s model...")
        model = YOLO('yolov8s.pt')

    # Train the model with optimizations
    print("\n🚀 Starting optimized training with RTX 4090...")
    try:
        results = model.train(
            data='mangrove_data.yaml',
            epochs=100,
            batch=32,  # Increased batch size for RTX 4090
            imgsz=640,
            device=0,  # Use first GPU
            workers=8,  # Increased data loading workers
            project='runs/train',
            name='mangrove_training_optimized',
            exist_ok=True,
            resume=True,
            # Optimized training parameters
            amp=True,  # Mixed precision training
            optimizer='AdamW',  # Better optimizer for this task
            lr0=0.001,  # Lower learning rate for stability
            lrf=0.01,  # Final learning rate
            momentum=0.9,  # Slightly higher momentum
            weight_decay=0.0005,
            warmup_epochs=3.0,
            warmup_momentum=0.8,
            warmup_bias_lr=0.1,
            label_smoothing=0.1,
            cos_lr=True,  # Cosine learning rate scheduler
            # Performance optimizations
            cache='ram',  # Cache dataset in RAM
            close_mosaic=10,  # Disable mosaic in last 10 epochs
            overlap_mask=False,  # Slight speed improvement
            single_cls=False,  # Multi-class training
            # Validation settings
            val=False,  # Skip validation during training (validate at the end)
            plots=True,  # Save training plots
            # Additional optimizations
            deterministic=False,  # Slightly faster training
            rect=False,  # Rectangular training can be faster
            #patience=50,  # Early stopping patience
            #save_period=5,  # Save checkpoints every 5 epochs
            #bbox_interval=1,  # Log bounding box metrics every epoch
        )
        
        print("\n=== Training Completed Successfully ===")
        
    except Exception as e:
        print(f"\nError during training: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
