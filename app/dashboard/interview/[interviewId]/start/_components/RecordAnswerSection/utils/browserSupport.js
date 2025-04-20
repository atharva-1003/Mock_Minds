/**
 * Checks browser support for required features
 * @returns {Promise<{speechRecognition: boolean, webcam: boolean, microphone: boolean}>} Browser support status
 */
export const checkBrowserSupport = async () => {
    // Check Speech Recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasSpeechRecognition = !!SpeechRecognition;
    
    // Check Webcam support
    let hasWebcam = false;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        hasWebcam = true;
    } catch (error) {
        console.error('Webcam access error:', error);
    }
    
    // Check Microphone support
    let hasMicrophone = false;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        hasMicrophone = true;
    } catch (error) {
        console.error('Microphone access error:', error);
    }

    return {
        speechRecognition: hasSpeechRecognition,
        webcam: hasWebcam,
        microphone: hasMicrophone
    };
}; 