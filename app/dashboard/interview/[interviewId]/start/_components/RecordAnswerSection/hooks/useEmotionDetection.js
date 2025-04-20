import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export const useEmotionDetection = (webcamRef, isRecording) => {
    const [emotionData, setEmotionData] = useState(null);
    const [emotionHistory, setEmotionHistory] = useState([]);
    const emotionIntervalRef = useRef(null);

    useEffect(() => {
        if (isRecording) {
            startEmotionDetection();
        } else {
            stopEmotionDetection();
        }

        return () => {
            stopEmotionDetection();
        };
    }, [isRecording]);

    const startEmotionDetection = () => {
        if (emotionIntervalRef.current) {
            clearInterval(emotionIntervalRef.current);
        }

        emotionIntervalRef.current = setInterval(() => {
            captureAndSendFrame();
        }, 5000);
    };

    const stopEmotionDetection = () => {
        if (emotionIntervalRef.current) {
            clearInterval(emotionIntervalRef.current);
            emotionIntervalRef.current = null;
        }
    };

    const captureAndSendFrame = async () => {
        if (webcamRef.current) {
            try {
                const imageSrc = webcamRef.current.getScreenshot();

                if (!imageSrc) {
                    console.log("No image captured from webcam");
                    return;
                }

                const base64Data = imageSrc.split(',')[1];
                const byteCharacters = atob(base64Data);
                const byteArrays = [];

                for (let i = 0; i < byteCharacters.length; i++) {
                    byteArrays.push(byteCharacters.charCodeAt(i));
                }

                const byteArray = new Uint8Array(byteArrays);
                const imageBlob = new Blob([byteArray], { type: 'image/jpeg' });

                const formData = new FormData();
                formData.append('file', imageBlob, 'webcam-frame.jpg');

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch('http://127.0.0.1:5000/predict', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const emotionResult = await response.json();
                
                if (emotionResult?.emotion?.results?.[0]?.emotion) {
                    const currentEmotion = emotionResult.emotion.results[0].emotion;
                    
                    if (currentEmotion !== emotionData) {
                        setEmotionHistory(prevHistory => {
                            const newHistory = [...prevHistory, currentEmotion];
                            localStorage.setItem("emotions", JSON.stringify(newHistory));
                            return newHistory;
                        });

                        setEmotionData(currentEmotion);
                    }
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.warn('Emotion detection request timed out');
                } else {
                    console.error('Error sending frame for emotion detection:', error);
                }
            }
        }
    };

    return {
        emotionData,
        emotionHistory,
        setEmotionData,
        setEmotionHistory
    };
}; 