import os
import yaml
import torch
from ultralytics import YOLO
import argparse
from datetime import datetime
import logging

# Set up simple logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]  # Only console logging
)
logger = logging.getLogger(__name__)

def train_model():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Train YOLOv8 on mangrove dataset')
    parser.add_argument('--epochs', type=int, default=100, help='number of training epochs')
    parser.add_argument('--batch', type=int, default=16, help='batch size')
    parser.add_argument('--img-size', type=int, default=640, help='image size')
    parser.add_argument('--model', type=str, default='yolov8n.pt', help='pretrained model path or name')
    parser.add_argument('--data', type=str, default='dataset/data.yaml', help='path to data.yaml')
    parser.add_argument('--name', type=str, default=None, help='experiment name')
    parser.add_argument('--device', type=str, default=None, help='device to run on (e.g., 0 for GPU 0 or "cpu")')
    parser.add_argument('--project', type=str, default='runs/train', help='project name')
    parser.add_argument('--patience', type=int, default=50, help='early stopping patience')
    parser.add_argument('--seed', type=int, default=42, help='random seed')
    args = parser.parse_args()

    # Set random seed for reproducibility
    torch.manual_seed(args.seed)
    
    # Set device
    device = args.device if args.device else ('0' if torch.cuda.is_available() else 'cpu')
    logger.info(f'Using device: {device}')

    # Load data config
    with open(args.data, 'r') as f:
        data_config = yaml.safe_load(f)
    
    # Log dataset information
    logger.info(f'Dataset path: {data_config["path"]}')
    logger.info(f'Training images: {data_config["train"]}')
    logger.info(f'Validation images: {data_config["val"]}')
    logger.info(f'Number of classes: {data_config["nc"]}')
    logger.info(f'Class names: {data_config["names"]}')

    # Set experiment name with timestamp if not provided
    if not args.name:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        args.name = f'mangrove_detection_{timestamp}'
    
    # Initialize model
    logger.info(f'Initializing model from {args.model}')
    model = YOLO(args.model)
    
    # Train the model with minimal settings
    logger.info('Starting training with minimal settings...')
    results = model.train(
        data=args.data,
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.img_size,
        device=device,
        project=args.project,
        name=args.name,
        seed=args.seed,
        exist_ok=True,
        workers=0,  # Disable multiprocessing
        single_cls=False,  # Multi-class training
        close_mosaic=0,  # Disable mosaic augmentation
        hsv_h=0.0,  # Disable HSV augmentations
        hsv_s=0.0,
        hsv_v=0.0,
        fliplr=0.0,  # Disable flips
        flipud=0.0,
        mosaic=0.0,  # Disable mosaic
        mixup=0.0,  # Disable mixup
        copy_paste=0.0,  # Disable copy-paste
        erasing=0.0,  # Disable random erasing
        cache=False,  # Disable caching
        verbose=True,  # Show progress
    )
    
    logger.info('Training completed successfully!')
    return results

if __name__ == '__main__':
    train_model()
