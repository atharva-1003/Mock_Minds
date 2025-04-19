"use client"
import { db } from '@/utils/db'
import { UserAnswer, OverallFeedback, ConfidenceMetrics } from '@/utils/schema'
import { eq } from 'drizzle-orm'
import React, { useEffect, useState } from 'react'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { chatSession } from '@/utils/GeminiAIModal'
import moment from 'moment'

function Feedback({params}) {
    const [feedbackList, setFeedbackList] = useState([]);
    const [overallFeedback, setOverallFeedback] = useState(null);
    const [confidenceData, setConfidenceData] = useState({
        emotionCounts: {},
        confidenceScore: 0,
        confidencePercentage: 0
    });
    const router = useRouter();

    useEffect(() => {
        GetFeedback();
    }, []); 
    
    useEffect(() => {
        // Calculate confidence metrics when component mounts
        const getConfidenceMetrics = async () => {
            const metrics = await calculateConfidence();
            saveOrUpdateConfidenceMetrics(params.interviewId, metrics);
        };
        
        getConfidenceMetrics();
    }, []);
    
    const GetFeedback = async () => {
        // Fetch individual feedback
        const result = await db.select()
            .from(UserAnswer)
            .where(eq(UserAnswer.mockIdRef, params.interviewId))
            .orderBy(UserAnswer.id);

        setFeedbackList(result);
        await generateOverallFeedback(result);
        
    }

    const saveOrUpdateOverallFeedback = async (mockId, rating, feedback) => {
        try {
            const existingFeedback = await db.select()
                .from(OverallFeedback)
                .where(eq(OverallFeedback.mockIdRef, mockId))
                .limit(1);

            if (existingFeedback.length > 0) {
                // Update existing feedback
                await db.update(OverallFeedback)
                    .set({
                        rating: rating,
                        feedback: feedback,
                        createdAt: moment().format('DD-MM-yyyy')
                    })
                    .where(eq(OverallFeedback.mockIdRef, mockId));
                const overallFeedbackResult = await db.select()
                    .from(OverallFeedback)
                    .where(eq(OverallFeedback.mockIdRef, params.interviewId))
                    .limit(1);
                    setOverallFeedback(overallFeedbackResult[0]);
                console.log("Overall feedback updated successfully.",overallFeedback[0]);
                return;
            } else {
                // Save new feedback
                await db.insert(OverallFeedback).values({
                    mockIdRef: mockId,
                    rating: rating,
                    feedback: feedback,
                    createdAt: moment().format('DD-MM-yyyy')
                });
                console.log("Overall feedback saved successfully.");
                const overallFeedbackResult = await db.select()
            .from(OverallFeedback)
            .where(eq(OverallFeedback.mockIdRef, params.interviewId))
            .limit(1);
            setOverallFeedback(overallFeedbackResult[0]);
                
                return;
            }
            
        } catch (error) {
            console.error("Error saving/updating overall feedback:", error);
        }
    }

    const saveOrUpdateConfidenceMetrics = async (mockId,metrics) => {
        try {
            const existingConfidence = await db.select()
                .from(ConfidenceMetrics)
                .where(eq(ConfidenceMetrics.mockIdRef, mockId))
                .limit(1);
            
            if (existingConfidence.length > 0) {
                // Update existing confidence
                await db.update(ConfidenceMetrics)
                    .set({
                        emotionCounts: metrics.emotionCounts,
                        confidenceScore: metrics.confidenceScore,
                        confidencePercentage: metrics.confidencePercentage,
                        createdAt: moment().format('DD-MM-yyyy')
                    })
                    .where(eq(ConfidenceMetrics.mockIdRef, mockId));

                const Confidence = await db.select()
                    .from(ConfidenceMetrics)
                    .where(eq(ConfidenceMetrics.mockIdRef, mockId))
                    .limit(1);
                    setConfidenceData(Confidence[0]);
                console.log("Confidence updated successfully.",confidenceData);
                return;
            } else {
                // Save new confidence
                await db.insert(ConfidenceMetrics).values({
                    mockIdRef: mockId,
                    emotionCounts: metrics.emotionCounts,
                    confidenceScore: metrics.confidenceScore,
                    confidencePercentage: metrics.confidencePercentage,
                    createdAt: moment().format('DD-MM-yyyy')
                });
                console.log("Confidence saved successfully.");
                const Confidence = await db.select()
                    .from(ConfidenceMetrics)
                    .where(eq(ConfidenceMetrics.mockIdRef, mockId))
                    .limit(1);
                    setConfidenceData(Confidence[0]);
                
                return;
            }
            
        } catch (error) {
            console.error("Error saving/updating confidence", error);
        }
    }

    const calculateConfidence = async () => {
        try {
            // Get all answers for this interview
            const answers = await db.select()
                .from(UserAnswer)
                .where(eq(UserAnswer.mockIdRef, params.interviewId));

            console.log('Fetched answers:', answers);

            // Collect all emotions from all answers
            let allEmotions = [];
            answers.forEach(answer => {
                try {
                    if (answer.emotionHistory) {
                        const emotions = JSON.parse(answer.emotionHistory);
                        console.log('Parsed emotions for answer:', emotions);
                        if (Array.isArray(emotions)) {
                            allEmotions = [...allEmotions, ...emotions];
                        }
                    }
                } catch (e) {
                    console.error("Error parsing emotion history:", e);
                }
            });

            console.log('All collected emotions:', allEmotions);

            // Count emotions
            const emotionCounts = {};
            allEmotions.forEach(emotion => {
                emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
            });
            
            console.log('Emotion counts:', emotionCounts);
            
            // Calculate confidence score based on formula
            const happy = emotionCounts['Happy'] || 0;
            const neutral = emotionCounts['Neutral'] || 0;
            const surprised = emotionCounts['Surprised'] || 0;
            const fearful = emotionCounts['Fearful'] || 0;
            const sad = emotionCounts['Sad'] || 0;
            const angry = emotionCounts['Angry'] || 0;
            const disgusted = emotionCounts['Disgusted'] || 0;
            
            console.log('Individual emotion counts:', {
                happy, neutral, surprised, fearful, sad, angry, disgusted
            });
            
            // Calculate numerator based on formula
            const numerator = (3 * happy) + (2 * neutral) + (0 * surprised) - 
                            (2 * fearful) - (2 * sad) - (3 * angry) - (3 * disgusted);
            
            // Calculate sum of all emotion counts
            const totalEmotions = happy + neutral + surprised + fearful + sad + angry + disgusted;
            
            console.log('Numerator:', numerator, 'Total emotions:', totalEmotions);
            
            // Calculate confidence score and percentage
            let confidenceScore = 0;
            let confidencePercentage = 0;
            
            if (totalEmotions > 0) {
                confidenceScore = (numerator / totalEmotions);
                
                // Convert to percentage (score ranges from -3 to +3)
                // Normalize to 0-100% scale
                confidencePercentage = Math.max(0, Math.min(100, ((confidenceScore + 3) / 6) * 100));
            }

            console.log('Final confidence score:', confidenceScore);
            console.log('Final confidence percentage:', confidencePercentage);

            // Create metrics object
            const metrics = {
                emotionCounts,
                confidenceScore: Number(confidenceScore.toFixed(2)),
                confidencePercentage: Math.round(confidencePercentage)
            };

            // Update state immediately
            setConfidenceData(metrics);

            return metrics;
        } catch (error) {
            console.error("Error calculating confidence:", error);
            return {
                emotionCounts: {},
                confidenceScore: 0,
                confidencePercentage: 0
            };
        }
    };

    const generateOverallFeedback = async (result) => {
        const feedbacks = result.map(item => item.feedback);
        const feedbackString = feedbacks.join('. ');
        const ratings = result.map(item => item.rating);
        const ratingString = ratings.join('. ');  

        const aiPrompt = `Based on the following feedbacks from an interview: ${feedbackString}, and ratings: ${ratingString}, please provide an overall rating out of 10 and a summary of feedback in just 3 to 5 lines in JSON format with rating field and feedback field.`;

        const response = await chatSession.sendMessage(aiPrompt);
        const responseText = (response.response.text()).replace('```json', '').replace('```', '');
        
        try {
            const jsonFeedback = JSON.parse(responseText);

            await saveOrUpdateOverallFeedback(params.interviewId, jsonFeedback.rating, jsonFeedback.feedback);
        } catch (error) {
            console.error("Error parsing JSON feedback:", error);
        }
    }

    // Emotion color mapping
    const emotionColors = {
        'Happy': 'bg-green-500',
        'Neutral': 'bg-blue-300',
        'Surprised': 'bg-purple-400',
        'Fearful': 'bg-yellow-400',
        'Sad': 'bg-blue-500',
        'Angry': 'bg-red-500',
        'Disgusted': 'bg-red-800'
    };

    // Function to determine confidence level class
    const getConfidenceClass = (percentage) => {
        if (percentage >= 70) return 'text-green-600';
        if (percentage >= 40) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className='p-10'>
            
            {feedbackList?.length === 0 ?
            <h2 className='font-bold text-xl text-gray-500 dark:text-leetcode-muted'>No Interview Feedback Record Found</h2>  
            :
            <>
            <h2 className='text-3xl font-bold text-green-500 dark:text-leetcode-success'>Congratulations!</h2>
            <h2 className='font-bold text-2xl text-gray-900 dark:text-leetcode-text'>Please go through your interview feedback</h2>
            
            <div className='mt-6 grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* Overall Feedback Display */}
                {overallFeedback && (
                    <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-700 dark:text-yellow-300 rounded-r-lg shadow-md'>
                        <h3 className='font-bold text-xl'>Overall Analysis</h3>
                        <p className='mt-2 font-bold text-sm'>Rating: {overallFeedback.rating}/10</p>
                        <p className='mt-2 text-sm'>{overallFeedback.feedback}</p>
                    </div>
                )}

                {/* Confidence Score Display */}
                <div className='p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 text-blue-700 dark:text-blue-300 rounded-r-lg shadow-md'>
                    <h3 className='font-bold text-xl'>Confidence Analysis</h3>
                    <div className='mt-3'>
                        <div className='flex items-center gap-2'>
                            <span className='font-bold text-sm'>Confidence Level:</span>
                            <span className={`text-xl font-bold ${
                                confidenceData.confidencePercentage >= 70 ? 'text-green-600 dark:text-leetcode-success' :
                                confidenceData.confidencePercentage >= 40 ? 'text-yellow-600 dark:text-leetcode-warning' : 'text-red-600 dark:text-leetcode-error'
                            }`}>
                                {confidenceData.confidencePercentage}%
                            </span>
                        </div>
                        
                        {/* Confidence Bar */}
                        <div className='mt-2 w-full bg-gray-200 dark:bg-leetcode-hover rounded-full h-4'>
                            <div 
                                className={`h-4 rounded-full ${
                                    confidenceData.confidencePercentage >= 70 ? 'bg-green-500 dark:bg-leetcode-success' : 
                                    confidenceData.confidencePercentage >= 40 ? 'bg-yellow-500 dark:text-leetcode-warning' : 'bg-red-500 dark:bg-leetcode-error'
                                }`}
                                style={{width: `${confidenceData.confidencePercentage}%`}}
                            ></div>
                        </div>
                        
                        <p className='mt-2 text-xs text-gray-600 dark:text-leetcode-muted'>
                            Score: {confidenceData.confidenceScore} (Range: -3 to +3)
                        </p>
                    </div>
                </div>
            </div>

            {/* Emotion Visualization */}
            <div className='mt-6 p-4 bg-gray-50 dark:bg-leetcode-card border border-gray-200 dark:border-leetcode-border rounded-lg shadow-md'>
                <h3 className='font-bold text-lg mb-3 text-gray-900 dark:text-leetcode-text'>Emotion Distribution</h3>
                
                <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3'>
                    {Object.entries(confidenceData.emotionCounts).map(([emotion, count], index) => {
                        // Calculate percentage of this emotion
                        const totalCount = Object.values(confidenceData.emotionCounts).reduce((sum, val) => sum + val, 0);
                        const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                        
                        return (
                            <div key={index} className='flex flex-col items-center'>
                                <div className='text-center mb-1 text-sm font-medium text-gray-700 dark:text-leetcode-text'>{emotion}</div>
                                <div className='w-full flex flex-col items-center'>
                                    <div className='h-32 w-8 bg-gray-200 dark:bg-leetcode-hover rounded-full flex flex-col-reverse'>
                                        <div 
                                            className={`w-8 rounded-full ${emotionColors[emotion] || 'bg-gray-500'}`}
                                            style={{height: `${percentage}%`}}
                                        ></div>
                                    </div>
                                    <div className='mt-1 text-xs font-bold text-gray-700 dark:text-leetcode-text'>{count} ({percentage}%)</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className='mt-4 text-xs text-gray-500 dark:text-leetcode-muted'>
                    <p>Emotion impact on confidence: 
                        <span className='text-green-600 dark:text-leetcode-success ml-1'>Happy (+3), Neutral (+2)</span>, 
                        <span className='text-gray-500 dark:text-leetcode-muted ml-1'>Surprised (0)</span>,
                        <span className='text-red-600 dark:text-leetcode-error ml-1'>Fearful (-2), Sad (-2), Angry (-3), Disgusted (-3)</span>
                    </p>
                </div>
            </div>

            <h2 className='mt-6 text-sm text-gray-500 dark:text-leetcode-muted'>Find below specific interview questions with correct answer and respective feedback for improvement</h2>
            {feedbackList && feedbackList.map((item, index) => (
                <Collapsible key={index} className='mt-7'>
                    <CollapsibleTrigger className='p-2 bg-secondary dark:bg-leetcode-hover rounded-lg flex justify-between my-2 text-left gap-7 w-full text-gray-900 dark:text-leetcode-text'>
                    {item.question} <ChevronsUpDown className='h-5 w-5'/>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                    <div className='flex flex-col gap-2'>
                        <h2 className='text-red-500 dark:text-leetcode-error p-2 border dark:border-leetcode-border rounded-lg'><strong>Rating:</strong> {item.rating}/10</h2>
                        <h2 className='p-2 border dark:border-leetcode-border rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-900 dark:text-red-300'><strong>Your Answer: </strong>{item.userAns}</h2>
                        <h2 className='p-2 border dark:border-leetcode-border rounded-lg bg-green-50 dark:bg-green-900/20 text-sm text-green-900 dark:text-green-300'><strong>Correct Answer: </strong>{item.correctAns}</h2>
                        <h2 className='p-2 border dark:border-leetcode-border rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm text-primary dark:text-blue-300'><strong>Feedback: </strong>{item.feedback}</h2>
                    </div>
                    </CollapsibleContent>
                </Collapsible>
            ))}
            </>}
            
            <Button className="mt-8 bg-purple-600 dark:bg-leetcode-primary text-white hover:bg-purple-700 dark:hover:bg-leetcode-primary/90" onClick={() => router.replace('/dashboard')}>Go Home</Button>
        </div>
    )
}

export default Feedback;

