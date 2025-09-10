import yaml
from pathlib import Path
from collections import defaultdict
import matplotlib.pyplot as plt

def analyze_class_distribution():
    # Load dataset configuration
    with open('dataset/data.yaml') as f:
        data = yaml.safe_load(f)
    
    classes = data['names']
    counts = defaultdict(int)
    
    # Count instances in training and validation sets
    for split in ['train', 'val']:
        label_dir = Path(f'dataset/labels/{split}')
        for label_file in label_dir.glob('*.txt'):
            try:
                with open(label_file, 'r') as f:
                    for line in f:
                        if line.strip():
                            class_id = int(line.split()[0])
                            counts[class_id] += 1
            except Exception as e:
                print(f"Error processing {label_file}: {e}")
    
    # Print class distribution
    print("\n=== Class Distribution ===")
    for i, class_name in enumerate(classes):
        print(f"{class_name}: {counts[i]} instances")
    
    # Plot class distribution
    plt.figure(figsize=(12, 6))
    plt.bar(classes, [counts[i] for i in range(len(classes))])
    plt.title('Class Distribution in Dataset')
    plt.xlabel('Class')
    plt.ylabel('Number of Instances')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    
    # Save the plot
    output_dir = 'analysis_results'
    Path(output_dir).mkdir(exist_ok=True)
    plt.savefig(f'{output_dir}/class_distribution.png')
    print(f"\nClass distribution plot saved to: {output_dir}/class_distribution.png")

if __name__ == "__main__":
    analyze_class_distribution()
