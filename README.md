# Mangrove Tree Detection using YOLOv8

This project implements a YOLOv8-based object detection system for identifying and counting mangrove trees in aerial drone imagery.

## Prerequisites

- Python 3.8 or higher
- CUDA-capable GPU (recommended) or CPU

## Installation

1. Clone this repository
2. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

## Dataset Preparation

Organize your dataset in the following structure:
```
dataset/
├── images/
│   ├── train/     # Training images
│   └── val/       # Validation images
└── labels/
    ├── train/     # YOLO format labels for training
    └── val/       # YOLO format labels for validation
```

## Configuration

Edit the `config.yaml` file to set your training parameters, dataset paths, and model architecture.

## Usage

### Training
To train the model:
```
python train_mangrove_detector.py --mode train --config config.yaml
```

### Evaluation
To evaluate the trained model:
```
python train_mangrove_detector.py --mode evaluate --config config.yaml
```

### Prediction
To run inference on an image:
```
python train_mangrove_detector.py --mode predict --image path/to/your/image.jpg --conf 0.25
```

## Outputs

- Trained models are saved in `runs/detect/train/`
- Prediction results are saved in `runs/detect/predict/`

## Model Performance

Monitor training progress using TensorBoard:
```
tensorboard --logdir runs/detect
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
