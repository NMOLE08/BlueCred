import os
import yaml
import argparse
from pathlib import Path
from datetime import datetime
import cv2
import numpy as np
from ultralytics import YOLO
from PIL import Image
import matplotlib.pyplot as plt

class MangroveDetector:
    def __init__(self, config_path='config.yaml'):
        """
        Initialize the MangroveDetector with configuration
        
        Args:
            config_path (str): Path to the configuration YAML file
        """
        self.config = self._load_config(config_path)
        self.model = None
        self.device = '0' if self.config['use_gpu'] else 'cpu'
        
    def _load_config(self, config_path):
        """Load configuration from YAML file"""
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        return config
    
    def prepare_dataset(self):
        """
        Prepare the dataset in YOLO format
        Expected directory structure:
        dataset/
        ├── images/
        │   ├── train/
        │   └── val/
        └── labels/
            ├── train/
            └── val/
        """
        print("Preparing dataset...")
        data_yaml = {
            'path': self.config['dataset_path'],
            'train': 'images/train',
            'val': 'images/val',
            'names': {i: name for i, name in enumerate(self.config['class_names'])},
            'nc': len(self.config['class_names'])
        }
        
        # Create data.yaml file if it doesn't exist
        yaml_path = os.path.join(self.config['dataset_path'], 'data.yaml')
        with open(yaml_path, 'w') as f:
            yaml.dump(data_yaml, f)
            
        print(f"Dataset configuration saved to {yaml_path}")
        return yaml_path
    
    def train(self):
        """Train the YOLOv8 model"""
        print("Starting model training...")
        
        # Prepare dataset
        data_yaml = self.prepare_dataset()
        
        # Initialize model
        self.model = YOLO(self.config['model_type'] + '.yaml')  # build from YAML
        
        # Train the model
        results = self.model.train(
            data=data_yaml,
            epochs=self.config['epochs'],
            imgsz=self.config['image_size'],
            batch=self.config['batch_size'],
            device=self.device,
            workers=self.config['workers'],
            optimizer=self.config['optimizer'],
            lr0=self.config['learning_rate'],
            name=f"mangrove_detection_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            project=self.config['project_name'],
            exist_ok=True
        )
        
        print("Training completed!")
        return results
    
    def evaluate(self, model_path=None):
        """Evaluate the trained model"""
        print("Evaluating model...")
        if model_path is None:
            model_path = self.config['weights_path']
            
        model = YOLO(model_path)
        metrics = model.val(
            data=os.path.join(self.config['dataset_path'], 'data.yaml'),
            batch=self.config['batch_size'],
            imgsz=self.config['image_size'],
            conf=0.25,
            iou=0.6
        )
        return metrics
    
    def predict(self, image_path, conf_threshold=0.25):
        """Run inference on a single image"""
        if self.model is None:
            self.model = YOLO(self.config['weights_path'])
            
        results = self.model(image_path, conf=conf_threshold)
        
        # Visualize results
        for result in results:
            img = result.plot()  # plot a BGR numpy array of predictions
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Show the image
            plt.figure(figsize=(12, 8))
            plt.imshow(img)
            plt.axis('off')
            plt.tight_layout()
            
            # Save the result
            output_dir = 'runs/detect/predict'
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, os.path.basename(image_path))
            plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
            plt.close()
            
            print(f"Prediction saved to {output_path}")
            
            # Count detections
            num_trees = len(result.boxes)
            print(f"Detected {num_trees} mangrove trees in {os.path.basename(image_path)}")
            
            return img, num_trees

def parse_args():
    parser = argparse.ArgumentParser(description='Train and evaluate YOLOv8 for mangrove tree detection')
    parser.add_argument('--mode', type=str, default='train', 
                       choices=['train', 'evaluate', 'predict'],
                       help='Mode: train, evaluate, or predict')
    parser.add_argument('--image', type=str, default=None,
                       help='Path to image for prediction (required if mode=predict)')
    parser.add_argument('--conf', type=float, default=0.25,
                       help='Confidence threshold for prediction')
    parser.add_argument('--config', type=str, default='config.yaml',
                       help='Path to config file')
    return parser.parse_args()

def main():
    args = parse_args()
    
    # Initialize detector
    detector = MangroveDetector(config_path=args.config)
    
    if args.mode == 'train':
        detector.train()
    elif args.mode == 'evaluate':
        detector.evaluate()
    elif args.mode == 'predict':
        if not args.image:
            raise ValueError("Please provide an image path using --image for prediction mode")
        detector.predict(args.image, conf_threshold=args.conf)
    else:
        raise ValueError(f"Unknown mode: {args.mode}")

if __name__ == "__main__":
    main()
