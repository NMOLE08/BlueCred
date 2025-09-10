import torch
from pathlib import Path
import yaml
from src.models.model import create_model

def load_checkpoint(checkpoint_path):
    """Load a model checkpoint."""
    if not Path(checkpoint_path).exists():
        return None, f"Checkpoint not found at {checkpoint_path}"
    
    try:
        checkpoint = torch.load(checkpoint_path, map_location='cpu')
        return checkpoint, "Checkpoint loaded successfully"
    except Exception as e:
        return None, f"Error loading checkpoint: {str(e)}"

def main():
    # Path to the latest checkpoint
    exp_dir = Path("models/blue_carbon_segmentation_20250910_053028")
    checkpoint_path = exp_dir / "checkpoints" / "latest.pth"
    
    # Check if checkpoint exists
    if not checkpoint_path.exists():
        print(f"No checkpoint found at {checkpoint_path}")
        # Look for any .pth files in the experiment directory
        pth_files = list(exp_dir.rglob("*.pth"))
        if pth_files:
            print("\nFound these .pth files:")
            for f in pth_files:
                print(f"- {f}")
        else:
            print("No .pth files found in the experiment directory.")
        return
    
    # Try to load the checkpoint
    checkpoint, msg = load_checkpoint(checkpoint_path)
    print(msg)
    
    if checkpoint is not None:
        print("\nCheckpoint contents:")
        print("Keys:", list(checkpoint.keys()))
        print("Epoch:", checkpoint.get('epoch', 'N/A'))
        print("Model state dict keys:", list(checkpoint.get('model_state_dict', {}).keys())[:5], "...")

if __name__ == "__main__":
    main()
