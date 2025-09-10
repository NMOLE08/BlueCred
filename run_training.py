from ultralytics import YOLO
import torch

def main():
    # Print environment info
    print("\n=== Environment Setup ===")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # Initialize model
    print("\nInitializing YOLOv8s model...")
    model = YOLO('yolov8s.pt')
    
    # Train the model
    print("\nStarting training...")
    try:
        results = model.train(
            data='dataset/data_augmented.yaml',
            epochs=200,
            batch=16,  # Reduced batch size for stability
            imgsz=640,
            device=0 if torch.cuda.is_available() else 'cpu',
            workers=4,  # Reduced workers for stability
            project='runs/train',
            name='augmented_training_v2',
            exist_ok=True,
            patience=30,
            lr0=0.01,
            lrf=0.1,
            momentum=0.9,
            weight_decay=0.0005,
            warmup_epochs=3.0,
            warmup_momentum=0.8,
            warmup_bias_lr=0.1,
            label_smoothing=0.1,
            box=7.5,
            cls=0.5,
            dfl=1.5,
        )
        print("\nTraining completed successfully!")
    except Exception as e:
        print(f"\nError during training: {str(e)}")
        raise

if __name__ == "__main__":
    main()
