"use client"
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { chatSession } from '@/utils/GeminiAIModal';
import { db } from '@/utils/db';
import { UserAnswer } from '@/utils/schema';
import { useUser } from '@clerk/nextjs';
import moment from 'moment';

// Import components
import CameraPreview from './components/CameraPreview';
import TimerDisplay from './components/TimerDisplay';
import AnswerSection from './components/AnswerSection';

// Import hooks
import { useEmotionDetection } from './hooks/useEmotionDetection';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useTimer } from './hooks/useTimer';

// Import utilities
import { checkBrowserSupport } from './utils/browserSupport';

// Constants for timer durations (in seconds)
const PREP_TIME = parseInt(process.env.NEXT_PUBLIC_PREP_TIME) || 10;  // Default to 10 seconds if not set
const ANSWER_TIME = parseInt(process.env.NEXT_PUBLIC_ANSWER_TIME) || 10;  // Default to 10 seconds if not set

// Log the timer values for debugging
console.log('Timer values from environment:', {
  PREP_TIME,
  ANSWER_TIME,
  envPrepTime: process.env.NEXT_PUBLIC_PREP_TIME,
  envAnswerTime: process.env.NEXT_PUBLIC_ANSWER_TIME
});

// Add this function before the RecordAnswerSection component
const saveAnswerToDatabase = async (answer, feedback, rating, interviewData, mockInterviewQuestion, activeQuestionIndex, user, emotionHistory) => {
    try {
        // Validate required fields
        if (!interviewData?.mockId || !mockInterviewQuestion?.[activeQuestionIndex]?.question) {
            console.error('Missing required fields:', { 
                mockId: interviewData?.mockId, 
                question: mockInterviewQuestion?.[activeQuestionIndex]?.question 
            });
            throw new Error('Missing required fields for database insertion');
        }

        const answerData = {
            mockIdRef: interviewData.mockId,
            question: mockInterviewQuestion[activeQuestionIndex].question,
            correctAns: mockInterviewQuestion[activeQuestionIndex].answer,
            userAns: answer || '',
            feedback: feedback || '',
            rating: rating || '0',
            userEmail: user?.primaryEmailAddress?.emailAddress,
            createdAt: moment().format('DD-MM-yyyy')
        };
        
        console.log('Attempting to save answer with data:', {
            mockIdRef: answerData.mockIdRef,
            question: answerData.question,
            userAns: answerData.userAns.substring(0, 50) + '...',
            userEmail: answerData.userEmail
        });
        
        // Try with emotion history first
        try {
            if (emotionHistory && emotionHistory.length > 0) {
                answerData.emotionHistory = JSON.stringify(emotionHistory);
            }
            const result = await db.insert(UserAnswer).values(answerData);
            console.log('Database insertion successful:', result);
            return result;
        } catch (error) {
            console.error('Error in database insertion:', error);
            if (error.message.includes('column "emotionHistory"')) {
                // Retry without emotion history
                console.log('Retrying without emotion history');
                delete answerData.emotionHistory;
                const result = await db.insert(UserAnswer).values(answerData);
                console.log('Database insertion successful (without emotion history):', result);
                return result;
            }
            throw error;
        }
    } catch (error) {
        console.error('Database insertion error:', error);
        // Add more context to the error
        if (error.message === 'Missing required fields for database insertion') {
            throw new Error('Missing required fields for database insertion');
        } else {
            throw new Error(`Database error: ${error.message}`);
        }
    }
};

// Add this function before the RecordAnswerSection component
const resetStates = async (setUserAnswer, setCurrentCaption, setEmotionData, setEmotionHistory, resetRecognition) => {
    try {
        // Wait for database operation to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Batch state updates
        await Promise.all([
            setUserAnswer(''),
            setCurrentCaption(''),
            setEmotionData(null),
            setEmotionHistory([])
        ]);
        
        // Clear localStorage after state updates
        localStorage.removeItem("emotions");
        
        // Reset speech recognition
        if (resetRecognition) {
            resetRecognition();
        } else {
            console.warn('resetRecognition function not provided to resetStates');
        }
    } catch (error) {
        console.error('Error resetting states:', error);
        throw error;
    }
};

