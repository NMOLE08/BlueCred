import os
import cv2
import torch
import numpy as np
from pathlib import Path
from tqdm import tqdm
import argparse
from process_drone_footage import DroneFootageProcessor
from torchvision import transforms

def process_underwater_video(model_path, yolo_model_path, video_path, output_dir, frame_skip=5):
    """
    Process underwater drone footage to estimate biomass.
    
    Args:
        model_path (str): Path to the trained CNN model
        yolo_model_path (str): Path to the YOLO model for object detection
        video_path (str): Path to the input video file
        output_dir (str): Directory to save the output video and results
        frame_skip (int): Process every nth frame to speed up processing
    """
    # Create output directory if it doesn't exist
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Initialize the processor
    processor = DroneFootageProcessor(
        cnn_model_path=model_path,
        yolo_model_path=yolo_model_path,
        device='cuda' if torch.cuda.is_available() else 'cpu'
    )
    
    # Open the video file
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")
    
    # Get video properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Prepare output video writer
    output_video_path = output_dir / f"processed_{Path(video_path).name}"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(
        str(output_video_path),
        fourcc,
        fps / frame_skip,  # Reduce frame rate by frame_skip
        (width, height)
    )
    
    print(f"Processing video: {video_path}")
    print(f"Resolution: {width}x{height}, FPS: {fps}, Total frames: {total_frames}")
    print(f"Processing 1 out of every {frame_skip} frames")
    
    # Process video frame by frame
    frame_count = 0
    processed_count = 0
    total_biomass = []
    
    with tqdm(total=total_frames) as pbar:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            # Process only every 'frame_skip' frames
            if frame_count % frame_skip == 0:
                # Process the frame
                processed_frame, biomass, _ = processor.process_frame(frame)
                total_biomass.append(biomass)
                
                # Write the processed frame to output video
                out.write(processed_frame)
                processed_count += 1
                
                # Display progress
                pbar.set_description(f"Frame {frame_count}/{total_frames} | Biomass: {biomass:.2f} kg")
            
            frame_count += 1
            pbar.update(1)
    
    # Release resources
    cap.release()
    out.release()
    
    # Calculate average biomass
    avg_biomass = np.mean(total_biomass) if total_biomass else 0
    
    print(f"\nProcessing complete!")
    print(f"Processed {processed_count} frames out of {total_frames}")
    print(f"Average biomass: {avg_biomass:.2f} kg")
    print(f"Output video saved to: {output_video_path}")

def main():
    # Default paths
    default_model_path = Path("output/best_cnn_model.pth")
    default_yolo_path = Path("yolov8n.pt")  # You may need to download this
    default_video_path = Path("practice/demo.mp4")
    default_output_dir = Path("output/processed_videos")
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Process underwater drone footage to estimate biomass.')
    parser.add_argument('--model', type=str, default=str(default_model_path),
                        help=f'Path to the trained CNN model (default: {default_model_path})')
    parser.add_argument('--yolo', type=str, default=str(default_yolo_path),
                        help=f'Path to the YOLO model (default: {default_yolo_path})')
    parser.add_argument('--video', type=str, default=str(default_video_path),
                        help=f'Path to the input video file (default: {default_video_path})')
    parser.add_argument('--output', type=str, default=str(default_output_dir),
                        help=f'Output directory for processed video (default: {default_output_dir})')
    parser.add_argument('--frame-skip', type=int, default=5,
                        help='Process every nth frame (default: 5)')
    
    args = parser.parse_args()
    
    # Process the video
    process_underwater_video(
        model_path=args.model,
        yolo_model_path=args.yolo,
        video_path=args.video,
        output_dir=args.output,
        frame_skip=args.frame_skip
    )

if __name__ == "__main__":
    main()
