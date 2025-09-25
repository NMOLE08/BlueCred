import os
import torch
from pathlib import Path
from torchvision import transforms
import matplotlib.pyplot as plt
import cv2
import numpy as np
from biomass_estimation import CNNRGB

def load_trained_model(model_path, device='cuda' if torch.cuda.is_available() else 'cpu'):
    """Load the trained CNN model."""
    model = CNNRGB()
    # Load the checkpoint
    checkpoint = torch.load(model_path, map_location=device)
    # Extract the model state dictionary
    if 'model_state_dict' in checkpoint:
        model.load_state_dict(checkpoint['model_state_dict'])
    else:
        # If the checkpoint is just the model state dict
        model.load_state_dict(checkpoint)
    model = model.to(device)
    model.eval()
    return model

def preprocess_image(image_path, target_size=(256, 256)):
    """Preprocess the image for model input."""
    # Read and resize image
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Could not read image at {image_path}")
    
    # Store original dimensions for visualization
    original_h, original_w = image.shape[:2]
    
    # Convert BGR to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Resize and normalize
    transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize(target_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                           std=[0.229, 0.224, 0.225])
    ])
    
    # Apply transformations and add batch dimension
    input_tensor = transform(image_rgb).unsqueeze(0)
    
    return input_tensor, (original_h, original_w), image_rgb

def predict_biomass(model, image_path, device='cuda' if torch.cuda.is_available() else 'cpu'):
    """Predict biomass for a single image."""
    # Preprocess the image
    input_tensor, original_size, original_image = preprocess_image(image_path)
    input_tensor = input_tensor.to(device)
    
    # Make prediction
    with torch.no_grad():
        prediction = model(input_tensor)
    
    # Get the scalar value
    prediction = prediction.item()
    
    return prediction, original_image, original_size

def visualize_prediction(image, prediction, original_size, output_path=None):
    """Visualize the prediction result."""
    plt.figure(figsize=(10, 8))
    
    # Display the original image
    plt.imshow(cv2.resize(image, (original_size[1], original_size[0])))
    
    # Add prediction text
    plt.title(f'Predicted Biomass: {prediction:.2f} kg/m²', fontsize=14, pad=20)
    plt.axis('off')
    
    # Save or show the result
    if output_path:
        plt.savefig(output_path, bbox_inches='tight', pad_inches=0.2, dpi=300)
        print(f"Visualization saved to {output_path}")
    else:
        plt.show()

def main():
    # Configuration
    MODEL_PATH = r"d:\ml_models\biomass-estimation\output\best_cnn_model.pth"
    PRACTICE_DIR = Path(r"d:\ml_models\biomass-estimation\practice")
    OUTPUT_DIR = Path(r"d:\ml_models\biomass-estimation\output\predictions")
    
    # Create output directory if it doesn't exist
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Set device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Load the trained model
    print("Loading model...")
    try:
        model = load_trained_model(MODEL_PATH, device)
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        return
    
    # Process each image in the practice directory
    image_extensions = ['.jpg', '.jpeg', '.png']
    image_paths = [f for f in PRACTICE_DIR.iterdir() if f.suffix.lower() in image_extensions]
    
    if not image_paths:
        print(f"No images found in {PRACTICE_DIR}")
        return
    
    print(f"\nFound {len(image_paths)} images to process:")
    for img_path in image_paths:
        print(f"- {img_path.name}")
    
    print("\nProcessing images...")
    for img_path in image_paths:
        try:
            print(f"\nProcessing {img_path.name}...")
            
            # Make prediction
            prediction, image, original_size = predict_biomass(model, img_path, device)
            print(f"Predicted biomass: {prediction:.2f} kg/m²")
            
            # Save visualization
            output_path = OUTPUT_DIR / f"{img_path.stem}_prediction.png"
            visualize_prediction(image, prediction, original_size, output_path)
            
        except Exception as e:
            print(f"Error processing {img_path.name}: {e}")
    
    print("\nAll images processed! Check the output directory for results.")

if __name__ == "__main__":
    main()
