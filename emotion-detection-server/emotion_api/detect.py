import cv2
import numpy as np
from tensorflow.keras.models import load_model
from model_def import build_model

emotion_dict = {0: "Angry", 1: "Disgusted", 2: "Fearful", 3: "Happy", 4: "Neutral", 5: "Sad", 6: "Surprised"}

# Load model architecture and weights
model = build_model()
model.load_weights("model.h5")

def detect_emotion_from_image(image):
    
    # Initialize face cascade classifier
    facecasc = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
    
    if image is None or not isinstance(image, np.ndarray):
        return {"error": "Invalid image input"}
    
    # Convert to grayscale if needed
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # Try to detect faces with multiple parameter sets
    faces = []
    detection_params = [
        {'scaleFactor': 1.1, 'minNeighbors': 5, 'minSize': (30, 30)},
        {'scaleFactor': 1.2, 'minNeighbors': 4, 'minSize': (25, 25)},
        {'scaleFactor': 1.3, 'minNeighbors': 3, 'minSize': (20, 20)},
    ]
    
    for params in detection_params:
        faces = facecasc.detectMultiScale(gray, **params)
        if len(faces) > 0:
            break
    
    if len(faces) == 0:
        # Try equalizing histogram as a fallback
        equalized_gray = cv2.equalizeHist(gray)
        for params in detection_params:
            faces = facecasc.detectMultiScale(equalized_gray, **params)
            if len(faces) > 0:
                gray = equalized_gray
                break
    
    if len(faces) == 0:
        return {"result": "No face detected"}
    
    results = []
    for i, (x, y, w, h) in enumerate(faces):
        try:
            # Extract and preprocess face region
            roi_gray = gray[y:y + h, x:x + w]
            resized_face = cv2.resize(roi_gray, (48, 48))
            normalized_face = resized_face / 255.0
            input_face = np.expand_dims(np.expand_dims(normalized_face, -1), 0)
            
            # Get prediction
            prediction = model.predict(input_face, verbose=0)
            max_index = int(np.argmax(prediction))
            confidence = float(prediction[0][max_index])
            emotion = emotion_dict[max_index]
            
            # Convert all NumPy types to Python native types
            all_scores = {emotion_dict[i]: float(score) for i, score in enumerate(prediction[0])}
            
            # Save face coordinates and results (converting numpy types to Python native types)
            results.append({
                "face_id": int(i+1),
                "bbox": [int(x), int(y), int(w), int(h)],
                "emotion": emotion,
                "confidence": float(confidence),
                "all_scores": all_scores
            })
            
        except Exception as e:
            results.append({
                "face_id": int(i+1),
                "bbox": [int(x), int(y), int(w), int(h)],
                "error": str(e)
            })
    
    return {
        "num_faces_detected": int(len(faces)),
        "results": results
    }