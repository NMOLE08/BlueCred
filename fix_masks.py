from pathlib import Path
import shutil

def fix_mask_structure():
    base_dir = Path(r"D:\SIH ML\blue_carbon_segmentation\data")
    
    # Define source and target directories
    src_masks = base_dir / "masks"
    dst_masks = base_dir / "raw" / "masks"
    
    # Create target directory if it doesn't exist
    dst_masks.mkdir(parents=True, exist_ok=True)
    
    # Move all mask files to the raw/masks directory
    mask_files = list(src_masks.glob("*"))
    for src_file in mask_files:
        dst_file = dst_masks / src_file.name
        if not dst_file.exists():
            shutil.move(str(src_file), str(dst_file))
    
    # Remove the old masks directory if it's empty
    try:
        src_masks.rmdir()
    except OSError:
        print(f"Could not remove {src_masks} - directory not empty")
    
    print(f"Moved {len(mask_files)} mask files to {dst_masks}")
    print("Directory structure is now clean!")

if __name__ == "__main__":
    fix_mask_structure()
