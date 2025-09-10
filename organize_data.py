import os
import shutil
from pathlib import Path
import argparse
from typing import List, Tuple, Dict, Optional
import re

class DataOrganizer:
    """Class to organize image segmentation data into the required structure."""
    
    def __init__(self, source_dir: str, target_dir: str = 'data'):
        """
        Initialize the DataOrganizer.
        
        Args:
            source_dir: Directory containing source images and masks
            target_dir: Target directory for organized data (default: 'data')
        """
        self.source_dir = Path(source_dir)
        self.target_dir = Path(target_dir)
        self.images_dir = self.target_dir / 'raw' / 'images'
        self.masks_dir = self.target_dir / 'raw' / 'masks'
        self.supported_extensions = {'.jpg', '.jpeg', '.png', '.tif', '.tiff'}
        
        # Create target directories
        self.images_dir.mkdir(parents=True, exist_ok=True)
        self.masks_dir.mkdir(parents=True, exist_ok=True)
    
    def find_image_mask_pairs(self) -> Tuple[Dict[str, Path], List[Path], List[Path]]:
        """
        Find all image and mask files in the source directory.
        
        Returns:
            Tuple of (paired_files, unpaired_images, unpaired_masks)
        """
        image_files = []
        mask_files = []
        
        # Find all image and mask files
        for ext in self.supported_extensions:
            image_files.extend(list(self.source_dir.glob(f'**/*{ext}')))
            image_files.extend(list(self.source_dir.glob(f'**/*{ext.upper()}')))
        
        # Separate images and masks
        images = []
        masks = []
        
        for file in image_files:
            file_lower = str(file).lower()
            if any(term in file_lower for term in ['mask', 'label', 'gt', 'seg']):
                masks.append(file)
            else:
                images.append(file)
        
        # Try to pair images with masks
        paired = {}
        unpaired_images = []
        
        for img_path in images:
            # Try different naming patterns to find corresponding mask
            img_stem = img_path.stem
            
            # Common patterns for mask filenames
            possible_mask_names = [
                f"{img_stem}_mask{img_path.suffix}",
                f"{img_stem}_label{img_path.suffix}",
                f"{img_stem}_seg{img_path.suffix}",
                f"{img_stem}_gt{img_path.suffix}",
                f"mask_{img_stem}{img_path.suffix}",
                f"label_{img_stem}{img_path.suffix}",
                f"seg_{img_stem}{img_path.suffix}",
                f"gt_{img_stem}{img_path.suffix}",
            ]
            
            # Check all possible mask locations
            mask_found = False
            for mask_name in possible_mask_names:
                for mask_path in masks:
                    if mask_path.name.lower() == mask_name.lower():
                        paired[str(img_path)] = mask_path
                        mask_found = True
                        break
                if mask_found:
                    break
            
            if not mask_found:
                unpaired_images.append(img_path)
        
        # Find masks that weren't paired
        used_masks = set(paired.values())
        unpaired_masks = [m for m in masks if m not in used_masks]
        
        return paired, unpaired_images, unpaired_masks
    
    def copy_files(self, paired: Dict[str, Path], dry_run: bool = False) -> Dict:
        """
        Copy paired images and masks to the target directory.
        
        Args:
            paired: Dictionary mapping image paths to mask paths
            dry_run: If True, only show what would be done without making changes
            
        Returns:
            Dictionary with operation results
        """
        results = {
            'copied': 0,
            'skipped': 0,
            'errors': 0,
            'details': []
        }
        
        for img_src, mask_src in paired.items():
            img_src = Path(img_src)
            mask_src = Path(mask_src)
            
            # Create target filenames
            img_dst = self.images_dir / f"{img_src.stem}{img_src.suffix}"
            mask_dst = self.masks_dir / f"{img_src.stem}_mask{img_src.suffix}"
            
            try:
                if not dry_run:
                    # Copy image
                    if not img_dst.exists():
                        shutil.copy2(img_src, img_dst)
                    
                    # Copy and rename mask
                    if not mask_dst.exists():
                        shutil.copy2(mask_src, mask_dst)
                    
                    results['copied'] += 1
                    results['details'].append({
                        'status': 'copied',
                        'image': str(img_src),
                        'mask': str(mask_src),
                        'target_image': str(img_dst),
                        'target_mask': str(mask_dst)
                    })
                else:
                    results['details'].append({
                        'status': 'would_copy',
                        'image': str(img_src),
                        'mask': str(mask_src),
                        'target_image': str(img_dst),
                        'target_mask': str(mask_dst)
                    })
                    results['copied'] += 1
                    
            except Exception as e:
                results['errors'] += 1
                results['details'].append({
                    'status': 'error',
                    'image': str(img_src),
                    'mask': str(mask_src),
                    'error': str(e)
                })
        
        return results
    
    def organize(self, dry_run: bool = False) -> Dict:
        """
        Organize the dataset by finding and copying image-mask pairs.
        
        Args:
            dry_run: If True, only show what would be done without making changes
            
        Returns:
            Dictionary with organization results
        """
        print(f"Scanning {self.source_dir} for image-mask pairs...")
        paired, unpaired_images, unpaired_masks = self.find_image_mask_pairs()
        
        print(f"\nFound {len(paired)} image-mask pairs")
        print(f"Unpaired images: {len(unpaired_images)}")
        print(f"Unpaired masks: {len(unpaired_masks)}")
        
        if not paired:
            print("\nNo valid image-mask pairs found. Cannot organize data.")
            return {
                'success': False,
                'message': 'No valid image-mask pairs found'
            }
        
        print("\nOrganizing files...")
        results = self.copy_files(paired, dry_run=dry_run)
        
        # Generate summary
        summary = {
            'success': True,
            'total_pairs': len(paired),
            'copied': results['copied'],
            'errors': results['errors'],
            'unpaired_images': len(unpaired_images),
            'unpaired_masks': len(unpaired_masks),
            'dry_run': dry_run
        }
        
        print("\n" + "="*50)
        print("ORGANIZATION SUMMARY")
        print("="*50)
        print(f"Source directory: {self.source_dir}")
        print(f"Target directory: {self.target_dir}")
        print(f"\nTotal image-mask pairs: {len(paired)}")
        print(f"Successfully processed: {results['copied']}")
        print(f"Errors: {results['errors']}")
        print(f"\nUnpaired images: {len(unpaired_images)}")
        print(f"Unpaired masks: {len(unpaired_masks)}")
        
        if dry_run:
            print("\nNOTE: This was a dry run. No files were actually copied.")
        
        return summary


def main():
    parser = argparse.ArgumentParser(description='Organize image segmentation dataset')
    parser.add_argument('source_dir', type=str, 
                       help='Source directory containing images and masks')
    parser.add_argument('--target-dir', type=str, default='data',
                       help='Target directory for organized data (default: data)')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be done without making changes')
    
    args = parser.parse_args()
    
    organizer = DataOrganizer(args.source_dir, args.target_dir)
    organizer.organize(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
