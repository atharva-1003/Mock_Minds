import React from 'react';
import { Timer, AlertCircle } from 'lucide-react';
import { formatTime } from '../utils/formatTime';

// Get the answer time from environment variable
const ANSWER_TIME = parseInt(process.env.NEXT_PUBLIC_ANSWER_TIME) || 10;

const TimerDisplay = ({ phase, timeLeft }) => {
    return (
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
                                    ({ANSWER_TIME} sec limit)
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {phase === 'answering' && timeLeft <= 5 && (
                <div className='flex items-center gap-2 text-red-500'>
                    <AlertCircle className='h-5 w-5' />
                    <span className='text-sm'>Time running out!</span>
                </div>
            )}
        </div>
    );
};

export default TimerDisplay; 