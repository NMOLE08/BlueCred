import os
from ultralytics import YOLO
import matplotlib.pyplot as plt
import numpy as np

def main():
    # Configuration
    model_path = 'runs/train/extended_training/weights/best.pt'
    data_yaml = 'dataset/data.yaml'
    output_dir = 'evaluation_results'
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Load the model
    print("Loading model...")
    model = YOLO(model_path)
    
    # Run evaluation
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
    
    # Print metrics
    print("\n=== Evaluation Results ===")
    print(f"mAP@0.5: {metrics.box.map50:.4f}")
    print(f"mAP@0.5-0.95: {metrics.box.map:.4f}")
    print(f"Mean Precision: {metrics.box.mp:.4f}")
    print(f"Mean Recall: {metrics.box.mr:.4f}")
    
    # Plot and save metrics
    print("\nGenerating visualizations...")
    plot_metrics(metrics, output_dir)
    
    print(f"\nEvaluation complete! Results saved to: {os.path.abspath(output_dir)}")

def plot_metrics(metrics, output_dir):
    """Plot and save evaluation metrics."""
    # Create visualizations directory
    vis_dir = os.path.join(output_dir, 'visualizations')
    os.makedirs(vis_dir, exist_ok=True)
    
    # Get class-wise metrics
    class_metrics = []
    for i in range(metrics.box.nc):
        p, r, ap50, ap = metrics.box.class_result(i)
        class_metrics.append({
            'class': i,
            'precision': p,
            'recall': r,
            'ap50': ap50,
            'ap': ap
        })
    
    # Plot class-wise AP
    plt.figure(figsize=(12, 6))
    classes = [f'Class {m["class"]}' for m in class_metrics]
    ap_values = [m['ap'] for m in class_metrics]
    plt.bar(classes, ap_values)
    plt.xlabel('Class')
    plt.ylabel('AP@0.5:0.95')
    plt.title('Average Precision per Class')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.savefig(os.path.join(vis_dir, 'class_ap.png'))
    plt.close()
    
    # Plot mAP metrics
    plt.figure(figsize=(10, 6))
    map_metrics = ['mAP@0.5', 'mAP@0.5:0.95']
    map_values = [metrics.box.map50, metrics.box.map]
    plt.bar(map_metrics, map_values)
    plt.xlabel('Metric')
    plt.ylabel('Value')
    plt.title('Mean Average Precision Metrics')
    plt.ylim(0, 1.0)
    plt.tight_layout()
    plt.savefig(os.path.join(vis_dir, 'map_metrics.png'))
    plt.close()

if __name__ == "__main__":
    main()
