# Underwater Biomass Estimation Web Application

This project provides a web interface for estimating biomass from underwater drone footage using a CNN model for biomass prediction and YOLOv8 for object detection.

## Features

- Upload and process underwater video footage
- Real-time biomass estimation
- Object detection and tracking
- Interactive visualization of biomass data
- Downloadable reports

## Project Structure

```
biomass-estimation/
├── static/                  # Static files (CSS, JS, uploads, processed videos)
│   ├── css/                 # Custom styles
│   ├── js/                  # Frontend JavaScript
│   ├── uploads/             # Uploaded videos
│   └── processed/           # Processed videos with detections
├── templates/               # HTML templates
│   └── index.html           # Main application page
├── app.py                   # Flask application
├── biomass_estimation.py    # Biomass estimation model
├── process_drone_footage.py # Video processing utilities
├── requirements.txt         # Python dependencies
└── README.md                # This file
```

## Installation

1. Clone the repository (if not already done):
   ```bash
   git clone <repository-url>
   cd biomass-estimation
   ```

2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   # source venv/bin/activate
   ```

3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Download the YOLOv8 model (if not already present):
   ```bash
   # On Windows:
   curl -O https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt
   # On macOS/Linux:
   # wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt
   ```

## Running the Application

1. Start the Flask development server:
   ```bash
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

3. Use the web interface to:
   - Upload underwater video footage
   - View real-time processing progress
   - See biomass estimation results
   - Download processed videos and reports

## Usage Guide

1. **Uploading a Video**
   - Click "Browse Files" or drag and drop a video file onto the upload area
   - Supported formats: MP4, MOV, AVI (max 500MB)

2. **Processing**
   - The application will process the video frame by frame
   - You can see the progress in real-time
   - Processing can be stopped at any time using the "Stop Processing" button

3. **Viewing Results**
   - After processing, the video with object detections will be displayed
   - Biomass metrics and charts will be shown below the video
   - You can download the processed video or a detailed report

## Configuration

You can modify the following parameters in `app.py`:

- `UPLOAD_FOLDER`: Directory to store uploaded videos
- `PROCESSED_FOLDER`: Directory to store processed videos
- `MAX_CONTENT_LENGTH`: Maximum file size for uploads (in bytes)
- `frame_skip`: Number of frames to skip during processing (higher values = faster processing)

## Troubleshooting

- **Slow Processing**: Try increasing the `frame_skip` value in `app.py`
- **Memory Issues**: Process shorter video clips or lower the resolution
- **No Detections**: The model might not be trained for your specific underwater environment

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- YOLOv8 for object detection
- Flask for the web framework
- Tailwind CSS for styling

3. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. **Prepare your data**:
   - Place your drone images in the `data/tiles/` directory
   - Ensure `field_data.csv` contains the ground truth biomass values
   - Update the paths in `biomass_estimation.py` if necessary

2. **Run the pipeline**:
   ```bash
   python biomass_estimation.py
   ```

3. **Output**:
   - Trained Random Forest model will be saved in the `output/` directory
   - Feature importances and evaluation metrics will be displayed

## Customization

- **YOLO Model**: Update the `YOLO_MODEL_PATH` in `biomass_estimation.py` to use a different YOLO model
- **Feature Engineering**: Modify the `extract_features_for_image` method to include additional features
- **Model Parameters**: Adjust the Random Forest parameters in the `__init__` method of the `BiomassEstimator` class

## Dependencies

- Python 3.8+
- PyTorch
- OpenCV
- scikit-learn
- ultralytics (for YOLOv8)
- PyYAML
- joblib

## License

This project is licensed under the MIT License - see the LICENSE file for details.
