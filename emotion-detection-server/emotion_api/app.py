from flask import Flask, request, jsonify, render_template
from detect import detect_emotion_from_image
from flask_cors import CORS
from PIL import Image  
import numpy as np      
import cv2              
import io              

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        image_bytes = file.read()
        pil_image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        image = np.array(pil_image).astype(np.uint8)
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        emotion = detect_emotion_from_image(image)
        return jsonify({'emotion': emotion})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
