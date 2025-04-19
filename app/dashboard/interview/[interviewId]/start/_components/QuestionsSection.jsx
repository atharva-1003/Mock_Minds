import { Lightbulb, Volume2 } from 'lucide-react'
import React from 'react'

function QuestionsSection({ mockInterviewQuestion, activeQuestionIndex }) {


    const textToSpeach = (text) => {
        if ('speechSynthesis' in window) {
            const speech = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(speech)
        }
        else {
            alert('Sorry, Your browser does not support text to speech')
        }
    }
    return mockInterviewQuestion && (
        <div className='p-5 border dark:border-gray-700 rounded-lg my-10'>
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'>
                {Array.isArray(mockInterviewQuestion) && mockInterviewQuestion.map((q, index) => (
                    <h2
                        key={index}
                        className={`p-2 border dark:border-gray-700 rounded-full text-xs md:text-sm text-center cursor-pointer
      ${activeQuestionIndex === index ? 'bg-purple-600 text-white' : 'dark:text-gray-300'}`}
                    >
                        Question {index + 1}
                    </h2>
                ))}

            </div>
            <h2 className='my-5 text-md md:text-lg text-gray-900 dark:text-gray-100'>{mockInterviewQuestion[activeQuestionIndex]?.question}</h2>
            <Volume2 className='cursor-pointer text-gray-700 dark:text-gray-300' onClick={() => textToSpeach(mockInterviewQuestion[activeQuestionIndex]?.question)} />

            <div className='border dark:border-purple-800 rounded-lg p-5 bg-purple-100 dark:bg-purple-900/30 mt-20'>
                <h2 className='flex gap-2 items-center text-purple-600 dark:text-purple-400'>
                    <Lightbulb />
                    <strong>Note: Make sure your face is visible in camera</strong>
                </h2>
                <h2 className='text-sm text-purple-600 dark:text-purple-400 my-2'>{process.env.NEXT_PUBLIC_QUESTION_NOTE}</h2>
            </div>
        </div>
    )
}

export default QuestionsSection