import os
import cv2
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict
import argparse

class DataValidator:
    """Class to validate and organize image segmentation data."""
    
    def __init__(self, data_dir: str = 'data'):
        """
        Initialize the DataValidator.
        
        Args:
            data_dir: Root directory containing 'raw/images' and 'raw/masks' subdirectories
        """
        self.data_dir = Path(data_dir)
        self.images_dir = self.data_dir / 'raw' / 'images'
        self.masks_dir = self.data_dir / 'raw' / 'masks'
        self.supported_extensions = {'.jpg', '.jpeg', '.png', '.tif', '.tiff'}
        
    def check_directory_structure(self) -> bool:
        """Check if the required directory structure exists."""
        print(f"Checking if images directory exists: {self.images_dir}")
        if not self.images_dir.exists():
            print(f"Error: Images directory not found at {self.images_dir}")
            print(f"Current working directory: {os.getcwd()}")
            print(f"Directory contents: {os.listdir(os.path.dirname(str(self.images_dir)))}")
            return False
            
        print(f"Checking if masks directory exists: {self.masks_dir}")
        if not self.masks_dir.exists():
            print(f"Error: Masks directory not found at {self.masks_dir}")
            print(f"Current working directory: {os.getcwd()}")
            print(f"Directory contents: {os.listdir(os.path.dirname(str(self.masks_dir)))}")
            return False
            
        print("Both directories exist")
        return True
    
    def get_image_mask_pairs(self) -> List[Tuple[Path, Path]]:
        """
        Get a list of (image_path, mask_path) pairs.
        
        Returns:
            List of tuples containing (image_path, mask_path)
        """
        if not self.check_directory_structure():
            return []
            
        print("\nScanning for image and mask files...")
        image_files = []
        mask_files = []
        
        # Get all image files
        for ext in self.supported_extensions:
            print(f"Looking for {ext} files...")
            img_matches = list(self.images_dir.glob(f'*{ext}'))
            mask_matches = list(self.masks_dir.glob(f'*{ext}'))
            print(f"Found {len(img_matches)} image files and {len(mask_matches)} mask files with extension {ext}")
            image_files.extend(img_matches)
            mask_files.extend(mask_matches)
            
        print(f"\nTotal image files found: {len(image_files)}")
        print(f"Total mask files found: {len(mask_files)}")
        
        if not image_files:
            print("\nNo image files found with supported extensions. Supported extensions are:", self.supported_extensions)
            print("Example of files found in images directory:", list(self.images_dir.glob('*'))[:5])
            
        if not mask_files:
            print("\nNo mask files found with supported extensions. Supported extensions are:", self.supported_extensions)
            print("Example of files found in masks directory:", list(self.masks_dir.glob('*'))[:5])
        
        # Create pairs
        pairs = []
        missing_masks = []
        
        for img_path in image_files:
            # Try to find corresponding mask
            mask_path = self.masks_dir / f"{img_path.stem}_mask{img_path.suffix}"
            if mask_path.exists():
                pairs.append((img_path, mask_path))
            else:
                missing_masks.append(img_path.name)
        
        return pairs, missing_masks
    
    def validate_pair(self, img_path: Path, mask_path: Path) -> Dict:
        """
        Validate a single image-mask pair.
        
        Args:
            img_path: Path to the image
            mask_path: Path to the corresponding mask
            
        Returns:
            Dictionary containing validation results
        """
        result = {
            'image': str(img_path),
            'mask': str(mask_path),
            'image_exists': img_path.exists(),
            'mask_exists': mask_path.exists(),
            'image_size': None,
            'mask_size': None,
            'mask_values': None,
            'is_valid': False
        }
        
        if not result['image_exists'] or not result['mask_exists']:
            return result
            
        try:
            # Read image and mask
            img = cv2.imread(str(img_path))
            mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
            
            if img is None or mask is None:
                return result
                
            result.update({
                'image_size': img.shape[:2],  # (height, width)
                'mask_size': mask.shape,
                'mask_values': np.unique(mask).tolist(),
                'is_valid': True
            })
            
        except Exception as e:
            print(f"Error processing {img_path}: {str(e)}")
            
        return result
    
    def validate_all(self) -> Dict:
        """
        Validate all image-mask pairs in the dataset.
        
        Returns:
            Dictionary containing validation results
        """
        if not self.check_directory_structure():
            return {'valid': False, 'message': 'Invalid directory structure'}
            
        pairs, missing_masks = self.get_image_mask_pairs()
        
        if not pairs:
            return {'valid': False, 'message': 'No valid image-mask pairs found'}
            
        results = []
        valid_count = 0
        
        for img_path, mask_path in pairs:
            result = self.validate_pair(img_path, mask_path)
            results.append(result)
            if result['is_valid']:
                valid_count += 1
        
        # Calculate statistics
        stats = {
            'total_pairs': len(pairs),
            'valid_pairs': valid_count,
            'invalid_pairs': len(pairs) - valid_count,
            'missing_masks': len(missing_masks),
            'valid': valid_count > 0
        }
        
        return {
            'stats': stats,
            'results': results,
            'missing_masks': missing_masks
        }
    
    def generate_report(self, validation_result: Dict) -> str:
        """Generate a human-readable report from validation results."""
        if not validation_result.get('valid', False):
            return "Validation failed. No valid image-mask pairs found."
            
        stats = validation_result['stats']
        missing_masks = validation_result.get('missing_masks', [])
        
        report = [
            "=" * 50,
            "DATA VALIDATION REPORT",
            "=" * 50,
            f"Total image-mask pairs: {stats['total_pairs']}",
            f"Valid pairs: {stats['valid_pairs']}",
            f"Invalid pairs: {stats['invalid_pairs']}",
            f"Images missing masks: {len(missing_masks)}",
            ""
        ]
        
        # Add sample validation results
        if validation_result['results']:
            sample = validation_result['results'][0]
            report.extend([
                "-" * 50,
                "SAMPLE VALIDATION",
                "-" * 50,
                f"Image: {sample['image']}",
                f"Mask: {sample['mask']}",
                f"Image size: {sample.get('image_size', 'N/A')}",
                f"Mask size: {sample.get('mask_size', 'N/A')}",
                f"Mask values: {sample.get('mask_values', 'N/A')}",
                ""
            ])
        
        # Add missing masks if any
        if missing_masks:
            report.extend([
                "-" * 50,
                "MISSING MASKS",
                "-" * 50,
                *[f"- {img}" for img in missing_masks[:10]],
                f"... and {len(missing_masks) - 10} more" if len(missing_masks) > 10 else ""
            ])
        
        return "\n".join(filter(None, report))


def main():
    parser = argparse.ArgumentParser(description='Validate image segmentation dataset')
    parser.add_argument('--data-dir', type=str, default='data',
                       help='Root directory containing raw/images and raw/masks')
    args = parser.parse_args()
    
    validator = DataValidator(args.data_dir)
    result = validator.validate_all()
    
    if not result.get('valid', False):
        print("Validation failed. Please check the data directory structure.")
        print(f"Expected structure:")
        print(f"{args.data_dir}/raw/images/")
        print(f"{args.data_dir}/raw/masks/")
        return
    
    report = validator.generate_report(result)
    print(report)
    
    # Save report
    report_path = Path(args.data_dir) / 'validation_report.txt'
    with open(report_path, 'w') as f:
        f.write(report)
    
    print(f"\nFull validation report saved to: {report_path}")


if __name__ == "__main__":
    main()
