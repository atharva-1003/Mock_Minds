import React from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';

const CameraPreview = ({ webcamRef, browserSupport, emotionData }) => {
    return (
        <div className='rounded-xl overflow-hidden border border-gray-200 dark:border-[#3E3E3E] bg-white dark:bg-gradient-to-b from-[#282828] to-[#1E1E1E]'>
            <div className='px-4 py-3 border-b border-gray-200 dark:border-[#3E3E3E] flex items-center justify-between bg-gray-50 dark:bg-[#1E1E1E]'>
                <div className='flex items-center gap-3'>
                    <h3 className="text-gray-900 dark:text-[#E6E6E6] font-medium">Camera Preview</h3>
                </div>
            </div>
            
            <div className='p-4 flex justify-center items-center bg-white dark:bg-[#1E1E1E] relative'>
                <div className='relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-[#3E3E3E] shadow-lg'>
                    <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        className='w-auto h-[240px] sm:h-[280px]'
                        videoConstraints={{
                            width: 640,
                            height: 360,
                            facingMode: "user"
                        }}
                        onUserMediaError={(error) => {
                            console.error("Webcam error:", error);
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
                    
                    {/* Floating Emotion Display */}
                    {emotionData && emotionData !== "No face detected" && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100/80 dark:bg-[#282828]/80 border border-gray-200 dark:border-[#3E3E3E] backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>
                            <span className="text-xs text-[#8B5CF6] font-medium">{emotionData}</span>
                        </div>
                    )}
                    
                    {emotionData === "No face detected" && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100/80 dark:bg-[#282828]/80 border border-gray-200 dark:border-[#3E3E3E] backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-xs text-red-400 font-medium">Face not detected</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CameraPreview; 