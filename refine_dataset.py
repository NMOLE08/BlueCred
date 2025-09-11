import os
import yaml
import shutil
import random
import cv2
import numpy as np
from pathlib import Path
from tqdm import tqdm
from collections import defaultdict

# Configuration
DATA_YAML = 'mangrove_data.yaml'
OUTPUT_DIR = 'refined_dataset'
TRAIN_RATIO = 0.8
VAL_RATIO = 0.1
TEST_RATIO = 0.1
MIN_BOX_SIZE = 5  # Minimum object size in pixels
MIN_SAMPLES_PER_CLASS = 20  # Minimum samples per class

def load_yaml(yaml_path):
    with open(yaml_path) as f:
        return yaml.safe_load(f)

def analyze_dataset(data_yaml):
    # Load dataset info
    data = load_yaml(data_yaml)
    
    # Initialize counters
    stats = {
        'total_images': 0,
        'class_counts': defaultdict(int),
        'small_boxes': 0,
        'missing_labels': 0,
        'image_sizes': [],
        'class_distribution': defaultdict(int)
    }
    
    # Check train/val/test splits
    for split in ['train', 'val', 'test']:
        img_dir = data[split].replace('images', '')
        label_dir = img_dir.replace('images', 'labels')
        
        if not os.path.exists(img_dir) or not os.path.exists(label_dir):
            print(f"Warning: Missing directory for {split} split")
            continue
            
        # Process each image
        for img_file in tqdm(os.listdir(img_dir), desc=f"Analyzing {split}"):
            if not img_file.lower().endswith(('.png', '.jpg', '.jpeg')):
                continue
                
            txt_file = os.path.splitext(img_file)[0] + '.txt'
            txt_path = os.path.join(label_dir, txt_file)
            
            if not os.path.exists(txt_path):
                stats['missing_labels'] += 1
                continue
                
            stats['total_images'] += 1
            
            # Read image dimensions
            img_path = os.path.join(img_dir, img_file)
            try:
                img = cv2.imread(img_path)
                if img is None:
                    continue
                h, w = img.shape[:2]
                stats['image_sizes'].append((w, h))
            except Exception as e:
                print(f"Error reading {img_path}: {e}")
                continue
            
            # Read annotations
            with open(txt_path, 'r') as f:
                lines = f.readlines()
                
            for line in lines:
                parts = line.strip().split()
                if len(parts) != 5:
                    continue
                    
                cls_id = int(parts[0])
                x_center, y_center, box_w, box_h = map(float, parts[1:])
                
                # Convert to pixel coordinates
                box_w_px = box_w * w
                box_h_px = box_h * h
                
                # Update stats
                stats['class_counts'][cls_id] += 1
                stats['class_distribution'][split] += 1
                
                if box_w_px < MIN_BOX_SIZE or box_h_px < MIN_BOX_SIZE:
                    stats['small_boxes'] += 1
    
    return stats, data

def create_refined_dataset(data, stats):
    # Create output directories
    splits = ['train', 'val', 'test']
    for split in splits:
        os.makedirs(os.path.join(OUTPUT_DIR, split, 'images'), exist_ok=True)
        os.makedirs(os.path.join(OUTPUT_DIR, split, 'labels'), exist_ok=True)
    
    # Process each split
    for split in splits:
        if split not in data:
            continue
            
        img_dir = data[split].replace('images', '')
        label_dir = img_dir.replace('images', 'labels')
        
        if not os.path.exists(img_dir) or not os.path.exists(label_dir):
            continue
            
        # Process each image
        for img_file in tqdm(os.listdir(img_dir), desc=f"Processing {split}"):
            if not img_file.lower().endswith(('.png', '.jpg', '.jpeg')):
                continue
                
            img_path = os.path.join(img_dir, img_file)
            txt_file = os.path.splitext(img_file)[0] + '.txt'
            txt_path = os.path.join(label_dir, txt_file)
            
            if not os.path.exists(txt_path):
                continue
                
            # Read and filter annotations
            valid_annotations = []
            with open(txt_path, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) == 5:
                        cls_id = int(parts[0])
                        # Filter out small objects and rare classes
                        if stats['class_counts'].get(cls_id, 0) >= MIN_SAMPLES_PER_CLASS:
                            valid_annotations.append(line)
            
            # Only keep images with valid annotations
            if valid_annotations:
                # Copy image
                shutil.copy2(img_path, os.path.join(OUTPUT_DIR, split, 'images', img_file))
                # Save filtered annotations
                with open(os.path.join(OUTPUT_DIR, split, 'labels', txt_file), 'w') as f:
                    f.writelines(valid_annotations)
    
    # Create new data.yaml
    new_data = {
        'train': f'{OUTPUT_DIR}/train/images',
        'val': f'{OUTPUT_DIR}/val/images',
        'test': f'{OUTPUT_DIR}/test/images',
        'nc': data['nc'],
        'names': data['names']
    }
    
    with open(os.path.join(OUTPUT_DIR, 'data.yaml'), 'w') as f:
        yaml.dump(new_data, f)
    
    return new_data

def print_stats(stats, data):
    print("\n=== Dataset Analysis ===")
    print(f"Total images: {stats['total_images']}")
    print(f"Missing labels: {stats['missing_labels']}")
    print(f"Small boxes (<{MIN_BOX_SIZE}px): {stats['small_boxes']}")
    
    print("\nClass distribution:")
    for cls_id, count in sorted(stats['class_counts'].items()):
        cls_name = data['names'][cls_id] if 'names' in data and cls_id < len(data['names']) else f'class_{cls_id}'
        print(f"  {cls_name}: {count} instances")
    
    print("\nSplit distribution:")
    for split, count in stats['class_distribution'].items():
        print(f"  {split}: {count} instances")
    
    if stats['image_sizes']:
        avg_w = sum(w for w, h in stats['image_sizes']) / len(stats['image_sizes'])
        avg_h = sum(h for w, h in stats['image_sizes']) / len(stats['image_sizes'])
        print(f"\nAverage image size: {avg_w:.0f}x{avg_h:.0f}")

def main():
    print("Analyzing dataset...")
    stats, data = analyze_dataset(DATA_YAML)
    print_stats(stats, data)
    
    print("\nCreating refined dataset...")
    new_data = create_refined_dataset(data, stats)
    
    print(f"\nRefined dataset created at: {os.path.abspath(OUTPUT_DIR)}")
    print(f"New data.yaml created at: {os.path.abspath(os.path.join(OUTPUT_DIR, 'data.yaml'))}")

if __name__ == "__main__":
    main()
