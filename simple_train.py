from ultralytics import YOLO
import torch

def main():
    # Print environment info
    print("=== Environment Setup ===")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # Initialize model
    print("\nInitializing YOLOv8s model...")
    model = YOLO('yolov8s.pt')
    
    # Train the model with updated parameters
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
            verbose=True,
            plots=True
        )
        print("\nTraining completed successfully!")
        print(f"Best model saved at: runs/train/mangrove_training_100epochs/weights/best.pt")
    except Exception as e:
        print(f"\nError during training: {str(e)}")
        raise

if __name__ == "__main__":
    main()
