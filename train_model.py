import os
import yaml
from ultralytics import YOLO
import torch

def main():
    # Print environment info
    print("\n=== Environment Setup ===")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # Training configuration
    config = {
        'data': 'dataset/data_augmented.yaml',
        'model': 'yolov8s.pt',
        'epochs': 200,
        'batch': 32,
        'imgsz': 640,
        'device': 0 if torch.cuda.is_available() else 'cpu',
        'workers': 8,
        'project': 'runs/train',
        'name': 'augmented_training',
        'exist_ok': True,
        'patience': 50,
        'lr0': 0.01,
        'lrf': 0.1,
        'momentum': 0.937,
        'weight_decay': 0.0005,
        'warmup_epochs': 3.0,
        'warmup_momentum': 0.8,
        'warmup_bias_lr': 0.1,
        'label_smoothing': 0.1,
        'box': 7.5,  # box loss gain
        'cls': 0.5,  # cls loss gain
        'dfl': 1.5,  # dfl loss gain
    }
    
    # Create output directory
    os.makedirs(os.path.join(config['project'], config['name']), exist_ok=True)
    
    # Save config
    with open(os.path.join(config['project'], config['name'], 'config.yaml'), 'w') as f:
        yaml.dump(config, f)
    
    print("\n=== Starting Training ===")
    print("Configuration:")
    for k, v in config.items():
        print(f"  {k}: {v}")
    
    # Initialize model
    print("\nInitializing model...")
    model = YOLO(config['model'])
    
    # Train
    print("\nStarting training...")
    try:
        results = model.train(
            data=config['data'],
            epochs=config['epochs'],
            batch=config['batch'],
            imgsz=config['imgsz'],
            device=config['device'],
            workers=config['workers'],
            project=config['project'],
            name=config['name'],
            exist_ok=config['exist_ok'],
            patience=config['patience'],
            lr0=config['lr0'],
            lrf=config['lrf'],
            momentum=config['momentum'],
            weight_decay=config['weight_decay'],
            warmup_epochs=config['warmup_epochs'],
            warmup_momentum=config['warmup_momentum'],
            warmup_bias_lr=config['warmup_bias_lr'],
            label_smoothing=config['label_smoothing'],
            box=config['box'],
            cls=config['cls'],
            dfl=config['dfl'],
        )
        print("\nTraining completed successfully!")
    except Exception as e:
        print(f"\nError during training: {str(e)}")
        raise

if __name__ == "__main__":
    main()
