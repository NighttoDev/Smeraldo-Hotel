#!/usr/bin/env python3
"""
Generate PWA icons for Smeraldo Hotel
Creates 512x512, 192x192, and 48x48 PNG icons with branded "S" logo
Run with: python3 scripts/generate-icons.py
"""

import os
from PIL import Image, ImageDraw, ImageFont

# Icon configuration
BRAND_COLOR = (30, 58, 138)  # #1E3A8A (deep blue) in RGB
TEXT_COLOR = (255, 255, 255)  # White
SIZES = [
    {"size": 512, "output": "icon-512.png", "font_size": 320},
    {"size": 192, "output": "icon-192.png", "font_size": 120},
    {"size": 48, "output": "favicon.png", "font_size": 30},
]

# Output directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(PROJECT_DIR, "static", "icons")

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)
print(f"✓ Output directory: {OUTPUT_DIR}")

# Generate each icon size
for config in SIZES:
    size = config["size"]
    output = config["output"]
    font_size = config["font_size"]

    # Create image with blue background
    img = Image.new("RGB", (size, size), BRAND_COLOR)
    draw = ImageDraw.Draw(img)

    # Try to use system font (Fira Sans), fallback to default
    try:
        # Try to load Fira Sans font (macOS typical location)
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", font_size)
    except:
        # Fallback to default font
        try:
            font = ImageFont.truetype("/Library/Fonts/Arial.ttf", font_size)
        except:
            # Use default PIL font (no size control, but works)
            font = ImageFont.load_default()
            print(f"⚠ Warning: Using default font for {output} (system fonts not found)")

    # Draw "S" letter in center
    text = "S"

    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Calculate position to center text
    x = (size - text_width) / 2 - bbox[0]
    y = (size - text_height) / 2 - bbox[1]

    # Draw text
    draw.text((x, y), text, fill=TEXT_COLOR, font=font)

    # Save image
    output_path = os.path.join(OUTPUT_DIR, output)
    img.save(output_path, "PNG")

    print(f"✓ Generated {output} ({size}x{size})")

print("")
print("✅ All icons generated successfully!")
print(f"📁 Icon files: {OUTPUT_DIR}")
print("")
print("Next steps:")
print("  1. Verify icons look correct: ls -lh static/icons/")
print("  2. Update vite.config.ts with icon paths")
print("  3. Update app.html with favicon and apple-touch-icon links")
