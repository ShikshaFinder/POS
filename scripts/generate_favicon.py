
import os
from PIL import Image

def generate_favicon(source_path, output_dir):
    if not os.path.exists(source_path):
        print(f"Error: Source image not found at {source_path}")
        return

    try:
        img = Image.open(source_path)
        # Resize to standard favicon sizes
        icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
        
        output_path = os.path.join(output_dir, "favicon.ico")
        img.save(output_path, sizes=icon_sizes)
        print(f"Generated {output_path}")

    except Exception as e:
        print(f"Error generating favicon: {e}")

if __name__ == "__main__":
    base_dir = os.getcwd()
    source = os.path.join(base_dir, "public", "app-icon.png")
    output = os.path.join(base_dir, "public")
    
    generate_favicon(source, output)
