import os
import cv2
import torch
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from torchvision import transforms
from biomass_estimation import CNNRGB, BiomassEstimator

def load_and_preprocess_image(image_path, target_size=(256, 256)):
    """Load and preprocess a single image for prediction."""
    # Read and resize image
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Could not read image at {image_path}")
    
    # Convert BGR to RGB
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Store original dimensions for visualization
    original_h, original_w = image.shape[:2]
    
    # Resize and normalize
    transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize(target_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Apply transformations
    input_tensor = transform(image).unsqueeze(0)  # Add batch dimension
    
    return input_tensor, (original_h, original_w), image

def predict_single_image(model, image_path, device='cuda' if torch.cuda.is_available() else 'cpu'):
    """Make a prediction for a single image."""
    # Set model to evaluation mode
    model.eval()
    model = model.to(device)
    
    # Load and preprocess the image
    input_tensor, original_size, original_image = load_and_preprocess_image(image_path)
    input_tensor = input_tensor.to(device)
    
    # Make prediction
    with torch.no_grad():
        prediction = model(input_tensor)
    
    # Convert prediction to numpy array
    prediction = prediction.item()  # Get scalar value
    
    return prediction, original_image, original_size

def visualize_prediction(image, prediction, original_size, output_path=None):
    """Visualize the original image with the predicted biomass."""
    plt.figure(figsize=(10, 8))
    
    # Display the original image
    plt.imshow(cv2.resize(image, (original_size[1], original_size[0])))
    
    # Add prediction text
    plt.title(f'Predicted Biomass: {prediction:.2f} kg', fontsize=14, pad=20)
    plt.axis('off')
    
    # Save or show the result
    if output_path:
        plt.savefig(output_path, bbox_inches='tight', pad_inches=0.2, dpi=300)
        print(f"Visualization saved to {output_path}")
    else:
        plt.show()

def main():
    # Configuration
    MODEL_PATH = r"C:\ml_models\biomass-estimation\output\best_cnn_model.pth"
    YOLO_MODEL_PATH = r"C:\ml_models\object-detection\BlueCred\runs\train\mangrove_optimized_v2\weights\best.pt"
    
    # Get a sample image from the dataset
    data_dir = Path(r"C:\ml_models\biomass-estimation\data")
    
    # Find the first PNG image in the tiles directory
    sample_image = None
    tiles_dir = data_dir / 'tiles'
    if tiles_dir.exists():
        for root, _, files in os.walk(tiles_dir):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                    sample_image = Path(root) / file
                    break
            if sample_image:
                break
    
    if not sample_image or not sample_image.exists():
        print("Could not find a sample image in the dataset. Please provide the path to an image.")
        return
    
    print(f"Using sample image: {sample_image}")
    
    # Initialize the model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Load the model
    model = CNNRGB().to(device)
    checkpoint = torch.load(MODEL_PATH, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    
    # Make prediction
    prediction, original_image, original_size = predict_single_image(model, sample_image, device)
    
    # Create output directory if it doesn't exist
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    
    # Save visualization
    output_path = output_dir / 'single_prediction_visualization.png'
    visualize_prediction(original_image, prediction, original_size, output_path)
    
    print(f"\nPrediction complete!")
    print(f"Image: {sample_image}")
    print(f"Predicted Biomass: {prediction:.2f} kg")
    print(f"Visualization saved to: {output_path}")

if __name__ == "__main__":
    main()
