import os
import cv2
import torch
import numpy as np
from pathlib import Path
from ultralytics import YOLO
from tqdm import tqdm

def predict_on_test_set():
    print("=== Starting Prediction ===")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # Configuration
    model_path = 'runs/train/mangrove_optimized_v2/weights/best.pt'
    test_images_dir = 'mangrove.v1i.yolov8/test/images'
    output_dir = 'runs/detect/predict'
    conf_threshold = 0.25  # Confidence threshold
    iou_threshold = 0.45   # NMS IoU threshold
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Load the trained model
    print("\nLoading model...")
    model = YOLO(model_path)
    
    # Get list of test images
    test_images = list(Path(test_images_dir).glob('*.*'))
    if not test_images:
        print(f"No images found in {test_images_dir}")
        return
    
    print(f"\nFound {len(test_images)} test images")
    print("Starting predictions...")
    
    # Process each image
    for img_path in tqdm(test_images, desc="Processing images"):
        try:
            # Make prediction
            results = model(
                str(img_path),
                conf=conf_threshold,
                iou=iou_threshold,
                save=True,
                save_txt=True,
                save_conf=True,
                project=os.path.dirname(output_dir),
                name=os.path.basename(output_dir),
                exist_ok=True
            )
            
            # Print results for the first few images
            if test_images.index(img_path) < 3:  # Show details for first 3 images
                print(f"\nResults for {img_path.name}:")
                for r in results:
                    print(f"  Detected {len(r.boxes)} objects")
                    if len(r.boxes) > 0:
                        print(f"  Classes: {r.boxes.cls.tolist()}")
                        print(f"  Confidences: {r.boxes.conf.tolist()}")
        
        except Exception as e:
            print(f"Error processing {img_path}: {str(e)}")
    
    print(f"\n=== Prediction Complete ===")
    print(f"Results saved to: {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    predict_on_test_set()
