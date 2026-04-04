import os
from PIL import Image, ImageChops

def remove_background(input_path, output_path):
    if not os.path.exists(input_path):
        return
    
    img = Image.open(input_path).convert("RGBA")
    
    # Simple strategy: If the corner pixels are white, flood fill or mask
    # For generated logos, they often have a solid white or near-white background
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # If pixel is near-white (allowing for slight anti-aliasing artifacts)
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            newData.append((255, 255, 255, 0)) # Fully transparent
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Processed {input_path} -> {output_path}")

# Target files
targets = [
    "mlb_nyy.png", "epl_avl.png", "epl_bre.png", "epl_bha.png", "epl_bur.png",
    "epl_che.png", "epl_cry.png", "epl_eve.png", "epl_ful.png", "epl_lee.png", "epl_liv.png"
]

base_dir = "public/logos"
for t in targets:
    path = os.path.join(base_dir, t)
    remove_background(path, path)
