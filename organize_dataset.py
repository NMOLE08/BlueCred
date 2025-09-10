import os
import shutil
from pathlib import Path
import random
from tqdm import tqdm

def organize_dataset(source_dir, target_dir, val_ratio=0.1):
    """
    Organize the dataset into the standard YOLO format
    
    Args:
        source_dir (str): Path to the source dataset directory
        target_dir (str): Path to the target directory where organized dataset will be saved
        val_ratio (float): Ratio of data to use for validation (0-1)
    """
    # Create target directories
    dirs = {
        'images': {
            'train': os.path.join(target_dir, 'images', 'train'),
            'val': os.path.join(target_dir, 'images', 'val')
        },
        'labels': {
            'train': os.path.join(target_dir, 'labels', 'train'),
            'val': os.path.join(target_dir, 'labels', 'val')
        }
    }
    
    # Create all necessary directories
    for split in ['train', 'val']:
        os.makedirs(dirs['images'][split], exist_ok=True)
        os.makedirs(dirs['labels'][split], exist_ok=True)
    
    # Get all image files from the source directory
    source_train_dir = os.path.join(source_dir, 'train')
    source_valid_dir = os.path.join(source_dir, 'valid')
    
    # Process training data
    print("Processing training data...")
    process_split(source_train_dir, dirs, 'train')
    
    # Process validation data
    print("\nProcessing validation data...")
    process_split(source_valid_dir, dirs, 'val')
    
    print("\nDataset organization complete!")
    print(f"Organized dataset saved to: {os.path.abspath(target_dir)}")

def process_split(source_dir, target_dirs, split):
    """Process a single split (train/val/test) of the dataset"""
    source_images_dir = os.path.join(source_dir, 'images')
    source_labels_dir = os.path.join(source_dir, 'labels')
    
    # Get all image files
    image_files = [f for f in os.listdir(source_images_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    # Copy files to target directories
    for img_file in tqdm(image_files, desc=f"Processing {split} images"):
        # Construct full paths
        src_img = os.path.join(source_images_dir, img_file)
        dst_img = os.path.join(target_dirs['images'][split], img_file)
        
        # Copy image file
        shutil.copy2(src_img, dst_img)
        
        # Copy corresponding label file
        label_file = os.path.splitext(img_file)[0] + '.txt'
        src_label = os.path.join(source_labels_dir, label_file)
        dst_label = os.path.join(target_dirs['labels'][split], label_file)
        
        if os.path.exists(src_label):
            shutil.copy2(src_label, dst_label)

def verify_structure(dataset_dir):
    """Verify the dataset structure"""
    required_dirs = [
        'images/train',
        'images/val',
        'labels/train',
        'labels/val'
    ]
    
    all_ok = True
    for rel_path in required_dirs:
        full_path = os.path.join(dataset_dir, rel_path)
        if not os.path.exists(full_path):
            print(f"[MISSING] {full_path}")
            all_ok = False
        else:
            num_files = len([f for f in os.listdir(full_path) if os.path.isfile(os.path.join(full_path, f))])
            print(f"[OK] {rel_path}: {num_files} files")
    
    if all_ok:
        print("\n[SUCCESS] Dataset structure is correct!")
    else:
        print("\n[ERROR] There are issues with the dataset structure.")

if __name__ == "__main__":
    # Define paths
    source_dataset = r"d:\\object-detection\\mangrove.v1i.yolov8"
    target_dataset = r"d:\\object-detection\\dataset"
    
    # Organize the dataset
    organize_dataset(source_dataset, target_dataset, val_ratio=0.1)
    
    # Verify the dataset structure
    print("\nVerifying dataset structure...")
    verify_structure(target_dataset)
