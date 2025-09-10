import os
import shutil
import random
import numpy as np
from pathlib import Path
import cv2
import yaml
from tqdm import tqdm

class MinorityClassAugmentor:
    def __init__(self, data_yaml, target_instances=1000):  # Reduced target instances to save space
        with open(data_yaml) as f:
            self.data = yaml.safe_load(f)
        
        self.target_instances = target_instances
        self.class_names = self.data['names']
        self.img_dir = Path(self.data.get('path', 'dataset'))
        self.label_dir = self.img_dir / 'labels'
        self.img_train_dir = self.img_dir / 'images/train'
        self.label_train_dir = self.img_dir / 'labels/train'
        
        # Create augmented data directories
        self.aug_img_dir = self.img_dir / 'images/augmented'
        self.aug_label_dir = self.img_dir / 'labels/augmented'
        self.aug_img_dir.mkdir(parents=True, exist_ok=True)
        self.aug_label_dir.mkdir(parents=True, exist_ok=True)
        
    def get_class_distribution(self):
        """Get current class distribution."""
        class_counts = {i: 0 for i in range(len(self.class_names))}
        
        for label_file in self.label_train_dir.glob('*.txt'):
            with open(label_file) as f:
                for line in f:
                    if line.strip():
                        class_id = int(line.split()[0])
                        class_counts[class_id] += 1
        
        return class_counts
    
    def augment_image(self, img_path, label_path, class_id):
        """Apply augmentations to minority class instances."""
        img = cv2.imread(str(img_path))
        if img is None:
            return None, None
            
        h, w = img.shape[:2]
        
        # Read original labels
        with open(label_path) as f:
            labels = [list(map(float, line.strip().split())) for line in f if line.strip()]
        
        # Filter for target class
        target_labels = [l for l in labels if int(l[0]) == class_id]
        if not target_labels:
            return None, None
            
        # Randomly select a target instance
        target = random.choice(target_labels)
        
        # Get bounding box coordinates (normalized to [0,1])
        _, x, y, bw, bh = target
        
        # Convert to pixel coordinates
        x1 = int((x - bw/2) * w)
        y1 = int((y - bh/2) * h)
        x2 = int((x + bw/2) * w)
        y2 = int((y + bh/2) * h)
        
        # Ensure coordinates are within image bounds
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w-1, x2), min(h-1, y2)
        
        # Extract ROI
        roi = img[y1:y2, x1:x2]
        
        # Apply augmentations
        if random.random() > 0.5:
            roi = cv2.flip(roi, 1)  # Horizontal flip
        
        # Random brightness/contrast
        alpha = random.uniform(0.7, 1.3)
        beta = random.randint(-30, 30)
        roi = cv2.convertScaleAbs(roi, alpha=alpha, beta=beta)
        
        # Random rotation
        if random.random() > 0.5:
            angle = random.uniform(-15, 15)
            M = cv2.getRotationMatrix2D((roi.shape[1]/2, roi.shape[0]/2), angle, 1)
            roi = cv2.warpAffine(roi, M, (roi.shape[1], roi.shape[0]))
        
        # Create new image with augmented ROI
        new_img = img.copy()
        new_img[y1:y1+roi.shape[0], x1:x1+roi.shape[1]] = roi
        
        # Generate new filename
        new_filename = f"aug_{class_id}_{img_path.stem}_{random.randint(0, 10000)}{img_path.suffix}"
        new_img_path = self.aug_img_dir / new_filename
        new_label_path = self.aug_label_dir / f"{new_filename}.txt"
        
        # Save augmented image
        cv2.imwrite(str(new_img_path), new_img)
        
        # Save labels (same as original for now)
        shutil.copy(label_path, new_label_path)
        
        return new_img_path, new_label_path
    
    def balance_classes(self):
        """Balance classes by augmenting minority classes."""
        # Clean up any existing augmented data
        if self.aug_img_dir.exists():
            print("Cleaning up existing augmented data...")
            shutil.rmtree(self.aug_img_dir, ignore_errors=True)
            shutil.rmtree(self.aug_label_dir, ignore_errors=True)
            self.aug_img_dir.mkdir(parents=True, exist_ok=True)
            self.aug_label_dir.mkdir(parents=True, exist_ok=True)
        
        class_counts = self.get_class_distribution()
        print("\nCurrent class distribution:")
        for i, count in class_counts.items():
            print(f"{self.class_names[i]}: {count} instances")
        
        # Find minority classes (less than target_instances)
        # Focus only on the most problematic classes (2 and 4)
        minority_classes = [2, 4]  # Only target the worst performing classes
        
        print(f"\nAugmenting minority classes: {[self.class_names[i] for i in minority_classes]}")
        
        for class_id in minority_classes:
            print(f"\nAugmenting class {class_id} ({self.class_names[class_id]})...")
            
            # Find all images containing this class
            class_images = []
            for label_file in self.label_train_dir.glob('*.txt'):
                with open(label_file) as f:
                    if any(int(line.split()[0]) == class_id for line in f if line.strip()):
                        img_file = self.img_train_dir / f"{label_file.stem}.jpg"
                        if img_file.exists():
                            class_images.append((img_file, label_file))
            
            # Calculate how many augmentations we need
            current_count = class_counts[class_id]
            needed = self.target_instances - current_count
            
            if needed <= 0:
                print(f"  Class {class_id} already has enough samples.")
                continue
                
            print(f"  Found {len(class_images)} images with class {class_id}")
            print(f"  Generating {needed} augmentations...")
            
            # Generate augmented samples
            for _ in tqdm(range(needed), desc=f"Class {class_id}"):
                if not class_images:
                    print("  Warning: No more source images for this class")
                    break
                    
                img_path, label_path = random.choice(class_images)
                self.augment_image(img_path, label_path, class_id)
        
        print("\nAugmentation complete!")
        
        # Update data.yaml to include augmented data
        self.update_data_yaml()
    
    def update_data_yaml(self):
        """Update data.yaml to include augmented data."""
        # Copy original training images and labels to augmented dir
        for img_file in self.img_train_dir.glob('*.*'):
            shutil.copy(img_file, self.aug_img_dir / img_file.name)
        
        for label_file in self.label_train_dir.glob('*.txt'):
            shutil.copy(label_file, self.aug_label_dir / label_file.name)
        
        # Update data.yaml
        self.data['train'] = str(self.aug_img_dir.relative_to(self.img_dir))
        self.data['val'] = 'images/val'  # Keep original validation set
        
        with open(self.img_dir / 'data_augmented.yaml', 'w') as f:
            yaml.dump(self.data, f)
            
        print(f"\nUpdated dataset configuration saved to: {self.img_dir / 'data_augmented.yaml'}")

if __name__ == "__main__":
    augmentor = MinorityClassAugmentor('dataset/data.yaml', target_instances=2000)
    augmentor.balance_classes()
