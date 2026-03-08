import pytesseract
from PIL import Image
import sys

try:
    img = Image.open(sys.argv[1])
    text = pytesseract.image_to_string(img)
    print(text)
except Exception as e:
    print(f"Error: {e}")
