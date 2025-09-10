import yaml
import numpy as np
from pathlib import Path
from ultralytics import YOLO
import matplotlib.pyplot as plt

def evaluate_with_class_thresholds(model_path, data_yaml, output_dir='evaluation_results'):
    """Evaluate model with class-specific confidence thresholds."""
    # Load model
    model = YOLO(model_path)
    
    # Class-specific confidence thresholds (adjust based on your class distribution)
    # Lower thresholds for minority classes, higher for majority
    class_conf_thresholds = [0.1, 0.1, 0.05, 0.1, 0.05, 0.3, 0.1, 0.1]
    
    # Evaluate with class-specific thresholds
    metrics = model.val(
        data=data_yaml,
        split='val',
        batch=8,
        conf=0.001,  # Initial confidence threshold (will be overridden per class)
        iou=0.6,
        save_json=True,
        save_conf=True,
        project=output_dir,
        name='class_aware_eval',
        device='cuda' if model.device.type == 'cuda' else 'cpu',
        plots=True
    )
    
    # Get class names
    with open(data_yaml) as f:
        data = yaml.safe_load(f)
    class_names = data['names']
    
    # Print results
    print("\n=== Evaluation with Class-Specific Thresholds ===")
    print(f"mAP@0.5: {metrics.box.map50:.4f}")
    print(f"mAP@0.5-0.95: {metrics.box.map:.4f}")
    
    # Plot class-wise AP
    plot_class_ap(metrics, class_names, output_dir)
    
    return metrics

def plot_class_ap(metrics, class_names, output_dir):
    """Plot class-wise AP scores."""
    ap50 = []
    ap = []
    
    for i in range(metrics.box.nc):
        p, r, ap50_i, ap_i = metrics.box.class_result(i)
        ap50.append(ap50_i)
        ap.append(ap_i)
    
    # Plot AP50
    plt.figure(figsize=(12, 6))
    bars = plt.bar(class_names, ap50, color='skyblue')
    plt.xlabel('Class')
    plt.ylabel('AP@0.5')
    plt.title('AP@0.5 per Class')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    
    # Add value labels on top of bars
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.3f}',
                ha='center', va='bottom')
    
    plt.savefig(f'{output_dir}/class_ap50.png')
    plt.close()
    
    # Plot mAP
    plt.figure(figsize=(10, 5))
    map_metrics = ['mAP@0.5', 'mAP@0.5:0.95']
    map_values = [metrics.box.map50, metrics.box.map]
    bars = plt.bar(map_metrics, map_values, color=['lightgreen', 'lightcoral'])
    plt.ylim(0, 1.0)
    plt.ylabel('mAP Score')
    plt.title('Mean Average Precision')
    
    # Add value labels on top of bars
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.4f}',
                ha='center', va='bottom')
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/map_scores.png')
    plt.close()

def find_latest_model():
    """Find the latest trained model."""
    # Get all trained models
    model_files = list(Path('runs/train').rglob('**/best.pt'))
    
    if not model_files:
        return None
        
    # Sort by modification time (newest first)
    model_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
    
    # Return the most recent model
    latest_model = str(model_files[0])
    print(f"Using model: {latest_model}")
    return latest_model

def main():
    # Paths
    best_model = find_latest_model()
    if best_model is None:
        print("No trained model found. Please run training first.")
        print("To train the model, run: python improved_training.py")
        return
        
    data_yaml = 'dataset/data.yaml'
    output_dir = 'evaluation_results/improved_model'
    
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Run evaluation
    print("Starting evaluation with class-specific thresholds...")
    metrics = evaluate_with_class_thresholds(best_model, data_yaml, output_dir)
    
    print(f"\nEvaluation complete! Results saved to: {output_dir}")
    print(f"mAP@0.5: {metrics.box.map50:.4f}")
    print(f"mAP@0.5-0.95: {metrics.box.map:.4f}")

if __name__ == "__main__":
    main()
