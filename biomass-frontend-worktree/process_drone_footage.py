import os
import cv2
import torch
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from tqdm import tqdm
from PIL import Image
import tempfile
from ultralytics import YOLO
from torchvision import transforms

class DroneFootageProcessor:
    def __init__(self, cnn_model_path, yolo_model_path, device=None):
        """Initialize the drone footage processor."""
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Load models
        self.cnn_model = self._load_cnn_model(cnn_model_path)
        self.yolo_model = YOLO(yolo_model_path)
        
        # Set up YOLO parameters
        self.yolo_model.conf = 0.25  # Confidence threshold
        self.yolo_model.iou = 0.45   # NMS IoU threshold
        
    def _load_cnn_model(self, model_path):
        """Load the trained CNN model."""
        from biomass_estimation import CNNRGB
        model = CNNRGB().to(self.device)
        checkpoint = torch.load(model_path, map_location=self.device)
        model.load_state_dict(checkpoint['model_state_dict'])
        model.eval()
        return model
    
    def preprocess_image(self, image, size=(256, 256)):
        """Preprocess image for the CNN model."""
        transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize(size),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                              std=[0.229, 0.224, 0.225])
        ])
        return transform(image).unsqueeze(0).to(self.device)
    
    def predict_biomass(self, image):
        """Predict biomass for a single cropped tree image."""
        with torch.no_grad():
            input_tensor = self.preprocess_image(image)
            prediction = self.cnn_model(input_tensor)
        return prediction.item()
    
    def process_frame(self, frame):
        """Process a single frame to detect trees and predict biomass."""
        # Convert BGR to RGB for YOLO
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Run YOLO detection
        results = self.yolo_model(rgb_frame)
        
        total_biomass = 0
        detections = []
        
        # Process each detected tree
        for result in results[0].boxes.xyxy.cpu().numpy():
            x1, y1, x2, y2 = map(int, result[:4])
            
            # Extract the tree region
            tree_img = frame[y1:y2, x1:x2]
            if tree_img.size == 0:
                continue
                
            # Predict biomass
            biomass = self.predict_biomass(tree_img)
            total_biomass += biomass
            
            # Store detection info
            detections.append({
                'bbox': (x1, y1, x2, y2),
                'biomass': biomass
            })
            
            # Draw bounding box and biomass
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, f"{biomass:.1f}kg", (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Add total biomass to frame
        cv2.putText(frame, f"Total Biomass: {total_biomass:.1f}kg", 
                   (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        
        return frame, total_biomass, detections
    
    def process_video(self, video_path, output_path=None, max_frames=None):
        """Process a video file and return biomass predictions."""
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
        
        # Get video properties
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        if max_frames:
            total_frames = min(total_frames, max_frames)
        
        # Prepare video writer if output path is provided
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        frame_count = 0
        total_biomass = 0
        
        # Process each frame
        with tqdm(total=total_frames, desc="Processing video") as pbar:
            while cap.isOpened() and frame_count < total_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process frame
                processed_frame, frame_biomass, _ = self.process_frame(frame)
                total_biomass += frame_biomass
                
                # Write frame to output video
                if output_path:
                    out.write(processed_frame)
                
                frame_count += 1
                pbar.update(1)
        
        # Release resources
        cap.release()
        if output_path:
            out.release()
        
        # Calculate average biomass per frame
        avg_biomass = total_biomass / frame_count if frame_count > 0 else 0
        
        return {
            'total_frames': frame_count,
            'total_biomass': total_biomass,
            'avg_biomass_per_frame': avg_biomass
        }

def generate_sample_footage(output_path, duration=10, fps=30):
    """Generate a sample drone footage for testing."""
    width, height = 1920, 1080
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    total_frames = duration * fps
    
    for i in range(total_frames):
        # Create a green background (forest)
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        frame[:, :] = (0, 100, 0)  # Dark green
        
        # Add some trees (circles) that move slightly
        for j in range(10):
            x = int(width * 0.1 + (width * 0.8) * (i + j * 100) / (total_frames + 1000))
            y = height // 2 + int(100 * np.sin(i / 20 + j))
            size = 20 + int(10 * np.sin(i / 30 + j))
            cv2.circle(frame, (x, y), size, (0, 200, 0), -1)
        
        out.write(frame)
    
    out.release()
    print(f"Generated sample footage: {output_path}")

def main():
    # Configuration
    CNN_MODEL_PATH = r"C:\ml_models\biomass-estimation\output\best_cnn_model.pth"
    YOLO_MODEL_PATH = r"C:\ml_models\object-detection\BlueCred\runs\train\mangrove_optimized_v2\weights\best.pt"
    
    # Create output directory
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    
    # Generate sample footage if needed
    sample_footage = output_dir / "sample_drone_footage.mp4"
    if not sample_footage.exists():
        print("Generating sample drone footage...")
        generate_sample_footage(sample_footage, duration=5)  # 5-second sample
    
    # Initialize processor
    print("Initializing models...")
    processor = DroneFootageProcessor(
        cnn_model_path=CNN_MODEL_PATH,
        yolo_model_path=YOLO_MODEL_PATH
    )
    
    # Process the video
    output_video = output_dir / "processed_footage.mp4"
    print(f"\nProcessing video: {sample_footage}")
    results = processor.process_video(
        video_path=sample_footage,
        output_path=output_video,
        max_frames=150  # Process first 5 seconds (30fps * 5s = 150 frames)
    )
    
    # Print results
    print("\nProcessing complete!")
    print(f"Total frames processed: {results['total_frames']}")
    print(f"Total biomass detected: {results['total_biomass']:.2f} kg")
    print(f"Average biomass per frame: {results['avg_biomass_per_frame']:.2f} kg")
    print(f"\nProcessed video saved to: {output_video}")
    
    # Show a sample frame
    cap = cv2.VideoCapture(str(output_video))
    if cap.isOpened():
        ret, frame = cap.read()
        if ret:
            plt.figure(figsize=(12, 8))
            plt.imshow(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            plt.axis('off')
            plt.title("Sample Frame with Biomass Predictions")
            plt.show()
        cap.release()

if __name__ == "__main__":
    from torchvision import transforms
    main()
