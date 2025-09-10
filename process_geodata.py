import os
import numpy as np
import rasterio
import geopandas as gpd
from shapely.geometry import box, Point
import cv2
from pathlib import Path
import shutil
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

class GeoDataProcessor:
    def __init__(self, base_dir, output_dir='data/processed'):
        """
        Initialize the GeoDataProcessor.
        
        Args:
            base_dir: Base directory containing the wwf_ecuador folder
            output_dir: Output directory for processed data
        """
        self.base_dir = Path(base_dir)
        self.output_dir = Path(output_dir)
        self.raw_dir = self.output_dir / 'raw'
        self.images_dir = self.raw_dir / 'images'
        self.masks_dir = self.output_dir / 'masks'
        
        # Create output directories
        self.images_dir.mkdir(parents=True, exist_ok=True)
        self.masks_dir.mkdir(parents=True, exist_ok=True)
        
        # Paths to data
        self.rgb_dir = self.base_dir / 'wwf_ecuador' / 'RGB Orthomosaics'
        self.trees_shp = self.base_dir / 'wwf_ecuador' / 'Final_Trees' / 'Final_Trees.shp'
        
        # Tile size in pixels
        self.tile_size = 512
        self.overlap = 64
        
    def get_geotiff_files(self):
        """Get list of GeoTIFF files in the RGB directory."""
        return list(self.rgb_dir.glob('*.tif'))
    
    def load_shapefile(self):
        """Load the tree locations shapefile."""
        if not self.trees_shp.exists():
            raise FileNotFoundError(f"Shapefile not found at {self.trees_shp}")
        return gpd.read_file(self.trees_shp)
    
    def process_geotiff(self, tif_path, trees_gdf):
        """Process a single GeoTIFF file."""
        site_name = tif_path.stem.replace('_RGB', '').replace(' ', '_')
        print(f"\nProcessing: {site_name}")
        
        with rasterio.open(tif_path) as src:
            # Read the image
            img = src.read([1, 2, 3])  # Read RGB bands
            img = np.moveaxis(img, 0, -1)  # Change to HWC format
            
            # Get transform and CRS
            transform = src.transform
            crs = src.crs
            
            # Convert to 8-bit if needed
            if img.dtype != np.uint8:
                img = (img / 256).astype(np.uint8)
            
            # Process in tiles
            height, width = img.shape[:2]
            tile_count = 0
            
            for y in range(0, height - self.tile_size + 1, self.tile_size - self.overlap):
                for x in range(0, width - self.tile_size + 1, self.tile_size - self.overlap):
                    # Extract tile
                    tile = img[y:y+self.tile_size, x:x+self.tile_size]
                    
                    # Skip if tile is too small
                    if tile.shape[0] < self.tile_size or tile.shape[1] < self.tile_size:
                        continue
                    
                    # Create mask for this tile
                    mask = self.create_mask_for_tile(
                        x, y, self.tile_size, transform, trees_gdf, crs,
                        (height, width)
                    )
                    
                    # Save tile and mask
                    tile_id = f"{site_name}_{x}_{y}"
                    cv2.imwrite(str(self.images_dir / f"{tile_id}.png"), cv2.cvtColor(tile, cv2.COLOR_RGB2BGR))
                    cv2.imwrite(str(self.masks_dir / f"{tile_id}_mask.png"), (mask * 255).astype(np.uint8))
                    
                    tile_count += 1
                    
            print(f"Created {tile_count} tiles from {site_name}")
    
    def create_mask_for_tile(self, x, y, size, transform, trees_gdf, crs, img_shape):
        """Create a binary mask for a tile."""
        # Create empty mask
        mask = np.zeros((size, size), dtype=np.uint8)
        
        # Get tile bounds in pixel coordinates
        x1, y1 = x, y
        x2, y2 = x + size, y + size
        
        # Convert to geographic coordinates
        lon1, lat1 = transform * (x1, y1)
        lon2, lat2 = transform * (x2, y2)
        
        # Create bounding box for tile
        tile_bbox = box(
            min(lon1, lon2), min(lat1, lat2),
            max(lon1, lon2), max(lat1, lat2)
        )
        
        # Find trees within this tile
        trees_in_tile = trees_gdf[trees_gdf.intersects(tile_bbox)]
        
        if trees_in_tile.empty:
            return mask
        
        # For each tree, mark its location in the mask
        for _, tree in trees_in_tile.iterrows():
            if not tree.geometry.is_empty and tree.geometry.geom_type == 'Point':
                # Get tree coordinates in image space
                py, px = ~transform * (tree.geometry.x, tree.geometry.y)
                px, py = int(px), int(py)
                
                # Convert to tile coordinates
                tx = px - x
                ty = py - y
                
                # Mark tree location in mask
                if 0 <= tx < size and 0 <= ty < size:
                    # Draw a small circle for each tree
                    cv2.circle(mask, (tx, ty), radius=3, color=1, thickness=-1)
        
        return mask
    
    def process_all(self):
        """Process all GeoTIFF files."""
        # Load tree data
        print("Loading tree data...")
        try:
            trees_gdf = self.load_shapefile()
            print(f"Loaded {len(trees_gdf)} tree locations")
        except Exception as e:
            print(f"Error loading shapefile: {e}")
            return
        
        # Process each GeoTIFF
        tif_files = self.get_geotiff_files()
        print(f"Found {len(tif_files)} GeoTIFF files")
        
        for tif_file in tif_files:
            try:
                self.process_geotiff(tif_file, trees_gdf)
            except Exception as e:
                print(f"Error processing {tif_file}: {e}")
        
        print("\nProcessing complete!")
        print(f"Images saved to: {self.images_dir}")
        print(f"Masks saved to: {self.masks_dir}")


if __name__ == "__main__":
    # Set up paths
    base_dir = Path(r"D:\SIH ML\data\reforestree")
    output_dir = Path(r"D:\SIH ML\blue_carbon_segmentation\data")
    
    # Create processor and run
    processor = GeoDataProcessor(base_dir, output_dir)
    processor.process_all()