function RecordAnswerSection({ mockInterviewQuestion, activeQuestionIndex, interviewData, setActiveQuestionIndex }) {
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [isQuestionsLoading, setIsQuestionsLoading] = useState(true);
    const [browserSupport, setBrowserSupport] = useState({
        speechRecognition: false,
        webcam: false,
        microphone: false
    });
    
    const webcamRef = useRef(null);
    
    // First, initialize speech recognition to get isRecording
    const {
        isRecording,
        userAnswer,
        currentCaption,
        setUserAnswer,
        setCurrentCaption,
        startRecording,
        stopRecording,
        resetRecognition
    } = useSpeechRecognition();
    
    // Then use isRecording in emotion detection
    const {
        emotionData,
        emotionHistory,
        setEmotionData,
        setEmotionHistory
    } = useEmotionDetection(webcamRef, isRecording);
    
    // Add a ref to track submission status
    const submissionInProgress = useRef(false);
    
    // Timer hook
    const {
        phase,
        timeLeft,
        hasStartedPrep,
        startPreparationPhase,
        startAnsweringPhase,
        stopTimer,
        resetTimer
    } = useTimer(PREP_TIME, ANSWER_TIME, () => {
        console.log('Timer expired callback triggered');
        // Call handleRecordingStop with isTimerExpired=true to ensure the same behavior as clicking submit
        handleRecordingStop(true);
    });

    // Add a ref to track if preparation toast has been shown
    const preparationToastShown = useRef(false);

    // Check browser support on component mount
    useEffect(() => {
        const checkSupport = async () => {
            const support = await checkBrowserSupport();
            setBrowserSupport(support);
            
            if (!support.speechRecognition) {
                toast.error("Your browser doesn't support speech recognition. Please use Chrome or Edge.", {
                    id: "browser-support-toast",
                    duration: 5000,
                    position: "top-right"
                });
            }
            if (!support.webcam) {
                toast.error("Unable to access webcam. Please check your camera permissions.", {
                    id: "webcam-permission-toast",
                    duration: 5000,
                    position: "top-right"
                });
            }
            if (!support.microphone) {
                toast.error("Unable to access microphone. Please check your microphone permissions.", {
                    id: "microphone-permission-toast",
                    duration: 5000,
                    position: "top-right"
                });
            }
        };
        
        checkSupport();
    }, []);

    // Reset states when question changes
    useEffect(() => {
        console.log('Question change effect - Current question:', mockInterviewQuestion?.[activeQuestionIndex]);
        if (mockInterviewQuestion && mockInterviewQuestion[activeQuestionIndex]) {
            console.log('Resetting states for new question');
            stopRecording();
            resetTimer();
            setUserAnswer('');
            setCurrentCaption('');
            setEmotionData(null);
            setEmotionHistory([]);
            localStorage.removeItem("emotions");
            setIsQuestionsLoading(false);
            // Reset preparation toast flag
            preparationToastShown.current = false;
            
            // Reset speech recognition
            resetRecognition();
        }
    }, [activeQuestionIndex, mockInterviewQuestion]);

    // Set initial loading state
    useEffect(() => {
        console.log('Initial loading effect - Questions:', mockInterviewQuestion);
        if (mockInterviewQuestion) {
            setIsQuestionsLoading(false);
        }
    }, [mockInterviewQuestion]);

    // Start preparation phase when question loads
    useEffect(() => {
        console.log('Preparation phase effect - Question loading:', isQuestionsLoading);
        if (mockInterviewQuestion && 
            mockInterviewQuestion[activeQuestionIndex] && 
            !isQuestionsLoading && 
            !hasStartedPrep.current) {
            
            console.log('Starting preparation phase');
            hasStartedPrep.current = true;
            startPreparationPhase();
            
            // Only show preparation toast if it hasn't been shown yet
            if (!preparationToastShown.current) {
                preparationToastShown.current = true;
                toast.info("Preparation time started. Get ready to answer.", {
                    id: "preparation-toast",
                    duration: 3000,
                    position: "top-right"
                });
            }
        }
    }, [mockInterviewQuestion, activeQuestionIndex, isQuestionsLoading]);

    // Start recording when answering phase begins
    useEffect(() => {
        if (phase === 'answering' && !isRecording) {
            startRecording();
            
            // Show answering toast with a unique ID to prevent stacking
            toast.info("Answering phase started. Please speak now.", {
                id: "answering-toast",
                duration: 3000,
                position: "top-right"
            });
        }
    }, [phase, isRecording]);

    // Auto-submit when timer expires
    useEffect(() => {
        if (phase === 'answering' && timeLeft === 0 && !loading) {
            console.log('Timer expired, auto-submitting answer');
            // Call handleRecordingStop with isTimerExpired=true to ensure the same behavior as clicking submit
            handleRecordingStop(true);
        }
    }, [phase, timeLeft, loading]);

    // Handle recording stop
    const handleRecordingStop = async (isTimerExpired = false) => {
        console.log('Recording stopped, timer expired:', isTimerExpired);
        
        // Prevent multiple submissions
        if (loading) {
            console.log('Already submitting, skipping submission');
            return;
        }
        
        // Set loading state
        setLoading(true);
        
        try {
            let finalAnswer = '';
            
            // Ensure recording is stopped and get final transcript
            if (isRecording) {
                console.log('Stopping active recording');
                finalAnswer = await stopRecording();
                stopTimer();
                
                // Update the user answer with the final transcript
                setUserAnswer(finalAnswer);
                
                // Wait a moment for the state to update
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // If there's content or timer expired, submit it
            if (finalAnswer && finalAnswer.trim().length > 0 || isTimerExpired) {
                console.log('Submitting answer with content:', finalAnswer ? finalAnswer.substring(0, 50) + '...' : 'Timer expired');
                
                // Show submission in progress toast
                toast.info("Submitting your answer...", {
                    id: "submission-toast",
                    duration: 3000,
                    position: "top-right"
                });
                
                // Get AI feedback
                const feedbackPrompt = "Question:" + mockInterviewQuestion[activeQuestionIndex]?.question +
                    ", User Answer:" + finalAnswer + ",Depends on question and user answer for give interview question " +
                    " please give us rating out of 10 for answer and feedback as area of improvmenet if any " +
                    "in just 3 to 5 lines to improve it in JSON format with rating field and feedback field";
                
                const result = await chatSession.sendMessage(feedbackPrompt);
                const mockJsonResp = (await result.response.text()).replace('```json', '').replace('```', '');
                const JsonFeedbackResp = JSON.parse(mockJsonResp);
                
                // Save to database using the new function
                const resp = await saveAnswerToDatabase(
                    finalAnswer,
                    JsonFeedbackResp?.feedback,
                    JsonFeedbackResp?.rating,
                    interviewData,
                    mockInterviewQuestion,
                    activeQuestionIndex,
                    user,
                    emotionHistory
                );
                
                if (resp) {
                    console.log('Answer successfully recorded in database');
                    
                    // Show success message
                    toast.success("Your answer has been submitted successfully!", {
                        id: "success-toast",
                        duration: 3000,
                        position: "top-right"
                    });
                    
                    // Reset states using the new function
                    await resetStates(setUserAnswer, setCurrentCaption, setEmotionData, setEmotionHistory, resetRecognition);
                    
                    // Reset preparation flag to allow next question to start preparation
                    hasStartedPrep.current = false;
                    
                    // Navigate to next question if available
                    if (setActiveQuestionIndex && activeQuestionIndex < mockInterviewQuestion.length - 1) {
                        await moveToNextQuestion();
                    }
                } else {
                    throw new Error('Database insert returned falsy value');
                }
            } else {
                console.log('No content to submit');
                toast.warning("No answer recorded. Please try again.", {
                    id: "no-answer-toast",
                    duration: 3000,
                    position: "top-right"
                });
            }
        } catch (error) {
            console.error('Error in submission:', error);
            // Provide more specific error message based on the error type
            if (error.message === 'Database insert returned falsy value') {
                toast.error("Failed to submit answer. Please try again.", {
                    id: "submission-error-toast",
                    duration: 3000,
                    position: "top-right"
                });
            } else if (error.message.includes('Missing required fields')) {
                toast.error("Missing required information. Please try again.", {
                    id: "submission-error-toast",
                    duration: 3000,
                    position: "top-right"
                });
            } else {
                // For other errors, show a more specific message
                toast.error(`Submission error: ${error.message.substring(0, 50)}...`, {
                    id: "submission-error-toast",
                    duration: 3000,
                    position: "top-right"
                });
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle auto-submission when timer expires
    const handleAutoSubmit = async () => {
        console.log('Auto-submitting answer...', {
            isRecording,
            userAnswer: userAnswer ? userAnswer.substring(0, 50) + '...' : 'empty',
            loading,
            phase,
            timeLeft
        });
        
        // Prevent multiple submissions
        if (loading) {
            console.log('Already submitting, skipping auto-submission');
            return;
        }
        
        // Set loading state
        setLoading(true);
        
        try {
            // First, stop the timer to prevent any race conditions
            stopTimer();
            
            // Force stop recording if it's still active
            if (isRecording) {
                console.log('Forcing stop of active recording for auto-submission');
                
                // Create a new promise to handle the recording stop
                const stopRecordingPromise = new Promise((resolve) => {
                    try {
                        // Store the current answer
                        let finalAnswer = userAnswer;
                        
                        // Set up final result handler
                        const finalResultHandler = (event) => {
                            console.log('Final speech recognition result received');
                            const transcript = Array.from(event.results)
                                .map(result => result[0].transcript)
                                .join(' ');
                            
                            console.log('Final transcript:', transcript);
                            
                            // Update the final answer
                            finalAnswer = finalAnswer ? finalAnswer + ' ' + transcript : transcript;
                            console.log('Updated final answer:', finalAnswer);
                        };
                        
                        // Add the final result handler
                        if (recognitionRef.current) {
                            recognitionRef.current.onresult = finalResultHandler;
                            recognitionRef.current.stop();
                        }
                        
                        // Wait a bit to ensure we get any final results
                        setTimeout(() => {
                            // Update the state with the final answer
                            setUserAnswer(finalAnswer);
                            setIsRecording(false);
                            console.log('Resolving stopRecording with final answer:', finalAnswer);
                            resolve(finalAnswer);
                        }, 1000);
                    } catch (error) {
                        console.error('Error stopping recognition:', error);
                        setIsRecording(false);
                        console.log('Resolving stopRecording with current userAnswer due to error:', userAnswer);
                        resolve(userAnswer);
                    }
                });
                
                // Wait for the recording to stop
                const finalAnswer = await stopRecordingPromise;
                console.log('Final answer from stopRecording:', finalAnswer ? finalAnswer.substring(0, 50) + '...' : 'empty');
                
                // Update the user answer with the final transcript
                setUserAnswer(finalAnswer);
                console.log('Updated userAnswer state with final transcript');
                
                // Wait a moment for the state to update
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // If there's content, submit it
                if (finalAnswer && finalAnswer.trim().length > 0) {
                    console.log('Submitting answer with content:', finalAnswer.substring(0, 50) + '...');
                    
                    // Show submission in progress toast
                    toast.info("Submitting your answer...", {
                        id: "submission-toast",
                        duration: 3000,
                        position: "top-right"
                    });
                    
                    // Get AI feedback
                    const feedbackPrompt = "Question:" + mockInterviewQuestion[activeQuestionIndex]?.question +
                        ", User Answer:" + finalAnswer + ",Depends on question and user answer for give interview question " +
                        " please give us rating out of 10 for answer and feedback as area of improvmenet if any " +
                        "in just 3 to 5 lines to improve it in JSON format with rating field and feedback field";
                    
                    const result = await chatSession.sendMessage(feedbackPrompt);
                    const mockJsonResp = (await result.response.text()).replace('```json', '').replace('```', '');
                    const JsonFeedbackResp = JSON.parse(mockJsonResp);
                    
                    console.log('Saving answer to database with data:', {
                        mockIdRef: interviewData?.mockId,
                        question: mockInterviewQuestion[activeQuestionIndex]?.question,
                        userAns: finalAnswer.substring(0, 50) + '...',
                        userEmail: user?.primaryEmailAddress?.emailAddress
                    });
                    
                    const resp = await db.insert(UserAnswer)
                        .values({
                            mockIdRef: interviewData?.mockId,
                            question: mockInterviewQuestion[activeQuestionIndex]?.question,
                            correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
                            userAns: finalAnswer,
                            feedback: JsonFeedbackResp?.feedback,
                            rating: JsonFeedbackResp?.rating,
                            userEmail: user?.primaryEmailAddress?.emailAddress,
                            createdAt: moment().format('DD-MM-yyyy'),
                            emotionHistory: JSON.stringify(emotionHistory)
                        });
                    
                    console.log('Database insert response:', resp);
                    
                    if (resp) {
                        console.log('Answer successfully recorded in database');
                        
                        // Show success message
                        toast.success("Your answer has been submitted successfully!", {
                            id: "success-toast",
                            duration: 3000,
                            position: "top-right"
                        });
                        
                        // Reset states after successful submission
                        await resetStates(setUserAnswer, setCurrentCaption, setEmotionData, setEmotionHistory, resetRecognition);
                        
                        // Wait a moment to ensure all state updates are processed and database operation is complete
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Navigate to next question if available
                        if (setActiveQuestionIndex && activeQuestionIndex < mockInterviewQuestion.length - 1) {
                            console.log('Moving to next question after successful submission');
                            setActiveQuestionIndex(activeQuestionIndex + 1);
                        } else {
                            console.log('No more questions available');
                        }
                    } else {
                        console.error('Database insert returned falsy value');
                        toast.error("Failed to record answer", {
                            id: "recording-error-toast",
                            duration: 3000,
                            position: "top-right"
                        });
                    }
                } else {
                    console.log('No content to submit');
                    toast.warning("No answer recorded. Please try again.", {
                        id: "no-answer-toast",
                        duration: 3000,
                        position: "top-right"
                    });
                }
            } else {
                console.log('No active recording to stop');
                stopTimer();
            }
        } catch (error) {
            console.error('Error in auto-submission:', error);
            // Provide more specific error message based on the error type
            if (error.message === 'Database insert returned falsy value') {
                toast.error("Failed to submit answer. Please try again.", {
                    id: "submission-error-toast",
                    duration: 3000,
                    position: "top-right"
                });
            } else if (error.message.includes('Missing required fields')) {
                toast.error("Missing required information. Please try again.", {
                    id: "submission-error-toast",
                    duration: 3000,
                    position: "top-right"
                });
            } else {
                // For other errors, show a more specific message
                toast.error(`Submission error: ${error.message.substring(0, 50)}...`, {
                    id: "submission-error-toast",
                    duration: 3000,
                    position: "top-right"
                });
            }
        } finally {
            setLoading(false);
        }
    };

    // Function to move to the next question
    const moveToNextQuestion = async () => {
        console.log('Moving to next question');
        // Ensure we're not in the middle of a submission
        if (loading) {
            console.log('Still loading, waiting before moving to next question');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Double-check that we're not in the middle of a submission
        if (!loading) {
            console.log('Setting active question index to:', activeQuestionIndex + 1);
            setActiveQuestionIndex(activeQuestionIndex + 1);
        } else {
            console.log('Still loading after waiting, not moving to next question');
        }
    };

    // Update user answer in database
    const UpdateUserAnswer = async () => {
        console.log('Updating user answer...');
        console.log('Current user answer:', userAnswer);
        console.log('Current question index:', activeQuestionIndex);
        console.log('Interview data:', interviewData);
        
        // If there's no user answer, don't proceed
        if (!userAnswer || userAnswer.trim().length === 0) {
            console.log('No user answer to submit');
            toast.warning("No answer recorded. Please try again.", {
                id: "no-answer-toast",
                duration: 3000,
                position: "top-right"
            });
            return;
        }
        
        setLoading(true);
        const feedbackPrompt = "Question:" + mockInterviewQuestion[activeQuestionIndex]?.question +
            ", User Answer:" + userAnswer + ",Depends on question and user answer for give interview question " +
            " please give us rating out of 10 for answer and feedback as area of improvmenet if any " +
            "in just 3 to 5 lines to improve it in JSON format with rating field and feedback field";

        try {
            console.log('Sending feedback prompt to AI...');
            const result = await chatSession.sendMessage(feedbackPrompt);
            const mockJsonResp = (await result.response.text()).replace('```json', '').replace('```', '');
            console.log('AI feedback response:', mockJsonResp);
            
            const JsonFeedbackResp = JSON.parse(mockJsonResp);
            console.log('Parsed feedback response:', JsonFeedbackResp);

            try {
                console.log('Inserting answer into database...');
                console.log('Data to insert:', {
                    mockIdRef: interviewData?.mockId,
                    question: mockInterviewQuestion[activeQuestionIndex]?.question,
                    correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
                    userAns: userAnswer,
                    feedback: JsonFeedbackResp?.feedback,
                    rating: JsonFeedbackResp?.rating,
                    userEmail: user?.primaryEmailAddress?.emailAddress,
                    createdAt: moment().format('DD-MM-yyyy'),
                    emotionHistory: JSON.stringify(emotionHistory)
                });
                
                // Create a copy of the user answer to ensure it's captured correctly
                const answerToSubmit = userAnswer;
                
                const resp = await db.insert(UserAnswer)
                    .values({
                        mockIdRef: interviewData?.mockId,
                        question: mockInterviewQuestion[activeQuestionIndex]?.question,
                        correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
                        userAns: answerToSubmit,
                        feedback: JsonFeedbackResp?.feedback,
                        rating: JsonFeedbackResp?.rating,
                        userEmail: user?.primaryEmailAddress?.emailAddress,
                        createdAt: moment().format('DD-MM-yyyy'),
                        emotionHistory: JSON.stringify(emotionHistory)
                    });

                if (resp) {
                    console.log('Answer successfully recorded in database');
                    toast.success("Answer recorded", {
                        duration: 1000,
                        position: "top-right"
                    });
                    
                    // Reset states after successful submission
                    await resetStates(setUserAnswer, setCurrentCaption, setEmotionData, setEmotionHistory, resetRecognition);
                    
                    // Wait a moment to ensure all state updates are processed and database operation is complete
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Navigate to next question if available ONLY after successful database insertion
                    if (setActiveQuestionIndex && activeQuestionIndex < mockInterviewQuestion.length - 1) {
                        console.log('Moving to next question after successful submission');
                        setActiveQuestionIndex(activeQuestionIndex + 1);
                    } else {
                        console.log('No more questions available');
                    }
                } else {
                    console.error('Database insert returned falsy value');
                    toast.error("Failed to record answer", {
                        id: "recording-error-toast",
                        duration: 3000,
                        position: "top-right"
                    });
                }
            } catch (error) {
                console.error('Error saving user answer:', error);
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                });
                
                if (error.message.includes('column "emotionHistory"')) {
                    console.log('Retrying without emotionHistory field...');
                    // Create a copy of the user answer to ensure it's captured correctly
                    const answerToSubmit = userAnswer;
        
                    const resp = await db.insert(UserAnswer)
                        .values({
                            mockIdRef: interviewData?.mockId,
                            question: mockInterviewQuestion[activeQuestionIndex]?.question,
                            correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
                            userAns: answerToSubmit,
                            feedback: JsonFeedbackResp?.feedback,
                            rating: JsonFeedbackResp?.rating,
                            userEmail: user?.primaryEmailAddress?.emailAddress,
                            createdAt: moment().format('DD-MM-yyyy')
                        });

                    if (resp) {
                        console.log('Answer successfully recorded in database (without emotion history)');
                        toast.success("Answer recorded", {
                            duration: 1000,
                            position: "top-right"
                        });
                        
                        // Reset states after successful submission
                        await resetStates(setUserAnswer, setCurrentCaption, setEmotionData, setEmotionHistory, resetRecognition);
                        
                        // Wait a moment to ensure all state updates are processed and database operation is complete
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Navigate to next question if available ONLY after successful database insertion
                        if (setActiveQuestionIndex && activeQuestionIndex < mockInterviewQuestion.length - 1) {
                            console.log('Moving to next question after successful submission');
                            setActiveQuestionIndex(activeQuestionIndex + 1);
                        } else {
                            console.log('No more questions available');
                        }
                    } else {
                        console.error('Database insert returned falsy value (retry without emotionHistory)');
                        toast.error("Failed to record answer", {
                            id: "recording-error-toast",
                            duration: 3000,
                            position: "top-right"
                        });
                    }
                } else {
                    console.error('Failed to record answer:', error);
                    toast.error("Failed to record", {
                        id: "general-error-toast",
                        duration: 3000,
                        position: "top-right"
                    });
                }
            }
        } catch (error) {
            console.error('Error getting feedback:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            toast.error("Failed to get feedback. Please try again.", {
                id: "feedback-error-toast",
                duration: 3000,
                position: "top-right"
            });
        }

        setLoading(false);
    };

    // Handle clear answer
    const handleClearAnswer = () => {
        setUserAnswer('');
        setCurrentCaption('');
    };

    return (
        <div className='flex flex-col gap-4 mt-4 max-w-full overflow-hidden'>
            <CameraPreview 
                webcamRef={webcamRef}
                browserSupport={browserSupport}
                emotionData={emotionData}
            />
            
            <TimerDisplay 
                phase={phase}
                timeLeft={timeLeft}
            />
            
            <AnswerSection 
                isQuestionsLoading={isQuestionsLoading}
                mockInterviewQuestion={mockInterviewQuestion}
                activeQuestionIndex={activeQuestionIndex}
                userAnswer={userAnswer}
                isRecording={isRecording}
                currentCaption={currentCaption}
                onClearAnswer={handleClearAnswer}
                onStopAndSubmit={() => handleRecordingStop(false)}
                loading={loading}
                phase={phase}
                timeLeft={timeLeft}
            />
        </div>
    );
}

export default RecordAnswerSection; 