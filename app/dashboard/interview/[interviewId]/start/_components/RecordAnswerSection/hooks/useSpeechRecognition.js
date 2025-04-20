import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export const useSpeechRecognition = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [userAnswer, setUserAnswer] = useState('');
    const [currentCaption, setCurrentCaption] = useState('');
    const recognitionRef = useRef(null);
    const noSpeechTimeoutRef = useRef(null);
    const finalResultTimeoutRef = useRef(null);

    // Function to initialize the recognition object
    const initializeRecognition = () => {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => {
                console.log('Speech recognition started');
                setIsRecording(true);
                setCurrentCaption('');
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
                setCurrentCaption('');
            };

            recognitionRef.current.onend = () => {
                console.log('Speech recognition ended');
                setIsRecording(false);
                setCurrentCaption('');
            };

            recognitionRef.current.onresult = (event) => {
                try {
                    // Clear the no speech timeout since we got a result
                    if (noSpeechTimeoutRef.current) {
                        clearTimeout(noSpeechTimeoutRef.current);
                        noSpeechTimeoutRef.current = null;
                    }
                    
                    const lastResult = event.results[event.results.length - 1];
                    const transcript = lastResult[0].transcript;
                    
                    if (!lastResult.isFinal) {
                        setCurrentCaption(transcript);
                    } else {
                        setUserAnswer(prev => {
                            if (prev === '') {
                                return transcript;
                            }
                            return prev + ' ' + transcript;
                        });
                        setCurrentCaption('');
                    }
                } catch (error) {
                    console.error("Error processing speech result:", error);
                }
            };
            
            console.log('Speech recognition initialized');
            return true;
        } catch (error) {
            console.error('Error initializing speech recognition:', error);
            return false;
        }
    };

    const startRecording = () => {
        console.log('Attempting to start recording');
        
        // If recognition is not initialized or has ended, reinitialize it
        if (!recognitionRef.current) {
            console.log('Recognition not initialized, initializing now');
            const initialized = initializeRecognition();
            if (!initialized) {
                console.error('Failed to initialize speech recognition');
                return;
            }
        }

        try {
            recognitionRef.current.start();
            console.log('Started speech recognition');
            
            // Set a timeout to detect if no speech is detected
            noSpeechTimeoutRef.current = setTimeout(() => {
                if (isRecording && !currentCaption) {
                    console.log('No speech detected, stopping recognition');
                    stopRecording();
                }
            }, 5000);
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            // If there's an error starting, try to reinitialize
            console.log('Attempting to reinitialize recognition after error');
            recognitionRef.current = null;
            const initialized = initializeRecognition();
            if (initialized) {
                try {
                    recognitionRef.current.start();
                    console.log('Started speech recognition after reinitialization');
                } catch (retryError) {
                    console.error('Error starting speech recognition after reinitialization:', retryError);
                    setIsRecording(false);
                }
            } else {
                setIsRecording(false);
            }
        }
    };

    const stopRecording = () => {
        console.log('Stopping speech recognition');
        console.log('Current user answer before stopping:', userAnswer);
        
        return new Promise((resolve, reject) => {
            if (isRecording && recognitionRef.current) {
                try {
                    // Clear any existing timeouts
                    if (noSpeechTimeoutRef.current) {
                        clearTimeout(noSpeechTimeoutRef.current);
                        noSpeechTimeoutRef.current = null;
                    }
                    
                    if (finalResultTimeoutRef.current) {
                        clearTimeout(finalResultTimeoutRef.current);
                        finalResultTimeoutRef.current = null;
                    }
                    
                    // Store the current answer
                    let finalAnswer = userAnswer;
                    let hasFinalResult = false;
                    
                    // Set up final result handler
                    const finalResultHandler = (event) => {
                        console.log('Final speech recognition result received');
                        hasFinalResult = true;
                        
                        const transcript = Array.from(event.results)
                            .map(result => result[0].transcript)
                            .join(' ');
                        
                        console.log('Final transcript:', transcript);
                        
                        // Update the final answer
                        finalAnswer = finalAnswer ? finalAnswer + ' ' + transcript : transcript;
                        console.log('Updated final answer:', finalAnswer);
                    };
                    
                    // Add the final result handler
                    recognitionRef.current.onresult = finalResultHandler;
                    
                    // Add error handler
                    recognitionRef.current.onerror = (error) => {
                        console.error('Error during final speech recognition:', error);
                        reject(error);
                    };
                    
                    // Stop the recognition
                    recognitionRef.current.stop();
                    
                    // Wait for final results with increased timeout
                    finalResultTimeoutRef.current = setTimeout(() => {
                        // Update the state with the final answer
                        setUserAnswer(finalAnswer);
                        setIsRecording(false);
                        console.log('Resolving stopRecording with final answer:', finalAnswer);
                        resolve(finalAnswer);
                    }, 2000); // Increased timeout to ensure we get final results
                } catch (error) {
                    console.error('Error stopping recognition:', error);
                    reject(error);
                }
            } else {
                console.log('No active recording to stop');
                resolve(userAnswer);
            }
        });
    };

    // Reset the recognition object
    const resetRecognition = () => {
        console.log('Resetting speech recognition');
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (error) {
                console.error('Error stopping recognition during reset:', error);
            }
        }
        recognitionRef.current = null;
        setIsRecording(false);
        setUserAnswer('');
        setCurrentCaption('');
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (noSpeechTimeoutRef.current) {
                clearTimeout(noSpeechTimeoutRef.current);
            }
            if (finalResultTimeoutRef.current) {
                clearTimeout(finalResultTimeoutRef.current);
            }
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (error) {
                    console.error('Error stopping recognition during cleanup:', error);
                }
            }
        };
    }, []);

    return {
        isRecording,
        userAnswer,
        currentCaption,
        setUserAnswer,
        setCurrentCaption,
        startRecording,
        stopRecording,
        resetRecognition
    };
}; 