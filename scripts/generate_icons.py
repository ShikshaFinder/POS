
import os
from PIL import Image

def generate_icons(source_path, output_dir):
    try:
        if not os.path.exists(source_path):
            print(f"Error: Source image not found at {source_path}")
            return

        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        sizes = [72, 96, 128, 144, 152, 192, 384, 512]
        
        with Image.open(source_path) as img:
            # Ensure image is in RGBA mode for transparency
            img = img.convert("RGBA")
            
            for size in sizes:
                icon_name = f"icon-{size}x{size}.png"
                icon_path = os.path.join(output_dir, icon_name)
                
                # Resize image
                resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
                
                # Save
                resized_img.save(icon_path, "PNG")
                print(f"Generated {icon_name}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    source_logo = "c:/Users/ashis/codes/POS/public/flavi-logo.png"
    icons_dir = "c:/Users/ashis/codes/POS/public/icons"
    generate_icons(source_logo, icons_dir)
