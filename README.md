# Blue Carbon Ecosystem Monitoring with Deep Learning

This project provides a deep learning solution for monitoring blue carbon ecosystems using satellite/drone imagery. It includes tools for training and deploying segmentation models to identify and quantify blue carbon vegetation in aerial imagery.

## Features

- **Semantic Segmentation**: U-Net based model for pixel-wise classification of blue carbon vegetation
- **Data Augmentation**: Extensive data augmentation pipeline for robust model training
- **Model Training**: End-to-end training pipeline with checkpointing and learning rate scheduling
- **Inference**: Easy-to-use tools for making predictions on new images
- **Evaluation**: Comprehensive metrics including IoU, F1-score, precision, and recall

## Project Structure

```
blue_carbon_segmentation/
├── config/                  # Configuration files
│   └── config.yaml          # Main configuration
├── data/                    # Data directory
│   ├── raw/                 # Raw images and masks
│   │   ├── images/          # Input images
│   │   └── masks/           # Ground truth masks
│   ├── processed/           # Processed data
│   └── annotations/         # Annotation files
├── models/                  # Trained models and checkpoints
├── notebooks/               # Jupyter notebooks for exploration
├── src/                     # Source code
│   ├── data/                # Data loading and preprocessing
│   │   └── dataset.py       # Dataset class and data loaders
│   ├── models/              # Model definitions
│   │   └── model.py         # Segmentation model
│   └── utils/               # Utility functions
├── train.py                 # Training script
└── predict.py               # Inference script
```

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd blue_carbon_segmentation
   ```

2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Data Preparation

1. Organize your data in the following structure:
   ```
   data/
   └── raw/
       ├── images/       # Input images (.jpg, .png, .tif)
       └── masks/        # Corresponding mask images (same name as images with _mask suffix)
   ```

2. Masks should be binary (0 for background, 255 for blue carbon vegetation).

## Training

1. Configure the training parameters in `config/config.yaml`.

2. Start training:
   ```bash
   python src/train.py
   ```

   Training progress will be logged and checkpoints will be saved in the `models/` directory.

## Inference

To make predictions on new images:

```bash
python src/predict.py --model path/to/checkpoint.pth --image path/to/image.jpg --output output.png
```

## Model Architecture

The model is based on a U-Net architecture with a ResNet34 encoder pre-trained on ImageNet. The decoder uses skip connections to combine low-level and high-level features for precise segmentation.

## Evaluation Metrics

- **IoU (Intersection over Union)**: Measures the overlap between predicted and ground truth masks
- **F1-Score**: Harmonic mean of precision and recall
- **Precision**: Ratio of true positives to all positive predictions
- **Recall**: Ratio of true positives to all actual positives

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with PyTorch and segmentation_models.pytorch
- Inspired by research in remote sensing and environmental monitoring
