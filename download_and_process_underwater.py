import os
import cv2
import torch
import numpy as np
import requests
from pathlib import Path
from tqdm import tqdm
import subprocess

# Configuration
OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)

# Underwater video URL - Public domain video from Pexels
VIDEO_URL = "https://assets.mixkit.co/videos/preview/mixkit-school-of-fish-swimming-in-clear-water-1586-large.mp4"
VIDEO_PATH = OUTPUT_DIR / "underwater_footage.mp4"
PROCESSED_VIDEO_PATH = OUTPUT_DIR / "processed_underwater_biomass.mp4"

class UnderwaterBiomassPredictor:
    def __init__(self, device=None):
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = self._load_model()
        
    def _load_model(self):
        """Load the trained CNN model."""
        from biomass_estimation import CNNRGB
        model_path = r"C:\ml_models\biomass-estimation\output\best_cnn_model.pth"
        model = CNNRGB().to(self.device)
        checkpoint = torch.load(model_path, map_location=self.device)
        model.load_state_dict(checkpoint['model_state_dict'])
        model.eval()
        return model
    
    def preprocess_image(self, image):
        """Preprocess image for the CNN model."""
        from torchvision import transforms
        transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((256, 256)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                              std=[0.229, 0.224, 0.225])
        ])
        return transform(image).unsqueeze(0).to(self.device)
    
    def predict_biomass(self, image):
        """Predict biomass for a single image."""
        with torch.no_grad():
            input_tensor = self.preprocess_image(image)
            prediction = self.model(input_tensor)
        return prediction.item()

def download_video(url, output_path):
    """Download video from URL with progress bar."""
    if output_path.exists():
        print(f"Video already exists at {output_path}")
        return True
    
    print(f"Downloading video from {url}...")
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        block_size = 1024  # 1 Kibibyte
        progress_bar = tqdm(total=total_size, unit='iB', unit_scale=True)
        
        with open(output_path, 'wb') as f:
            for data in response.iter_content(block_size):
                progress_bar.update(len(data))
                f.write(data)
        
        progress_bar.close()
        return True
    except Exception as e:
        print(f"Error downloading video: {e}")
        return False

def process_video(input_path, output_path, max_frames=300):
    """Process underwater video to predict biomass."""
    # Initialize predictor
    predictor = UnderwaterBiomassPredictor()
    
    # Open video
    cap = cv2.VideoCapture(str(input_path))
    if not cap.isOpened():
        print(f"Error: Could not open video {input_path}")
        return
    
    # Get video properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    # Initialize video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
    
    frame_count = 0
    total_biomass = 0
    
    print("\nProcessing video...")
    while cap.isOpened() and frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Make prediction
        biomass = predictor.predict_biomass(frame)
        total_biomass += biomass
        
        # Add prediction to frame
        cv2.putText(
            frame, 
            f"Biomass: {biomass:.2f} kg", 
            (20, 40), 
            cv2.FONT_HERSHEY_SIMPLEX, 
            1, 
            (0, 255, 0), 
            2
        )
        
        # Write frame to output video
        out.write(frame)
        frame_count += 1
        
        # Show progress
        if frame_count % 10 == 0:
            print(f"Processed {frame_count} frames - Current biomass: {biomass:.2f} kg")
    
    # Release resources
    cap.release()
    out.release()
    
    # Calculate average biomass
    avg_biomass = total_biomass / frame_count if frame_count > 0 else 0
    
    print("\nProcessing complete!")
    print(f"Total frames processed: {frame_count}")
    print(f"Average biomass per frame: {avg_biomass:.2f} kg")
    print(f"Processed video saved to: {output_path}")
    
    return avg_biomass

def main():
    # Download underwater video
    if not download_video(VIDEO_URL, VIDEO_PATH):
        print("Failed to download video. Using sample video if available.")
        if not VIDEO_PATH.exists():
            print("No video file found. Please check the URL or provide a local video.")
            return
    
    # Process the video
    process_video(VIDEO_PATH, PROCESSED_VIDEO_PATH)
    
    print("\nTo view the processed video, open:")
    print(f"{PROCESSED_VIDEO_PATH.absolute()}")

if __name__ == "__main__":
    main()
