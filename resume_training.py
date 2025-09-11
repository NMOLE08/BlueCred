import torch
from ultralytics import YOLO
import os

def main():
    print("=== Environment Setup ===")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")

    # Initialize model with the last saved weights if available
    weights_dir = os.path.join('runs', 'train', 'mangrove_training_100epochs', 'weights')
    last_weights = os.path.join(weights_dir, 'last.pt')
    
    if os.path.exists(last_weights):
        print(f"\nResuming training from: {last_weights}")
        model = YOLO(last_weights)
    else:
        print("\nStarting new training with YOLOv8s model...")
        model = YOLO('yolov8s.pt')

    # Train the model
    print("\nStarting training...")
    try:
        results = model.train(
            data='mangrove_data.yaml',
            epochs=100,
            batch=16,
            imgsz=640,
            device='cuda' if torch.cuda.is_available() else 'cpu',
            workers=4,
            project='runs/train',
            name='mangrove_training_100epochs',
            exist_ok=True,
            resume=True,  # This will resume from last.pt if available
            patience=30,
            lr0=0.01,
            lrf=0.1,
            momentum=0.937,
            weight_decay=0.0005,
            warmup_epochs=3.0,
            warmup_momentum=0.8,
            warmup_bias_lr=0.1,
            label_smoothing=0.1,
            cos_lr=True,
            plots=True
        )
        
        print("\n=== Training Completed Successfully ===")
        
    except Exception as e:
        print(f"\nError during training: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
