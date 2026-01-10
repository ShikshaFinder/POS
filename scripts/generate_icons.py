
import os
from PIL import Image

def generate_icons(source_path, output_dir):
    if not os.path.exists(source_path):
        print(f"Error: Source image not found at {source_path}")
        return

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        img = Image.open(source_path)
        # Ensure it's square
        width, height = img.size
        if width != height:
            # Crop to center square
            min_dim = min(width, height)
            left = (width - min_dim) / 2
            top = (height - min_dim) / 2
            right = (width + min_dim) / 2
            bottom = (height + min_dim) / 2
            img = img.crop((left, top, right, bottom))
            print("Image cropped to square.")

        sizes = [72, 96, 128, 144, 152, 192, 384, 512]
        
        for size in sizes:
            resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
            output_path = os.path.join(output_dir, f"icon-{size}x{size}.png")
            resized_img.save(output_path, "PNG")
            print(f"Generated {output_path}")

        print("All icons generated successfully.")

    except Exception as e:
        print(f"Error generating icons: {e}")

if __name__ == "__main__":
    # Assuming script is run from project root or scripts folder
    # We want to look for public/app-icon.png
    base_dir = os.getcwd()
    source = os.path.join(base_dir, "public", "app-icon.png")
    output = os.path.join(base_dir, "public", "icons")
    
    print(f"Source: {source}")
    print(f"Output: {output}")
    
    generate_icons(source, output)
