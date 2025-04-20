import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

const AnswerSection = ({ 
    isQuestionsLoading, 
    mockInterviewQuestion, 
    activeQuestionIndex, 
    userAnswer, 
    isRecording, 
    currentCaption, 
    onClearAnswer, 
    onStopAndSubmit, 
    loading,
    phase,
    timeLeft
}) => {
    const isSubmittingRef = useRef(false);

    // Handle stop and submit with async function
    const handleStopAndSubmit = async () => {
        if (isSubmittingRef.current) return;
        
        try {
            isSubmittingRef.current = true;
            if (onStopAndSubmit) {
                await onStopAndSubmit();
            }
        } finally {
            isSubmittingRef.current = false;
        }
    };

    // Auto-submit when timer expires
    useEffect(() => {
        let timeoutId;
        
        const autoSubmit = async () => {
            if (isSubmittingRef.current) return;
            
            if (phase === 'answering' && timeLeft === 0 && userAnswer && userAnswer.length > 0 && !loading) {
                console.log('Auto-submitting answer when timer expires');
                await handleStopAndSubmit();
            }
        };
        
        // Add a small delay to ensure all states are updated
        timeoutId = setTimeout(autoSubmit, 100);
        
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [phase, timeLeft, userAnswer, loading]);

    return (
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

            <div className='p-4 sm:p-6 min-h-[150px] sm:min-h-[200px]'>
                {isQuestionsLoading ? (
                    <div className="text-gray-500 dark:text-[#B3B3B3]">Loading questions...</div>
                ) : !mockInterviewQuestion || !mockInterviewQuestion[activeQuestionIndex] ? (
                    <div className="text-gray-500 dark:text-[#B3B3B3]">No question available</div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-gray-900 dark:text-[#E6E6E6] break-words">{userAnswer}</div>
                        
                        {isRecording && currentCaption && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#3E3E3E]">
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#B3B3B3]">
                                    <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse"></span>
                                    <span className="break-words">{currentCaption}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            {userAnswer && userAnswer.length > 0 && !isQuestionsLoading && 
             mockInterviewQuestion && mockInterviewQuestion[activeQuestionIndex] && (
                <div className='px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-[#3E3E3E] flex justify-end gap-2 bg-gray-50 dark:bg-[#282828]'>
                    <Button 
                        onClick={onClearAnswer}
                        variant="outline"
                        size="sm"
                        className="border-[#8B5CF6] text-[#8B5CF6] hover:bg-purple-50 dark:hover:bg-[#3E3E3E]"
                    >
                        Clear
                    </Button>
                    <Button 
                        onClick={handleStopAndSubmit} 
                        disabled={loading || userAnswer.length < 10 || (isRecording && phase === 'preparing') || isSubmittingRef.current}
                        size="sm"
                        className='bg-[#8B5CF6] text-white hover:bg-[#7C3AED] disabled:opacity-50'
                    >
                        {loading || isSubmittingRef.current ? 'Submitting...' : 'Stop and Submit'}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default AnswerSection; 