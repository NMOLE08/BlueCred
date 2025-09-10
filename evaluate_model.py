import os
import cv2
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from tqdm import tqdm

def load_model(model_path):
    """Load the YOLO model."""
    from ultralytics import YOLO
    return YOLO(model_path)

def evaluate_on_validation_set(model, data_yaml, output_dir='evaluation_results'):
    """Run evaluation on the validation set and save results."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Run validation
    print("\nRunning evaluation on validation set...")
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

def visualize_predictions(model, image_dir, output_dir, conf_threshold=0.5, max_images=10):
    """Run inference on sample images and save visualizations."""
    vis_dir = os.path.join(output_dir, 'predictions')
    os.makedirs(vis_dir, exist_ok=True)
    
    # Get list of image files
    image_paths = list(Path(image_dir).glob('*.*'))
    image_paths = [p for p in image_paths if p.suffix.lower() in ['.jpg', '.jpeg', '.png']][:max_images]
    
    print(f"\nRunning inference on {len(image_paths)} sample images...")
    
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
                label = f"{model.names[cls_id]} {conf:.2f}"
                
                # Draw rectangle and label
                cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(img, label, (x1, y1 - 10), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        # Save the result
        output_path = os.path.join(vis_dir, f'pred_{img_path.name}')
        cv2.imwrite(output_path, img)

def plot_metrics(metrics, output_dir):
    """Plot and save evaluation metrics."""
    vis_dir = os.path.join(output_dir, 'metrics')
    os.makedirs(vis_dir, exist_ok=True)
    
    # Plot precision-recall curve
    if hasattr(metrics, 'box') and hasattr(metrics.box, 'prec') and hasattr(metrics.box, 'recall'):
        plt.figure(figsize=(10, 6))
        plt.plot(metrics.box.recall, metrics.box.prec, 'b-', label='Precision-Recall')
        plt.xlabel('Recall')
        plt.ylabel('Precision')
        plt.title('Precision-Recall Curve')
        plt.legend()
        plt.grid(True)
        plt.savefig(os.path.join(vis_dir, 'precision_recall_curve.png'))
        plt.close()
    
    # Plot confidence distribution
    if hasattr(metrics, 'box') and hasattr(metrics.box, 'conf'):
        plt.figure(figsize=(10, 6))
        plt.hist(metrics.box.conf, bins=50, alpha=0.7, color='g')
        plt.xlabel('Confidence')
        plt.ylabel('Count')
        plt.title('Confidence Distribution of Detections')
        plt.grid(True)
        plt.savefig(os.path.join(vis_dir, 'confidence_distribution.png'))
        plt.close()

def main():
    # Configuration
    model_path = 'runs/train/extended_training/weights/best.pt'
    data_yaml = 'dataset/data.yaml'
    val_image_dir = 'dataset/images/val'
    output_dir = 'evaluation_results'
    
    print("Loading model...")
    model = load_model(model_path)
    
    # Run evaluation
    metrics = evaluate_on_validation_set(model, data_yaml, output_dir)
    
    # Print metrics
    print("\n=== Evaluation Results ===")
    if hasattr(metrics, 'box'):
        print(f"mAP@0.5: {getattr(metrics.box, 'map', 0):.4f}")
        print(f"mAP@0.5-0.95: {getattr(metrics.box, 'map_75', 0):.4f}")
        print(f"Precision: {getattr(metrics.box.precision, 'mean', 0)():.4f}" if hasattr(metrics.box, 'precision') else "Precision: N/A")
        print(f"Recall: {getattr(metrics.box.recall, 'mean', 0)():.4f}" if hasattr(metrics.box, 'recall') else "Recall: N/A")
    
    # Generate visualizations
    if os.path.exists(val_image_dir):
        visualize_predictions(model, val_image_dir, output_dir)
    
    # Plot metrics if available
    plot_metrics(metrics, output_dir)
    
    print(f"\nEvaluation complete! Results saved to: {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    main()
