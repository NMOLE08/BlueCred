import os
import torch
import numpy as np
import cv2
import yaml
from pathlib import Path
from typing import List, Dict, Optional, Union
import matplotlib.pyplot as plt
import torch.nn.functional as F

from src.models.model import create_model
from src.data.dataset import get_transforms

class BlueCarbonPredictor:
    """Class for making predictions with a trained Blue Carbon segmentation model."""
    
    def __init__(self, checkpoint_path: str, device: str = None):
        """
        Initialize the predictor.
        
        Args:
            checkpoint_path: Path to the model checkpoint (.pth file)
            device: Device to run inference on ('cuda' or 'cpu')
        """
        # Load checkpoint
        checkpoint = torch.load(checkpoint_path, map_location='cpu')
        
        # Load config
        self.config = checkpoint['config']
        
        # Set device
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        
        # Create model
        self.model = create_model(self.config).to(self.device)
        
        # Load weights
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.eval()
        
        # Get transforms
        self.transform = get_transforms(
            image_size=self.config['data']['image_size'],
            is_train=False
        )
    
    def preprocess(self, image: np.ndarray) -> torch.Tensor:
        """
        Preprocess an image for inference.
        
        Args:
            image: Input image (BGR format, as from OpenCV)
            
        Returns:
            Preprocessed image tensor
        """
        # Convert BGR to RGB
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Apply transforms
        transformed = self.transform(image=image, mask=np.zeros_like(image[:, :, 0]))
        image_tensor = transformed['image'].unsqueeze(0).to(self.device)  # Add batch dimension
        
        return image_tensor
    
    def predict(self, image: Union[str, np.ndarray], threshold: float = 0.5) -> Dict:
        """
        Make a prediction on a single image.
        
        Args:
            image: Path to image or image array (BGR format)
            threshold: Threshold for binary classification
            
        Returns:
            Dictionary containing:
                - 'mask': Binary mask (numpy array)
                - 'confidence': Confidence scores (numpy array)
                - 'original_size': Original image dimensions (height, width)
        """
        # Load image if path is provided
        if isinstance(image, (str, Path)):
            image_path = str(image)
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not read image: {image_path}")
        
        # Store original dimensions
        original_size = image.shape[:2]  # (height, width)
        
        # Preprocess
        image_tensor = self.preprocess(image)
        
        # Make prediction
        with torch.no_grad():
            output = self.model(image_tensor)
            probs = torch.sigmoid(output).squeeze().cpu().numpy()
            
        # Resize to original size
        probs = cv2.resize(probs, (original_size[1], original_size[0]), 
                          interpolation=cv2.INTER_LINEAR)
        
        # Apply threshold
        mask = (probs > threshold).astype(np.uint8)
        
        return {
            'mask': mask,
            'confidence': probs,
            'original_size': original_size
        }
    
    def visualize_prediction(self, image: np.ndarray, prediction: Dict[str, np.ndarray], 
                           alpha: float = 0.5) -> np.ndarray:
        """
        Visualize the prediction on top of the original image.
        
        Args:
            image: Original image (BGR format)
            prediction: Prediction dictionary from predict()
            alpha: Transparency for the mask overlay
            
        Returns:
            Image with prediction overlay (BGR format)
        """
        # Create overlay
        overlay = image.copy()
        mask = prediction['mask']
        
        # Create colored mask (blue for blue carbon)
        mask_vis = np.zeros_like(image)
        mask_vis[mask == 1] = [255, 0, 0]  # Blue color for positive class
        
        # Add mask to image
        cv2.addWeighted(mask_vis, alpha, image, 1 - alpha, 0, overlay)
        
        # Add legend
        cv2.putText(overlay, 'Blue Carbon', (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        return overlay

def predict_image(model_path: str, image_path: str, output_path: str = None, 
                 threshold: float = 0.5):
    """
    Helper function to make and visualize predictions on a single image.
    
    Args:
        model_path: Path to the model checkpoint
        image_path: Path to the input image
        output_path: Path to save the output visualization (optional)
        threshold: Threshold for binary classification
    """
    # Initialize predictor
    predictor = BlueCarbonPredictor(model_path)
    
    # Load image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    # Make prediction
    prediction = predictor.predict(image, threshold=threshold)
    
    # Visualize
    result = predictor.visualize_prediction(image, prediction)
    
    # Save or show result
    if output_path:
        cv2.imwrite(output_path, result)
        print(f"Result saved to: {output_path}")
    else:
        # Convert BGR to RGB for matplotlib
        plt.figure(figsize=(12, 8))
        plt.imshow(cv2.cvtColor(result, cv2.COLOR_BGR2RGB))
        plt.axis('off')
        plt.tight_layout()
        plt.show()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Blue Carbon Segmentation Prediction')
    parser.add_argument('--model', type=str, required=True, 
                       help='Path to model checkpoint (.pth file)')
    parser.add_argument('--image', type=str, required=True, 
                       help='Path to input image')
    parser.add_argument('--output', type=str, default=None,
                       help='Path to save output image (optional)')
    parser.add_argument('--threshold', type=float, default=0.5,
                       help='Threshold for binary classification (default: 0.5)')
    
    args = parser.parse_args()
    
    predict_image(
        model_path=args.model,
        image_path=args.image,
        output_path=args.output,
        threshold=args.threshold
    )
