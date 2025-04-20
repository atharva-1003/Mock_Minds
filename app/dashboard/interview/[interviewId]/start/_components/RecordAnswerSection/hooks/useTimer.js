import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export const useTimer = (prepTime, answerTime, onTimeUp) => {
    // Log the timer values for debugging
    console.log('useTimer hook received values:', { prepTime, answerTime });
    
    const [phase, setPhase] = useState('idle'); // idle, preparing, answering, completed
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef(null);
    const hasStartedPrep = useRef(false);
    const onTimeUpRef = useRef(onTimeUp);

    // Update the ref when onTimeUp changes
    useEffect(() => {
        onTimeUpRef.current = onTimeUp;
    }, [onTimeUp]);

    const startPreparationPhase = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        
        setPhase('preparing');
        setTimeLeft(prepTime);
        
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            const remainingTime = Math.max(0, prepTime - elapsedTime);
            
            setTimeLeft(remainingTime);
            
            if (remainingTime <= 0) {
                clearInterval(timerRef.current);
                startAnsweringPhase();
            }
        }, 100);
    };

    const startAnsweringPhase = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        setPhase('answering');
        setTimeLeft(answerTime);
        
        const startTime = Date.now();
        let hasShownWarning = false;
        let hasCalledTimeUp = false;

        console.log('Starting answering phase with timer callback:', !!onTimeUpRef.current);

        timerRef.current = setInterval(() => {
            const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            const remainingTime = Math.max(0, answerTime - elapsedTime);
            
            setTimeLeft(remainingTime);
            
            if (remainingTime === 5 && !hasShownWarning) {
                hasShownWarning = true;
                toast.warning("5 seconds remaining!", {
                    duration: 2000,
                    position: "top-center"
                });
            }
            
            if (remainingTime <= 0 && !hasCalledTimeUp) {
                hasCalledTimeUp = true;
                clearInterval(timerRef.current);
                setPhase('completed');
                console.log('Timer expired, calling onTimeUp callback');
                
                // Use setTimeout to ensure this runs after the current execution context
                setTimeout(() => {
                    if (onTimeUpRef.current) {
                        try {
                            console.log('Executing onTimeUp callback in setTimeout');
                            onTimeUpRef.current();
                            console.log('onTimeUp callback executed successfully');
                        } catch (error) {
                            console.error('Error executing onTimeUp callback:', error);
                            console.error('Error details:', {
                                message: error.message,
                                stack: error.stack,
                                name: error.name
                            });
                        }
                    } else {
                        console.error('onTimeUp callback is not defined');
                    }
                }, 0);
            }
        }, 100);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setPhase('completed');
    };

    const resetTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setPhase('idle');
        setTimeLeft(0);
        hasStartedPrep.current = false;
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    return {
        phase,
        timeLeft,
        hasStartedPrep,
        startPreparationPhase,
        startAnsweringPhase,
        stopTimer,
        resetTimer
    };
}; 