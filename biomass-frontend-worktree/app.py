import os
import json
import cv2
import torch
import numpy as np
from flask import Flask, render_template, Response, jsonify, request
from pathlib import Path
from process_drone_footage import DroneFootageProcessor
from torchvision import transforms
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['PROCESSED_FOLDER'] = 'static/processed'
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Create necessary directories
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)

# Global variables to store processing state
processing_state = {
    'is_processing': False,
    'current_frame': 0,
    'total_frames': 0,
    'biomass_data': [],
    'video_path': None,
    'processed_path': None
}

class VideoProcessor:
    def __init__(self, model_path, yolo_path):
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        # Ensure yolo_path is absolute
        if not os.path.isabs(yolo_path):
            yolo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), yolo_path)
        self.processor = DroneFootageProcessor(
            cnn_model_path=model_path,
            yolo_model_path=yolo_path,
            device=self.device
        )
        self.frame_skip = 5  # Process every 5th frame for better performance

    def process_video(self, video_path, output_path):
        global processing_state
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return False, "Error opening video file"
        
        # Get video properties
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Initialize video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        # Update processing state
        processing_state.update({
            'is_processing': True,
            'current_frame': 0,
            'total_frames': total_frames,
            'biomass_data': [],
            'video_path': video_path,
            'processed_path': output_path
        })
        
        frame_count = 0
        
        while cap.isOpened() and processing_state['is_processing']:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Process frame
            if frame_count % self.frame_skip == 0:
                # Convert BGR to RGB for processing
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Process frame through the model
                processed_frame, biomass, detections = self.processor.process_frame(rgb_frame)
                
                # Convert back to BGR for video writing
                bgr_frame = cv2.cvtColor(processed_frame, cv2.COLOR_RGB2BGR)
                
                # Store biomass data
                processing_state['biomass_data'].append({
                    'frame': frame_count,
                    'biomass': biomass,
                    'detections': len(detections)
                })
            else:
                bgr_frame = frame
            
            # Write frame to output video
            out.write(bgr_frame)
            
            # Update processing state
            processing_state['current_frame'] = frame_count
            frame_count += 1
            
            # Add a small delay to prevent freezing
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        # Release resources
        cap.release()
        out.release()
        cv2.destroyAllWindows()
        
        # Update processing state
        processing_state['is_processing'] = False
        
        return True, "Processing completed"

# Initialize video processor
processor = None

def init_processor():
    global processor
    # Get absolute paths to model files
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "output", "best_cnn_model.pth")
    yolo_path = os.path.join(base_dir, "yolov8n.pt")
    
    # Verify model files exist
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"CNN model not found at {model_path}")
    if not os.path.exists(yolo_path):
        raise FileNotFoundError(f"YOLO model not found at {yolo_path}")
        
    processor = VideoProcessor(model_path, yolo_path)
    print(f"Initialized VideoProcessor with models:\n- CNN: {model_path}\n- YOLO: {yolo_path}")

# Initialize processor when the app starts
try:
    init_processor()
    print("Successfully initialized models")
except Exception as e:
    print(f"Error initializing models: {str(e)}")
    raise

@app.route('/')
def index():
    # Path to the demo video
    demo_video_path = os.path.join('practice', 'demo.mp4')
    
    # Check if demo video exists
    if not os.path.exists(demo_video_path):
        return "Demo video not found. Please ensure demo.mp4 exists in the practice directory."
    
    # Copy demo video to static folder if not already there
    static_demo_path = os.path.join('static', 'demo', 'demo.mp4')
    os.makedirs(os.path.dirname(static_demo_path), exist_ok=True)
    
    import shutil
    if not os.path.exists(static_demo_path):
        shutil.copy2(demo_video_path, static_demo_path)
    
    # Render template with demo video path
    return render_template('index.html', demo_video=f'/static/demo/demo.mp4')

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        # Always use the demo video
        demo_video_path = os.path.join('static', 'demo', 'demo.mp4')
        
        # Check if demo video exists
        if not os.path.exists(demo_video_path):
            return jsonify({'error': 'Demo video not found'}), 500
            
        # Return success response with demo video path
        return jsonify({
            'message': 'Using demo video',
            'original_video_url': '/static/demo/demo.mp4',
            'is_demo': True  # Flag to indicate this is a demo
        })
        
    except Exception as e:
        print(f"Error in upload handler: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/progress')
def get_progress():
    # For demo purposes, always return fixed values
    response_data = {
        'is_processing': False,  # Set to False to immediately show results
        'progress': 100,         # 100% progress
        'current_frame': 100,    # Example frame count
        'total_frames': 100,     # Example total frames
        'original_video_url': '/static/demo/demo.mp4',
        'is_demo': True,         # Indicate this is a demo
        'avg_biomass': 8.0,      # Fixed average biomass for demo
        'total_biomass': 54.5,   # Fixed total biomass for demo
        'current_biomass': 8.0   # Current biomass (same as average for demo)
    }
    
    return jsonify(response_data)

@app.route('/stop_processing', methods=['POST'])
def stop_processing():
    global processing_state
    processing_state['is_processing'] = False
    return jsonify({'message': 'Processing stopped'})

if __name__ == '__main__':
    app.run(debug=True, threaded=True)
