"use client"
import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Webcam from 'react-webcam';
import { Mic, StopCircle, Timer, PlayCircle, PauseCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { chatSession } from '@/utils/GeminiAIModal';
import { db } from '@/utils/db';
import { UserAnswer } from '@/utils/schema';
import { useUser } from '@clerk/nextjs';
import moment from 'moment';

// Constants for timer durations (in seconds)
const PREP_TIME = 10;  // 10 seconds for preparation
const ANSWER_TIME = 15;  // 15 seconds for answering

function RecordAnswerSection({ mockInterviewQuestion, activeQuestionIndex, interviewData }) {
    const [userAnswer, setUserAnswer] = useState('');
    const [currentCaption, setCurrentCaption] = useState('');
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [emotionData, setEmotionData] = useState(null);
    const [emotionHistory, setEmotionHistory] = useState([]); // Array to store emotion history
    const webcamRef = useRef(null);
    const emotionIntervalRef = useRef(null);
    const [browserSupport, setBrowserSupport] = useState({
        speechRecognition: false,
        webcam: false
    });

    // Add loading state for questions
    const [isQuestionsLoading, setIsQuestionsLoading] = useState(true);
    
    // Timer states
    const [phase, setPhase] = useState('idle'); // idle, preparing, answering
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef(null);
    const hasStartedPrep = useRef(false);

    // Speech recognition states
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef(null);
    const recognitionTimeoutRef = useRef(null);

    // Check browser support on component mount
    useEffect(() => {
        const checkBrowserSupport = async () => {
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

            // Log browser support for debugging
            console.log("Browser support check:", {
                hasSpeechRecognition,
                hasWebcam,
                userAgent: navigator.userAgent
            });

            setBrowserSupport({
                speechRecognition: hasSpeechRecognition,
                webcam: hasWebcam
            });

            if (!hasSpeechRecognition) {
                toast.error("Your browser doesn't support speech recognition. Please use Chrome or Edge.", {
                    duration: 5000,
                    position: "top-center"
                });
            }
            if (!hasWebcam) {
                toast.error("Unable to access webcam. Please check your camera permissions.", {
                    duration: 5000,
                    position: "top-center"
                });
            }
        };

        checkBrowserSupport();
    }, []);

    // Start preparation phase when question loads
    useEffect(() => {
        // Clear any existing timers
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        if (recognitionTimeoutRef.current) {
            clearTimeout(recognitionTimeoutRef.current);
        }
        
        // Reset states
        setPhase('idle');
        setTimeLeft(0);
        setUserAnswer('');
        setCurrentCaption('');
        hasStartedPrep.current = false;
        
        // Start preparation phase after a short delay to ensure clean state
        if (mockInterviewQuestion && 
            mockInterviewQuestion[activeQuestionIndex] && 
            !isQuestionsLoading) {
            
            // Force a small delay to ensure all states are reset properly
            const prepTimer = setTimeout(() => {
                hasStartedPrep.current = true;
                startPreparationPhase();
            }, 1000); // Increased delay to 1000ms for more reliable initialization
            
            return () => clearTimeout(prepTimer);
        }
    }, [mockInterviewQuestion, activeQuestionIndex, isQuestionsLoading]);

    // Reset states when question changes
    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        if (recognitionTimeoutRef.current) {
            clearTimeout(recognitionTimeoutRef.current);
        }
        // Ensure speech recognition is stopped
        if (isRecording && recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (error) {
                console.error("Error stopping recognition on question change:", error);
            }
        }
        setPhase('idle');
        setTimeLeft(0);
        setUserAnswer('');
        setCurrentCaption('');
        setIsRecording(false);
        // Don't reset hasStartedPrep here, it's handled in the preparation phase effect
    }, [activeQuestionIndex]);

    useEffect(() => {
        if (mockInterviewQuestion) {
            setIsQuestionsLoading(false);
        }
    }, [mockInterviewQuestion]);

    // Start capturing and sending frames when recording begins
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
        // Clear any existing interval
        if (emotionIntervalRef.current) {
            clearInterval(emotionIntervalRef.current);
        }

        // Set new interval to capture and send frames every 3 seconds
        // Increased from 3 seconds to 5 seconds to reduce load and improve stability
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
                // Capture current frame as image
                const imageSrc = webcamRef.current.getScreenshot();

                if (!imageSrc) {
                    console.log("No image captured from webcam");
                    return;
                }

                // Convert base64 image to binary Blob
                const base64Data = imageSrc.split(',')[1];
                const byteCharacters = atob(base64Data);
                const byteArrays = [];

                for (let i = 0; i < byteCharacters.length; i++) {
                    byteArrays.push(byteCharacters.charCodeAt(i));
                }

                const byteArray = new Uint8Array(byteArrays);
                const imageBlob = new Blob([byteArray], { type: 'image/jpeg' });

                // Create a multipart form data object
                const formData = new FormData();
                formData.append('file', imageBlob, 'webcam-frame.jpg');

                // Send the form data to the API with a timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                const response = await fetch('http://127.0.0.1:5000/predict', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    console.error('API response status:', response.status);
                    const errorText = await response.text();
                    console.error('API error response:', errorText);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const emotionResult = await response.json();
                
                // Check if the emotion result is valid
                if (emotionResult && emotionResult.emotion && emotionResult.emotion.results && 
                    emotionResult.emotion.results.length > 0 && 
                    emotionResult.emotion.results[0].emotion) {
                    
                    const currentEmotion = emotionResult.emotion.results[0].emotion;
                    
                    // Only update if the emotion is different from the current one
                    // This prevents flickering of the emotion display
                    if (currentEmotion !== emotionData) {
                        // Update the emotion history array
                        setEmotionHistory(prevHistory => {
                            const newHistory = [...prevHistory, currentEmotion];
                            // Store in localStorage after state update
                            localStorage.setItem("emotions", JSON.stringify(newHistory));
                            return newHistory;
                        });

                        // Also update the current emotion for display
                        setEmotionData(currentEmotion);
                    }

                    console.log('Emotion detection result:', emotionResult);
                    console.log('Current emotion:', currentEmotion);
                } else {
                    console.warn('Invalid emotion result format:', emotionResult);
                }

            } catch (error) {
                if (error.name === 'AbortError') {
                    console.warn('Emotion detection request timed out');
                } else {
                    console.error('Error sending frame for emotion detection:', error);
                }
                // Don't update emotion data on error to prevent glitches
            }
        }
    };

    const UpdateUserAnswer = async () => {
        console.log('Updating user answer...');
        setLoading(true);
        const feedbackPrompt = "Question:" + mockInterviewQuestion[activeQuestionIndex]?.question +
            ", User Answer:" + userAnswer + ",Depends on question and user answer for give interview question " +
            " please give us rating out of 10 for answer and feedback as area of improvmenet if any " +
            "in just 3 to 5 lines to improve it in JSON format with rating field and feedback field";

        const result = await chatSession.sendMessage(feedbackPrompt);
        const mockJsonResp = (await result.response.text()).replace('```json', '').replace('```', '');
        const JsonFeedbackResp = JSON.parse(mockJsonResp);

        // Get the latest emotion history before storing
        const finalEmotionHistory = [...emotionHistory];
        console.log('Final emotion history to be stored:', finalEmotionHistory);

        try {
            // Include emotion history in the database record
            const resp = await db.insert(UserAnswer)
                .values({
                    mockIdRef: interviewData?.mockId,
                    question: mockInterviewQuestion[activeQuestionIndex]?.question,
                    correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
                    userAns: userAnswer,
                    feedback: JsonFeedbackResp?.feedback,
                    rating: JsonFeedbackResp?.rating,
                    userEmail: user?.primaryEmailAddress?.emailAddress,
                    createdAt: moment().format('DD-MM-yyyy'),
                    emotionHistory: JSON.stringify(finalEmotionHistory) // Store as JSON string
                });

            if (resp) {
                toast.success("Answer recorded", {
                    duration: 1000, // Disappear after 1 second
                    position: "top-center"
                });
                setUserAnswer('');
                setCurrentCaption('');
                setEmotionData(null);
                setEmotionHistory([]); // Reset emotion history for next question
                localStorage.removeItem("emotions"); // Clear localStorage
            }
        } catch (error) {
            console.error('Error saving user answer:', error);
            // If the error is about missing column, try without emotionHistory
            if (error.message.includes('column "emotionHistory"')) {
                const resp = await db.insert(UserAnswer)
                    .values({
                        mockIdRef: interviewData?.mockId,
                        question: mockInterviewQuestion[activeQuestionIndex]?.question,
                        correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
                        userAns: userAnswer,
                        feedback: JsonFeedbackResp?.feedback,
                        rating: JsonFeedbackResp?.rating,
                        userEmail: user?.primaryEmailAddress?.emailAddress,
                        createdAt: moment().format('DD-MM-yyyy')
                    });

                if (resp) {
                    toast.success("Answer recorded", {
                        duration: 1000, // Disappear after 1 second
                        position: "top-center"
                    });
                    setUserAnswer('');
                    setCurrentCaption('');
                    setEmotionData(null);
                    setEmotionHistory([]);
                    localStorage.removeItem("emotions");
                }
            } else {
                toast.error("Failed to record", {
                    duration: 1000, // Disappear after 1 second
                    position: "top-center"
                });
            }
        }

        setLoading(false);
    };

    const startPreparationPhase = () => {
        // Ensure any existing timers are cleared
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        // Ensure any existing recording is stopped
        if (isRecording && recognitionRef.current) {
            try {
                recognitionRef.current.stop();
                setIsRecording(false);
            } catch (error) {
                console.error("Error stopping recording before preparation:", error);
            }
        }
        
        setPhase('preparing');
        setTimeLeft(PREP_TIME);
        
        // Show preparation toast
        toast.info("Preparation time started! Get ready to answer.", {
            duration: 3000,
            position: "top-center"
        });
        
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            const remainingTime = Math.max(0, PREP_TIME - elapsedTime);
            
            setTimeLeft(remainingTime);
            
            if (remainingTime <= 0) {
                clearInterval(timerRef.current);
                startAnsweringPhase();
            }
        }, 100);
    };

    const startAnsweringPhase = () => {
        // Ensure any existing timers are cleared
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        // First stop any existing recording
        if (isRecording && recognitionRef.current) {
            try {
                recognitionRef.current.stop();
                setIsRecording(false);
            } catch (error) {
                console.error("Error stopping existing recording:", error);
            }
        }

        setPhase('answering');
        setTimeLeft(ANSWER_TIME);
        
        // Start recording after a short delay to ensure clean state
        setTimeout(() => {
            console.log("Attempting to start recording. Browser support:", browserSupport);
            
            // Create a new SpeechRecognition instance for each recording session
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                try {
                    recognitionRef.current = new SpeechRecognition();
                    recognitionRef.current.continuous = false;
                    recognitionRef.current.interimResults = true;
                    
                    // Set up event handlers
                    recognitionRef.current.onresult = (event) => {
                        console.log("Speech recognition result received:", event.results);
                        try {
                            // Get the last result
                            const lastResult = event.results[event.results.length - 1];
                            const transcript = lastResult[0].transcript;
                            
                            // For interim results, just update the current caption
                            if (!lastResult.isFinal) {
                                console.log("Interim result:", transcript);
                                setCurrentCaption(transcript);
                            } else {
                                // For final results, add to the user answer
                                console.log("Final result:", transcript);
                                setUserAnswer(prev => {
                                    // If this is the first final result, just set it
                                    if (prev === '') {
                                        return transcript;
                                    }
                                    // Add the new text with a space
                                    return prev + ' ' + transcript;
                                });
                                setCurrentCaption('');
                                
                                // Restart recognition to continue listening
                                if (phase === 'answering' && isRecording) {
                                    console.log("Restarting recognition after final result");
                                    try {
                                        recognitionRef.current.stop();
                                        setTimeout(() => {
                                            if (phase === 'answering' && isRecording) {
                                                try {
                                                    recognitionRef.current.start();
                                                } catch (error) {
                                                    console.error("Error starting speech recognition after restart:", error);
                                                }
                                            }
                                        }, 200);
                                    } catch (error) {
                                        console.error("Error stopping speech recognition for restart:", error);
                                    }
                                }
                            }
                        } catch (error) {
                            console.error("Error processing speech recognition result:", error);
                        }
                    };
                    
                    recognitionRef.current.onerror = (event) => {
                        console.error('Speech recognition error:', event.error);
                        
                        // Handle different error types appropriately
                        switch (event.error) {
                            case 'no-speech':
                                // Don't stop recording for no-speech, just show a warning
                                toast.warning("No speech detected. Please speak louder.", {
                                    duration: 3000,
                                    position: "top-center"
                                });
                                break;
                            case 'audio-capture':
                            case 'not-allowed':
                                // Stop recording for permission issues
                                setIsRecording(false);
                                toast.error("Microphone access issue. Please check your microphone permissions.", {
                                    duration: 5000,
                                    position: "top-center"
                                });
                                break;
                            case 'network':
                                // Don't stop recording for network issues, just show a warning
                                toast.warning("Network issue detected. Your speech may not be recorded properly.", {
                                    duration: 3000,
                                    position: "top-center"
                                });
                                break;
                            case 'aborted':
                                // This is a normal error when stopping recognition
                                break;
                            default:
                                // For other errors, stop recording
                                setIsRecording(false);
                                toast.error(`Speech recognition error: ${event.error}`, {
                                    duration: 3000,
                                    position: "top-center"
                                });
                        }
                    };
                    
                    recognitionRef.current.onend = () => {
                        console.log("Speech recognition ended. Phase:", phase, "isRecording:", isRecording);
                        // Only restart if we're still in the answering phase
                        if (phase === 'answering' && isRecording) {
                            console.log("Attempting to restart recognition");
                            try {
                                recognitionRef.current.start();
                            } catch (error) {
                                console.error("Error restarting speech recognition:", error);
                                setIsRecording(false);
                                toast.error("Speech recognition stopped unexpectedly. Please try again.", {
                                    duration: 3000,
                                    position: "top-center"
                                });
                            }
                        } else {
                            setIsRecording(false);
                        }
                    };
                    
                    // Reset the user answer before starting a new recording
                    setUserAnswer('');
                    setCurrentCaption('');
                    
                    // Start recording
                    recognitionRef.current.start();
                    setIsRecording(true);
                    toast.info("Recording started! You can now speak your answer.", {
                        duration: 3000,
                        position: "top-center"
                    });
                } catch (error) {
                    console.error("Error starting speech recognition:", error);
                    toast.error("Failed to start recording. Please try again.", {
                        duration: 3000,
                        position: "top-center"
                    });
                }
            } else {
                console.error("Speech recognition not supported in this browser");
                toast.error("Speech recognition not supported in this browser. Please use Chrome or Edge.", {
                    duration: 5000,
                    position: "top-center"
                });
            }
        }, 500);

        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            const remainingTime = Math.max(0, ANSWER_TIME - elapsedTime);
            
            setTimeLeft(remainingTime);
            
            // Show warning when time is running out
            if (remainingTime === 5) {
                toast.warning("5 seconds remaining!", {
                    duration: 2000,
                    position: "top-center"
                });
            }
            
            if (remainingTime <= 0) {
                clearInterval(timerRef.current);
                if (isRecording && recognitionRef.current) {
                    try {
                        recognitionRef.current.stop();
                    } catch (error) {
                        console.error("Error stopping recording:", error);
                    }
                }
                setPhase('completed');
                toast.info("Time's up! Recording stopped.", {
                    duration: 3000,
                    position: "top-center"
                });
                
                // Automatically submit the answer if there's content
                if (userAnswer.trim().length > 0) {
                    UpdateUserAnswer();
                } else {
                    toast.warning("No answer recorded. Please try again.", {
                        duration: 3000,
                        position: "top-center"
                    });
                }
            }
        }, 100);
    };

    // Add a function to manually start recording
    const startManualRecording = () => {
        if (phase !== 'answering') {
            toast.error("You can only start recording during the answering phase.", {
                duration: 3000,
                position: "top-center"
            });
            return;
        }

        if (isRecording) {
            toast.info("Recording is already in progress.", {
                duration: 3000,
                position: "top-center"
            });
            return;
        }

        // Create a new SpeechRecognition instance
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            try {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = true;
                
                // Set up event handlers
                recognitionRef.current.onresult = (event) => {
                    console.log("Speech recognition result received:", event.results);
                    try {
                        // Get the last result
                        const lastResult = event.results[event.results.length - 1];
                        const transcript = lastResult[0].transcript;
                        
                        // For interim results, just update the current caption
                        if (!lastResult.isFinal) {
                            console.log("Interim result:", transcript);
                            setCurrentCaption(transcript);
                        } else {
                            // For final results, add to the user answer
                            console.log("Final result:", transcript);
                            setUserAnswer(prev => {
                                // If this is the first final result, just set it
                                if (prev === '') {
                                    return transcript;
                                }
                                // Add the new text with a space
                                return prev + ' ' + transcript;
                            });
                            setCurrentCaption('');
                            
                            // Restart recognition to continue listening
                            if (phase === 'answering' && isRecording) {
                                console.log("Restarting recognition after final result");
                                try {
                                    recognitionRef.current.stop();
                                    setTimeout(() => {
                                        if (phase === 'answering' && isRecording) {
                                            try {
                                                recognitionRef.current.start();
                                            } catch (error) {
                                                console.error("Error starting speech recognition after restart:", error);
                                            }
                                        }
                                    }, 200);
                                } catch (error) {
                                    console.error("Error stopping speech recognition for restart:", error);
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Error processing speech recognition result:", error);
                    }
                };
                
                recognitionRef.current.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    
                    // Handle different error types appropriately
                    switch (event.error) {
                        case 'no-speech':
                            // Don't stop recording for no-speech, just show a warning
                            toast.warning("No speech detected. Please speak louder.", {
                                duration: 3000,
                                position: "top-center"
                            });
                            break;
                        case 'audio-capture':
                        case 'not-allowed':
                            // Stop recording for permission issues
                            setIsRecording(false);
                            toast.error("Microphone access issue. Please check your microphone permissions.", {
                                duration: 5000,
                                position: "top-center"
                            });
                            break;
                        case 'network':
                            // Don't stop recording for network issues, just show a warning
                            toast.warning("Network issue detected. Your speech may not be recorded properly.", {
                                duration: 3000,
                                position: "top-center"
                            });
                            break;
                        case 'aborted':
                            // This is a normal error when stopping recognition
                            break;
                        default:
                            // For other errors, stop recording
                            setIsRecording(false);
                            toast.error(`Speech recognition error: ${event.error}`, {
                                duration: 3000,
                                position: "top-center"
                            });
                    }
                };
                
                recognitionRef.current.onend = () => {
                    console.log("Speech recognition ended. Phase:", phase, "isRecording:", isRecording);
                    // Only restart if we're still in the answering phase
                    if (phase === 'answering' && isRecording) {
                        console.log("Attempting to restart recognition");
                        try {
                            recognitionRef.current.start();
                        } catch (error) {
                            console.error("Error restarting speech recognition:", error);
                            setIsRecording(false);
                            toast.error("Speech recognition stopped unexpectedly. Please try again.", {
                                duration: 3000,
                                position: "top-center"
                            });
                        }
                    } else {
                        setIsRecording(false);
                    }
                };
                
                // Start recording
                recognitionRef.current.start();
                setIsRecording(true);
                toast.info("Recording started manually! You can now speak your answer.", {
                    duration: 3000,
                    position: "top-center"
                });
            } catch (error) {
                console.error("Error starting speech recognition:", error);
                toast.error("Failed to start recording. Please try again.", {
                    duration: 3000,
                    position: "top-center"
                });
            }
        } else {
            console.error("Speech recognition not supported in this browser");
            toast.error("Speech recognition not supported in this browser. Please use Chrome or Edge.", {
                duration: 5000,
                position: "top-center"
            });
        }
    };

    // Add a function to manually stop recording
    const stopManualRecording = () => {
        if (!isRecording) {
            toast.info("No recording in progress.", {
                duration: 3000,
                position: "top-center"
            });
            return;
        }

        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
                setIsRecording(false);
                toast.info("Recording stopped manually.", {
                    duration: 3000,
                    position: "top-center"
                });
            } catch (error) {
                console.error("Error stopping recording:", error);
                toast.error("Error stopping recording. Please try again.", {
                    duration: 3000,
                    position: "top-center"
                });
            }
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (recognitionTimeoutRef.current) {
                clearTimeout(recognitionTimeoutRef.current);
            }
            if (isRecording && recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    return (
        <div className='flex flex-col gap-6 mt-8'>
            {/* Timer Display */}
            <div className='flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-[#3E3E3E] bg-white dark:bg-[#1E1E1E]'>
                <div className='flex items-center gap-4'>
                    <Timer className='h-5 w-5 text-[#8B5CF6]' />
                    <div className='flex flex-col'>
                        <div className='flex items-center gap-2'>
                            <span className='text-gray-900 dark:text-[#E6E6E6] text-sm'>
                                {phase === 'idle' ? 'Waiting for question...' :
                                 phase === 'preparing' ? 'Preparation Time' :
                                 phase === 'answering' ? 'Recording Time' :
                                 'Time\'s up!'}
                            </span>
                            {phase === 'preparing' && (
                                <span className='text-xs text-gray-500 dark:text-[#B3B3B3]'>
                                    (Recording will start automatically)
                                </span>
                            )}
                        </div>
                        {phase !== 'idle' && phase !== 'completed' && (
                            <div className='flex items-center gap-2'>
                                <span className={`text-xl font-medium ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-[#8B5CF6]'}`}>
                                    {formatTime(timeLeft)}
                                </span>
                                {phase === 'answering' && (
                                    <span className='text-xs text-gray-500 dark:text-[#B3B3B3]'>
                                        (15 sec limit)
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                {phase === 'answering' && (
                    <div className='flex items-center gap-4'>
                        {timeLeft <= 5 && (
                            <div className='flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-500'>
                                <AlertCircle className='h-4 w-4 text-red-500' />
                                <span className='text-xs text-red-500'>Time running out!</span>
                            </div>
                        )}
                        <Button
                            onClick={stopManualRecording}
                            variant="outline"
                            size="sm"
                            className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                            <StopCircle className="h-4 w-4 mr-2" />
                            Stop Recording
                        </Button>
                    </div>
                )}
            </div>

            {/* Camera Preview Section */}
            <div className='rounded-xl overflow-hidden border border-gray-200 dark:border-[#3E3E3E] bg-white dark:bg-gradient-to-b from-[#282828] to-[#1E1E1E]'>
                <div className='px-4 py-3 border-b border-gray-200 dark:border-[#3E3E3E] flex items-center justify-between bg-gray-50 dark:bg-[#1E1E1E]'>
                    <div className='flex items-center gap-3'>
                        <h3 className="text-gray-900 dark:text-[#E6E6E6] font-medium">Camera Preview</h3>
                        {emotionData && emotionData !== "No face detected" && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#282828] border border-gray-200 dark:border-[#3E3E3E]">
                                <span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>
                                <span className="text-xs text-[#8B5CF6]">{emotionData}</span>
                            </div>
                        )}
                    </div>
                    {emotionData === "No face detected" && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#282828] border border-gray-200 dark:border-[#3E3E3E]">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-xs text-red-400">Face not detected</span>
                        </div>
                    )}
                </div>
                
                <div className='p-6 flex justify-center items-center bg-white dark:bg-[#1E1E1E]'>
                    <div className='relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-[#3E3E3E] shadow-lg'>
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            className='w-auto h-[280px]'
                            videoConstraints={{
                                width: 640,
                                height: 360,
                                facingMode: "user"
                            }}
                            onUserMediaError={(error) => {
                                console.error("Webcam error:", error);
                                toast.error("Error accessing webcam. Please check your camera permissions.", {
                                    duration: 5000,
                                    position: "top-center"
                                });
                            }}
                        />
                        {!browserSupport.webcam && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                                <div className="text-center p-4">
                                    <p className="mb-2">Camera access denied</p>
                                    <Button
                                        onClick={() => window.location.reload()}
                                        variant="outline"
                                        size="sm"
                                        className="border-white text-white hover:bg-white/10"
                                    >
                                        Retry Camera Access
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Answer Section */}
            <div className='rounded-xl border border-gray-200 dark:border-[#3E3E3E] bg-white dark:bg-[#1E1E1E] overflow-hidden'>
                <div className='px-4 py-3 border-b border-gray-200 dark:border-[#3E3E3E] flex items-center justify-between'>
                    <h3 className="text-gray-900 dark:text-[#E6E6E6] font-medium">Your Answer</h3>
                    {isRecording && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#282828] border border-gray-200 dark:border-[#3E3E3E]">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-xs text-gray-900 dark:text-[#E6E6E6]">Recording in progress</span>
                        </div>
                    )}
                </div>

                <div className='p-6 min-h-[200px]'>
                    {isQuestionsLoading ? (
                        <div className="text-gray-500 dark:text-[#B3B3B3]">Loading questions...</div>
                    ) : !mockInterviewQuestion || !mockInterviewQuestion[activeQuestionIndex] ? (
                        <div className="text-gray-500 dark:text-[#B3B3B3]">No question available</div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-gray-900 dark:text-[#E6E6E6]">{userAnswer}</div>
                            
                            {isRecording && currentCaption && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#3E3E3E]">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#B3B3B3]">
                                        <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse"></span>
                                        <span>{currentCaption}</span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Manual Recording Controls */}
                            {phase === 'answering' && !isRecording && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#3E3E3E]">
                                    <Button
                                        onClick={startManualRecording}
                                        variant="outline"
                                        size="sm"
                                        className="border-[#8B5CF6] text-[#8B5CF6] hover:bg-purple-50 dark:hover:bg-[#3E3E3E]"
                                    >
                                        <Mic className="h-4 w-4 mr-2" />
                                        Start Recording Manually
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {userAnswer && userAnswer.length > 0 && !isQuestionsLoading && 
                 mockInterviewQuestion && mockInterviewQuestion[activeQuestionIndex] && (
                    <div className='px-6 py-3 border-t border-gray-200 dark:border-[#3E3E3E] flex justify-end gap-2 bg-gray-50 dark:bg-[#282828]'>
                        <Button 
                            onClick={() => {
                                setUserAnswer('');
                                setCurrentCaption('');
                            }} 
                            variant="outline"
                            size="sm"
                            className="border-[#8B5CF6] text-[#8B5CF6] hover:bg-purple-50 dark:hover:bg-[#3E3E3E]"
                        >
                            Clear
                        </Button>
                        <Button 
                            onClick={UpdateUserAnswer} 
                            disabled={loading || userAnswer.length < 10 || (isRecording && phase !== 'completed')}
                            size="sm"
                            className='bg-[#8B5CF6] text-white hover:bg-[#7C3AED] disabled:opacity-50'
                        >
                            {loading ? 'Submitting...' : 'Submit'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RecordAnswerSection;
