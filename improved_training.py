import yaml
from pathlib import Path
from ultralytics import YOLO
import torch
import os

def setup_environment():
    """Set up environment and verify requirements."""
    print("Setting up environment...")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # Create necessary directories
    os.makedirs('runs/train', exist_ok=True)
    os.makedirs('runs/val', exist_ok=True)

def train_stage1():
    """First stage training with class weights and basic augmentations."""
    print("\n=== Starting Stage 1 Training ===")
    
    # Load base config
    with open('train_config.yaml') as f:
        config = yaml.safe_load(f)
    
    # Modify config for stage 1
    config['name'] = 'stage1_training'
    config['epochs'] = 100  # Increased for better convergence
    config['loss'] = 'cross_entropy'  # Start with standard loss
    config['class_weights'] = True
    config['label_smoothing'] = 0.1  # Add label smoothing
    config['cos_lr'] = True  # Enable cosine learning rate schedule
    
    # Save stage 1 config
    with open('stage1_config.yaml', 'w') as f:
        yaml.dump(config, f)
    
    print("\nStage 1 Configuration:")
    print(yaml.dump(config, default_flow_style=False))
    
    # Initialize model
    print("\nInitializing model...")
    model = YOLO(config['model'])
    
    # Print model information
    print("\nModel Architecture:")
    model.info()
    
    # Train
    results = model.train(
        data=config['data'],
        epochs=config['epochs'],
        batch=config['batch'],
        imgsz=config['imgsz'],
        device=config['device'],
        workers=8,
        project=config['project'],
        name=config['name'],
        exist_ok=config['exist_ok'],
        **{k: v for k, v in config.items() if k in [
            'lr0', 'lrf', 'momentum', 'weight_decay',
            'warmup_epochs', 'warmup_momentum', 'warmup_bias_lr',
            'augment', 'hsv_h', 'hsv_s', 'hsv_v', 'degrees',
            'translate', 'scale', 'shear', 'perspective',
            'flipud', 'fliplr', 'mosiac', 'mixup',
            'class_weights', 'label_smoothing', 'cos_lr'
        ]}
    )
    
    return model

def train_stage2(model_path):
    """Second stage training with focal loss and advanced augmentations."""
    print("\n=== Starting Stage 2 Training ===")
    
    # Load base config
    with open('train_config.yaml') as f:
        config = yaml.safe_load(f)
    
    # Modify config for stage 2
    config['name'] = 'stage2_finetune'
    config['epochs'] = 50
    config['loss'] = 'focal'  # Switch to focal loss
    config['class_weights'] = True
    config['pretrained'] = False
    config['resume'] = False
    
    # Save stage 2 config
    with open('stage2_config.yaml', 'w') as f:
        yaml.dump(config, f)
    
    # Load best model from stage 1
    model = YOLO(model_path)
    
    # Train with focal loss
    results = model.train(
        data=config['data'],
        epochs=config['epochs'],
        batch=config['batch'],
        imgsz=config['imgsz'],
        device=config['device'],
        workers=8,
        project=config['project'],
        name=config['name'],
        exist_ok=config['exist_ok'],
        **{k: v for k, v in config.items() if k in [
            'lr0', 'lrf', 'momentum', 'weight_decay',
            'warmup_epochs', 'warmup_momentum', 'warmup_bias_lr',
            'augment', 'hsv_h', 'hsv_s', 'hsv_v', 'degrees',
            'translate', 'scale', 'shear', 'perspective',
            'flipud', 'fliplr', 'mosiac', 'mixup',
            'class_weights', 'label_smoothing', 'loss', 'cos_lr'
        ]}
    )
    
    return model

def main():
    # Setup environment
    setup_environment()
    
    # Stage 1: Train with class weights
    stage1_model = train_stage1()
    
    # Get best model from stage 1
    stage1_best = 'runs/train/stage1_training/weights/best.pt'
    
    # Stage 2: Fine-tune with focal loss
    train_stage2(stage1_best)
    
    print("\nTraining complete!")
    print("Stage 1 results: runs/train/stage1_training")
    print("Stage 2 results: runs/train/stage2_finetune")

if __name__ == "__main__":
    main()
