import os
import cv2
import numpy as np
from pathlib import Path
import matplotlib.pyplot as plt
from tqdm import tqdm

def load_model(model_path):
    """Load the YOLO model."""
    from ultralytics import YOLO
    return YOLO(model_path)

def evaluate_model(model, data_yaml, output_dir='evaluation_results'):
    """Run evaluation on the validation set."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Run validation
    metrics = model.val(
        data=data_yaml,
        split='val',
        batch=2,
        imgsz=320,
        conf=0.25,
        iou=0.6,
        save_json=True,
        save_conf=True,
        project=output_dir,
        name='evaluation',
        device='cpu'
    )
    return metrics

def visualize_predictions(model, image_dir, output_dir, conf_threshold=0.5):
    """Run inference on sample images and save visualizations."""
    os.makedirs(os.path.join(output_dir, 'predictions'), exist_ok=True)
    
    # Get list of image files
    image_paths = list(Path(image_dir).glob('*.*'))
    image_paths = [p for p in image_paths if p.suffix.lower() in ['.jpg', '.jpeg', '.png']]
    
    print(f"\nRunning inference on {len(image_paths)} images...")
    
    for img_path in tqdm(image_paths, desc="Processing images"):
        # Read and process image
        img = cv2.imread(str(img_path))
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Run inference
        results = model.predict(
            source=img_rgb,
            conf=conf_threshold,
            imgsz=320,
            save=False
        )
        
        # Draw detections
        for result in results:
            boxes = result.boxes.xyxy.cpu().numpy()
            confs = result.boxes.conf.cpu().numpy()
            class_ids = result.boxes.cls.cpu().numpy().astype(int)
            
            for box, conf, cls_id in zip(boxes, confs, class_ids):
                x1, y1, x2, y2 = map(int, box)
                label = f"{model.names[cls_id]}: {conf:.2f}"
                
                # Draw rectangle and label
                cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(img, label, (x1, y1 - 10), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        # Save the result
        output_path = os.path.join(output_dir, 'predictions', f'pred_{img_path.name}')
        cv2.imwrite(output_path, img)

def main():
    # Configuration
    model_path = 'runs/train/extended_training/weights/best.pt'
    data_yaml = 'dataset/data.yaml'
    output_dir = 'evaluation_results'
    
    # Load model
    print(f"Loading model from {model_path}...")
    model = load_model(model_path)
    
    # Run evaluation
    print("\nRunning evaluation on validation set...")
    metrics = evaluate_model(model, data_yaml, output_dir)
    
    # Print metrics
    print("\n=== Evaluation Results ===")
    print(f"mAP@0.5: {metrics.box.map:.4f}")
    print(f"mAP@0.5-0.95: {metrics.box.map_75:.4f}")
    print(f"Precision: {metrics.box.precision.mean():.4f}")
    print(f"Recall: {metrics.box.recall.mean():.4f}")
    
    # Run inference on sample images
    val_image_dir = 'dataset/images/val'
    if os.path.exists(val_image_dir):
        print(f"\nGenerating prediction visualizations...")
        visualize_predictions(model, val_image_dir, output_dir)
    
    print(f"\nEvaluation complete! Results saved to: {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    main()
