Here is a complete, minimal Python script using OpenCV and Pytesseract (a highly optimized OCR engine built for speed).
This script takes an image, instantly filters it to make the digits pop, draws a green bounding box around every number it finds, and prints the coordinates and the digit to your terminal.
## 1. Install the Requirements
First, open your terminal or command prompt and install the necessary libraries:

pip install opencv-python pytesseract numpy

(Note: Windows users will also need to download the standard Tesseract EXE installer and make sure it is installed on their system).
## 2. The Python Code (find_numbers.py)

import cv2import pytesseract
# Load your image (replace 'numbers.jpg' with your actual file name)image_path = 'numbers.jpg'image = cv2.imread(image_path)output = image.copy()
# Step 1: Fast OpenCV Pre-processing (Makes digits pop)gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)  # Convert to grayscale# Apply thresholding to turn it into pure black and white (removes shadows/noise)thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
# Step 2: Configure Tesseract to look ONLY for numbers/digits (Crucial for speed)# --psm 11 looks for sparse text/isolated digits anywhere in the imagecustom_config = r'--psm 11 -c tessedit_char_whitelist=0123456789'
# Step 3: Run the digit finderdata = pytesseract.image_to_data(thresh, config=custom_config, output_type=pytesseract.Output.DICT)
# Step 4: Loop through everything found and draw the bounding boxesnum_boxes = len(data['text'])for i in range(num_boxes):
    # Only look at predictions that aren't empty and have a high confidence score
    if data['text'][i].strip() != "" and int(data['conf'][i]) > 50:
        digit = data['text'][i]
        x = data['left'][i]
        y = data['top'][i]
        w = data['width'][i]
        h = data['height'][i]
        
        # Print the exact location and found number to the console
        print(f"Found number '{digit}' at coordinates: X:{x}, Y:{y}, Width:{w}, Height:{h}")
        
        # Draw a green box around the number on the original image
        cv2.rectangle(output, (x, y), (x + w, y + h), (0, 255, 0), 2)
        # Label it with the found digit
        cv2.putText(output, digit, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
# Step 5: Display the final result instantly
cv2.imshow("Found Numbers", output)
cv2.waitKey(0)
cv2.destroyAllWindows()

## Why this setup is lightning fast:

* The Whitelist Filter: By telling the engine tessedit_char_whitelist=0123456789, it instantly ignores letters, punctuation, and backgrounds. It doesn't waste processing power trying to figure out if a line is an "I", an "l", or a "1"—it only checks for digits.
* OpenCV Thresholding: Turning the image into pure black and white takes less than a millisecond, but it allows the OCR reader to instantly trace the contours of the numbers without getting confused by colors or lighting gradients.

Would you like help adapting this code to read numbers from a live webcam feed instead of a static image file?

