    return (
        <div className='flex flex-col gap-6'>
            {/* Question Navigation */}
            <div className='flex gap-2'>
                <Button 
                    variant="outline"
                    size="sm"
                    className={`rounded-full px-6 py-2 ${
                        activeQuestionIndex === 0 
                        ? 'bg-[#8B5CF6] text-white border-none' 
                        : 'bg-white dark:bg-[#1E1E1E] text-gray-800 dark:text-[#E6E6E6] border-gray-200 dark:border-[#2C2C2C] hover:bg-gray-100 dark:hover:bg-[#2C2C2C]'
                    }`}
                >
                    Question 1
                </Button>
                <Button 
                    variant="outline"
                    size="sm"
                    className={`rounded-full px-6 py-2 ${
                        activeQuestionIndex === 1
                        ? 'bg-[#8B5CF6] text-white border-none'
                        : 'bg-white dark:bg-[#1E1E1E] text-gray-800 dark:text-[#E6E6E6] border-gray-200 dark:border-[#2C2C2C] hover:bg-gray-100 dark:hover:bg-[#2C2C2C]'
                    }`}
                >
                    Question 2
                </Button>
            </div>

            {/* Question Content */}
            <div className='rounded-lg border border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#1E1E1E] overflow-hidden'>
                <div className='p-6'>
                    {isQuestionsLoading ? (
                        <div className="text-gray-500 dark:text-[#B3B3B3]">Loading questions...</div>
                    ) : !mockInterviewQuestion || !mockInterviewQuestion[activeQuestionIndex] ? (
                        <div className="text-gray-500 dark:text-[#B3B3B3]">No question available</div>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-gray-900 dark:text-[#E6E6E6] text-lg">
                                {mockInterviewQuestion[activeQuestionIndex]?.question}
                            </div>
                            
                            {/* Note Section */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-[#2D1B69] rounded-lg text-sm text-purple-900 dark:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lightbulb">
                                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                                    <path d="M9 18h6"/>
                                    <path d="M10 22h4"/>
                                </svg>
                                <span>Note: Make sure your face is visible in camera</span>
                            </div>
                            
                            {mockInterviewQuestion[activeQuestionIndex]?.hints && (
                                <div className="mt-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#B3B3B3]">
                                        <span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>
                                        <span>Hints</span>
                                    </div>
                                    <ul className="list-disc pl-5 text-gray-500 dark:text-[#B3B3B3] space-y-1">
                                        {mockInterviewQuestion[activeQuestionIndex]?.hints.map((hint, index) => (
                                            <li key={index}>{hint}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className='flex justify-end'>
                <Button 
                    onClick={handleNextQuestion} 
                    disabled={activeQuestionIndex === (mockInterviewQuestion?.length - 1) || isQuestionsLoading}
                    size="sm"
                    className="bg-[#8B5CF6] text-white hover:bg-[#7C3AED] rounded-full px-6 disabled:opacity-50"
                >
                    Next Question
                </Button>
            </div>
        </div>
    ); 