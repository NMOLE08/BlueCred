import os
import cv2
import numpy as np
from ultralytics import YOLO
from pathlib import Path
import matplotlib.pyplot as plt
from tqdm import tqdm

class ModelEvaluator:
    def __init__(self, model_path, data_yaml):
        """
        Initialize the ModelEvaluator with model and dataset configuration.
        
        Args:
            model_path (str): Path to the trained YOLO model weights
            data_yaml (str): Path to the dataset configuration YAML file
        """
        self.model = YOLO(model_path)
        self.data_yaml = data_yaml
        self.results_dir = os.path.join('evaluation_results', os.path.splitext(os.path.basename(model_path))[0])
        os.makedirs(self.results_dir, exist_ok=True)
        
    def evaluate_model(self):
        """Evaluate the model on the validation set and return metrics."""
        print("\nEvaluating model on validation set...")
        metrics = self.model.val(
            data=self.data_yaml,
            split='val',
            batch=2,  # Reduced batch size for CPU
            imgsz=320,  # Reduced image size for CPU
            conf=0.25,
            iou=0.6,
            save_json=True,
            save_conf=True,
            project=self.results_dir,
            name='evaluation',
            device='cpu'  # Force CPU
        )
        return metrics
    
    def real_time_evaluation(self, image_dir, conf_threshold=0.5):
        """
        Run real-time evaluation on a directory of images and display results.
        
        Args:
            image_dir (str): Directory containing images for evaluation
            conf_threshold (float): Confidence threshold for detections
        """
        print(f"\nRunning real-time evaluation on images in: {image_dir}")
        image_paths = list(Path(image_dir).glob('*.*'))
        
        for img_path in image_paths:
            if img_path.suffix.lower() not in ['.jpg', '.jpeg', '.png']:
                continue
                
            # Read and process image
            img = cv2.imread(str(img_path))
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Run inference
            results = self.model.predict(
                source=img_rgb,
                conf=conf_threshold,
                imgsz=640,
                save=False
            )
            
            # Draw detections
            for result in results:
                # Get detection boxes
                boxes = result.boxes.xyxy.cpu().numpy()
                confs = result.boxes.conf.cpu().numpy()
                class_ids = result.boxes.cls.cpu().numpy().astype(int)
                
                # Draw each detection
                for box, conf, cls_id in zip(boxes, confs, class_ids):
                    x1, y1, x2, y2 = map(int, box)
                    label = f"{self.model.names[cls_id]}: {conf:.2f}"
                    
                    # Draw rectangle and label
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(img, label, (x1, y1 - 10), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            # Display the result
            cv2.imshow('Real-time Detection', img)
            
            # Break the loop if 'q' is pressed
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cv2.destroyAllWindows()

def plot_confusion_matrix(confusion_matrix, class_names, save_path):
    """Plot and save the confusion matrix."""
    import seaborn as sns
    import matplotlib.pyplot as plt
    
    plt.figure(figsize=(10, 8))
    sns.heatmap(confusion_matrix, annot=True, fmt='.2f', cmap='Blues', 
                xticklabels=class_names, yticklabels=class_names)
    plt.title('Confusion Matrix')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.xticks(rotation=45)
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig(os.path.join(save_path, 'confusion_matrix_detailed.png'))
    plt.close()

def plot_metrics(metrics, save_path):
    """Plot and save the training metrics."""
    # Plot precision-recall curve
    plt.figure(figsize=(10, 6))
    plt.plot(metrics.box.prec, label='Precision')
    plt.plot(metrics.box.recall, label='Recall')
    plt.xlabel('Confidence Threshold')
    plt.ylabel('Score')
    plt.title('Precision-Recall Curve')
    plt.legend()
    plt.grid(True)
    plt.savefig(os.path.join(save_path, 'precision_recall_curve.png'))
    plt.close()

def main():
    # Path to the trained model and dataset config
    model_path = 'runs/train/extended_training/weights/best.pt'  # Updated to use the newly trained model
    data_yaml = 'dataset/data.yaml'  # Path to dataset YAML file
    
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}")
        print("Please make sure the model has been trained first.")
        return
        
    if not os.path.exists(data_yaml):
        print(f"Error: Dataset config not found at {data_yaml}")
        return
    
    print(f"Using model: {model_path}")
    print(f"Using dataset config: {data_yaml}")
    
    try:
        # Initialize evaluator
        evaluator = ModelEvaluator(model_path, data_yaml)
        
        # Create directory for visualizations
        vis_dir = os.path.join('evaluation_results', 'visualizations')
        os.makedirs(vis_dir, exist_ok=True)
        
        # Run evaluation
        print("\nStarting model evaluation...")
        metrics = evaluator.evaluate_model()
        
        # Print and save evaluation metrics
        print("\n=== Evaluation Results ===")
        print(f"mAP@0.5: {metrics.box.map:.4f}")
        print(f"mAP@0.5-0.95: {metrics.box.map_75:.4f}")
        print(f"Precision: {metrics.box.precision.mean():.4f}")
        print(f"Recall: {metrics.box.recall.mean():.4f}")
        
        # Plot and save metrics
        print("\nGenerating visualizations...")
        plot_metrics(metrics, vis_dir)
        
        # Get class names from the model
        class_names = list(evaluator.model.names.values())
        
        # Plot confusion matrix if available
        if hasattr(metrics, 'confusion_matrix'):
            plot_confusion_matrix(metrics.confusion_matrix, class_names, vis_dir)
        
        # Run real-time evaluation on a sample of validation images
        val_image_dir = 'dataset/images/val'
        if os.path.exists(val_image_dir):
            print("\nRunning real-time evaluation on validation images...")
            evaluator.real_time_evaluation(val_image_dir)
        else:
            print(f"Warning: Validation image directory not found at {val_image_dir}")
        
        print(f"\nEvaluation complete! Results saved to: {os.path.abspath(evaluator.results_dir)}")
        print(f"Visualizations saved to: {os.path.abspath(vis_dir)}")
        # Check if we have any detections
        if metrics.box.map50 < 0.1:
            print("\nWARNING: Model performance is very low. Possible issues:")
            print("1. The model may need more training")
            print("2. The dataset may be too small or imbalanced")
            print("3. The model architecture may not be suitable for this task")
        
    except Exception as e:
        print(f"\nError during evaluation: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
