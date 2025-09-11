import torch
from ultralytics import YOLO
import os
import shutil

def main():
    print("=== Environment Setup ===")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")

    # Clear any existing cache files
    cache_files = [
        "mangrove.v1i.yolov8/train.cache",
        "mangrove.v1i.yolov8/valid.cache", 
        "mangrove.v1i.yolov8/test.cache"
    ]
    
    for cache_file in cache_files:
        if os.path.exists(cache_file):
            os.remove(cache_file)
            print(f"Removed cache file: {cache_file}")

    # Remove runs directory to start fresh
    if os.path.exists("runs"):
        shutil.rmtree("runs")
        print("Removed existing runs directory")

    # Initialize model
    print("\nInitializing YOLOv8s model...")
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
            plots=True,
            cache=False  # Disable caching to avoid issues
        )
        
        print("\n=== Training Completed Successfully ===")
        print(f"Results saved to: {results.save_dir}")
        
        # Print final metrics
        if hasattr(results, 'results_dict'):
            print("\nFinal Training Metrics:")
            for key, value in results.results_dict.items():
                print(f"{key}: {value}")
                
    except Exception as e:
        print(f"\nError during training: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
