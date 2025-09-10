import os
import sys
import logging
import torch
from ultralytics import YOLO
from datetime import datetime

def setup_logging():
    """Set up logging configuration"""
    log_dir = os.path.join('logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # Create a timestamp for the log file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = os.path.join(log_dir, f'train_{timestamp}.log')
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return log_file

def main():
    try:
        # Set up logging
        log_file = setup_logging()
        logging.info(f"Training started. Logging to {os.path.abspath(log_file)}")
        
        # Check PyTorch and CUDA availability
        logging.info(f"PyTorch version: {torch.__version__}")
        logging.info(f"CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            logging.info(f"CUDA device: {torch.cuda.get_device_name(0)}")
        
        # Load a model
        logging.info("Loading YOLOv8n model...")
        model = YOLO('yolov8n.pt')  # load a pretrained model
        
        # Set up data path
        data_path = os.path.abspath(os.path.join('dataset', 'data.yaml'))
        logging.info(f"Using dataset configuration from: {data_path}")
        
        # Verify the data path exists
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Data configuration file not found at: {data_path}")
        
        # Verify dataset structure
        required_dirs = [
            os.path.join('dataset', 'images', 'train'),
            os.path.join('dataset', 'images', 'val'),
            os.path.join('dataset', 'labels', 'train'),
            os.path.join('dataset', 'labels', 'val')
        ]
        
        for dir_path in required_dirs:
            if not os.path.exists(dir_path):
                raise FileNotFoundError(f"Required directory not found: {dir_path}")
        
        # Start training with more detailed configuration
        logging.info("Starting training...")
        results = model.train(
            data=data_path,
            epochs=30,
            imgsz=640,
            batch=4,  # Reduced batch size for stability
            project='mangrove_detection',
            name='train',
            device='cpu',  # Force CPU training for stability
            workers=1,     # Reduced workers to prevent memory issues
            verbose=True,  # More detailed output
            save_period=5, # Save a checkpoint every 5 epochs
            exist_ok=True, # Overwrite existing files
            single_cls=False, # Multi-class training
            cos_lr=True,   # Cosine learning rate scheduler
            optimizer='AdamW',  # Better optimizer for CPU
            seed=42,       # For reproducibility
            deterministic=True, # For reproducibility
            close_mosaic=10, # Disable mosaic augmentation in last 10 epochs
            # Data augmentation
            hsv_h=0.015,   # Image HSV-Hue augmentation (fraction)
            hsv_s=0.7,     # Image HSV-Saturation augmentation (fraction)
            hsv_v=0.4,     # Image HSV-Value augmentation (fraction)
            translate=0.1,  # Image translation (+/- fraction)
            scale=0.5,      # Image scale (+/- gain)
            fliplr=0.5,    # Image flip left-right (probability)
            flipud=0.0,    # Image flip up-down (probability)
            mosaic=1.0,    # Image mosaic (probability)
            mixup=0.0,     # Image mixup (probability)
            copy_paste=0.0 # Segment copy-paste (probability)
        )
        
        logging.info("Training completed successfully!")
        
    except Exception as e:
        logging.error(f"Error during training: {str(e)}", exc_info=True)
        sys.exit(1)
    except KeyboardInterrupt:
        logging.info("Training interrupted by user")
        sys.exit(0)

if __name__ == '__main__':
    main()
