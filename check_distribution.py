import yaml
from pathlib import Path
from collections import defaultdict

def check_class_distribution():
    # Load dataset info
    with open('dataset/data.yaml') as f:
        data = yaml.safe_load(f)
    
    classes = data['names']
    counts = defaultdict(int)
    
    # Count instances in training and validation sets
    for split in ['train', 'val']:
        label_dir = Path(f'dataset/labels/{split}')
        for label_file in label_dir.glob('*.txt'):
            with open(label_file) as f:
                for line in f:
                    if line.strip():
                        class_id = int(line.split()[0])
                        counts[class_id] += 1
    
    # Print distribution
    print("Class Distribution:")
    total = 0
    for i, class_name in enumerate(classes):
        print(f"{class_name}: {counts[i]} instances")
        total += counts[i]
    
    print(f"\nTotal instances: {total}")

if __name__ == "__main__":
    check_class_distribution()
