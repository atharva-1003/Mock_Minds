"use client"
import React, { useEffect, useState } from 'react'
import { db } from '@/utils/db'
import { OverallFeedback, MockInterview, ConfidenceMetrics } from '@/utils/schema'
import { eq } from 'drizzle-orm'
import { useUser } from '@clerk/nextjs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Trophy, Award, Star } from 'lucide-react'

function Rating() {
    const { user } = useUser();
    const [ratingData, setRatingData] = useState([]);
    const [averageRating, setAverageRating] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        if (user) {
            getRatingData();
            getLeaderboard();
        }
    }, [user]);

    const getLeaderboard = async () => {
        try {
            // Get all users' interviews
            const allInterviews = await db.select()
                .from(MockInterview)
                .orderBy(MockInterview.id);

            // Get overall feedback for all interviews
            const feedbackPromises = allInterviews.map(interview => 
                db.select()
                    .from(OverallFeedback)
                    .where(eq(OverallFeedback.mockIdRef, interview.mockId))
                    .limit(1)
            );

            const feedbackResults = await Promise.all(feedbackPromises);
            
            // Process the data to calculate average ratings per user
            const userRatings = {};
            feedbackResults.forEach((result, index) => {
                if (result.length > 0) {
                    const userEmail = allInterviews[index].createdBy;
                    const rating = parseFloat(result[0].rating);
                    
                    if (!userRatings[userEmail]) {
                        userRatings[userEmail] = {
                            total: 0,
                            count: 0,
                            name: userEmail.split('@')[0] // Use email username as display name
                        };
                    }
                    
                    userRatings[userEmail].total += rating;
                    userRatings[userEmail].count += 1;
                }
            });

            // Calculate averages and sort
            const leaderboardData = Object.values(userRatings)
                .map(user => ({
                    ...user,
                    average: user.total / user.count
                }))
                .sort((a, b) => b.average - a.average)
                .slice(0, 10); // Top 10 users

            setLeaderboard(leaderboardData);
        } catch (error) {
            console.error("Error fetching leaderboard data:", error);
        }
    };

    const getRatingData = async () => {
        try {
            // Get all mock interviews for the user
            const interviews = await db.select()
                .from(MockInterview)
                .where(eq(MockInterview.createdBy, user?.primaryEmailAddress?.emailAddress))
                .orderBy(MockInterview.id);

            // Get overall feedback and confidence metrics for each interview
            const feedbackPromises = interviews.map(interview => 
                Promise.all([
                    db.select()
                        .from(OverallFeedback)
                        .where(eq(OverallFeedback.mockIdRef, interview.mockId))
                        .limit(1),
                    db.select()
                        .from(ConfidenceMetrics)
                        .where(eq(ConfidenceMetrics.mockIdRef, interview.mockId))
                        .limit(1)
                ])
            );

            const results = await Promise.all(feedbackPromises);
            
            // Process the data
            const processedData = results
                .filter(([feedback, confidence]) => feedback.length > 0)
                .map(([feedback, confidence], index) => ({
                    name: `${index + 1}`,
                    rating: parseFloat(feedback[0].rating),
                    confidence: confidence.length > 0 ? parseFloat(confidence[0].confidencePercentage) : null,
                    experience: interviews[index].jobExperience,
                    date: interviews[index].createdAt,
                    jobPosition: interviews[index].jobPosition
                }));

            setRatingData(processedData);

            // Calculate average rating
            if (processedData.length > 0) {
                const total = processedData.reduce((sum, item) => sum + item.rating, 0);
                setAverageRating(total / processedData.length);
            }
        } catch (error) {
            console.error("Error fetching rating data:", error);
        }
    };

    return (
        <div className='p-10'>
            <h2 className='font-bold text-3xl text-center text-gray-900 dark:text-leetcode-text'>Your Performance Rating</h2>
            <h2 className='text-center text-gray-500 dark:text-leetcode-muted'>Track your interview performance over time</h2>

            {/* Top Section - Two Blocks Side by Side */}
            <div className='mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8'>
                {/* Left Block - Performance Overview */}
                <div className='lg:col-span-8 bg-white dark:bg-[#282828] rounded-xl shadow-lg p-8'>
                    <div className='flex flex-col'>
                        <div className='flex flex-col gap-6'>
                            <h3 className='text-xl font-semibold text-gray-800 dark:text-[#E6E6E6]'>Performance Overview</h3>
                            
                            {/* Metrics Row */}
                            <div className='flex gap-8'>
                                <div className='flex items-center gap-2'>
                                    <svg className="w-5 h-5 text-[#FFA116]" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                    </svg>
                                    <div className='flex flex-col'>
                                        <span className='text-sm text-gray-500 dark:text-[#B3B3B3]'>Highest Score</span>
                                        <span className='text-xl font-bold text-[#FFA116]'>
                                            {Math.max(...ratingData.map(d => d.rating), 0).toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                                <div className='flex items-center gap-2'>
                                    <svg className="w-5 h-5 text-gray-400 dark:text-[#B3B3B3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className='flex flex-col'>
                                        <span className='text-sm text-gray-500 dark:text-[#B3B3B3]'>Recent Score</span>
                                        <span className='text-xl font-bold text-gray-700 dark:text-[#E6E6E6]'>
                                            {ratingData.length > 0 ? ratingData[ratingData.length - 1].rating.toFixed(1) : '0.0'}
                                        </span>
                                    </div>
                                </div>

                                {/* Average Performance Box */}
                                <div className='ml-auto bg-gray-50 dark:bg-[#1A1A1A] rounded-lg px-4 py-3'>
                                    <div className='flex flex-col items-center'>
                                        <span className='text-sm text-gray-500 dark:text-[#B3B3B3] mb-1'>Average Performance</span>
                                        <div className='flex items-center gap-1'>
                                            <svg className="w-4 h-4 text-[#2CBB5D]" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                            </svg>
                                            <span className='text-2xl font-bold text-[#2CBB5D]'>{averageRating.toFixed(1)}</span>
                                            <span className='text-sm text-gray-500 dark:text-[#B3B3B3]'>/10</span>
                                        </div>
                                        <div className='flex items-center gap-1 mt-1'>
                                            <div className='h-1.5 w-1.5 rounded-full bg-[#2CBB5D]'></div>
                                            <span className='text-xs text-gray-500 dark:text-[#B3B3B3]'>
                                                Based on {ratingData.length} {ratingData.length === 1 ? 'interview' : 'interviews'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rating Trend */}
                        <div className='h-[300px] mt-6'>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={ratingData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                                    <CartesianGrid 
                                        strokeDasharray="3 3" 
                                        stroke="rgba(156, 163, 175, 0.2)" 
                                        vertical={false}
                                        className="dark:stroke-[#3E3E3E]" 
                                    />
                                    <XAxis 
                                        dataKey="name" 
                                        height={40}
                                        interval={0}
                                        stroke="rgb(156, 163, 175)"
                                        tick={{ fill: 'rgb(107, 114, 128)' }}
                                        axisLine={{ stroke: 'rgb(229, 231, 235)' }}
                                        className="dark:stroke-[#8B8B8B] dark:[&>line]:stroke-[#3E3E3E]"
                                    />
                                    <YAxis 
                                        domain={[0, 10]} 
                                        stroke="rgb(156, 163, 175)"
                                        tick={{ fill: 'rgb(107, 114, 128)' }}
                                        axisLine={{ stroke: 'rgb(229, 231, 235)' }}
                                        className="dark:stroke-[#8B8B8B] dark:[&>line]:stroke-[#3E3E3E]"
                                    />
                                    <Tooltip 
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white dark:bg-[#282828] p-4 border border-gray-200 dark:border-[#3E3E3E] rounded-lg shadow-lg min-w-[240px]">
                                                        {/* Header */}
                                                        <div className="border-b border-gray-100 dark:border-[#3E3E3E] pb-2 mb-3">
                                                            <h3 className="font-medium text-[15px] text-gray-900 dark:text-[#E6E6E6]">
                                                                {data.jobPosition}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 dark:text-[#B3B3B3] mt-0.5">
                                                                {data.date}
                                                            </p>
                                                        </div>

                                                        {/* Metrics Grid */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {/* Rating */}
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-gray-500 dark:text-[#B3B3B3] uppercase tracking-wide">
                                                                    Rating
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <svg className="w-4 h-4 text-[#FFA116]" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                                    </svg>
                                                                    <span className="font-medium text-[15px] text-gray-900 dark:text-[#E6E6E6]">
                                                                        {data.rating}/10
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Confidence */}
                                                            {data.confidence !== null && (
                                                                <div className="space-y-1">
                                                                    <div className="text-xs text-gray-500 dark:text-[#B3B3B3] uppercase tracking-wide">
                                                                        Confidence
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <svg className="w-4 h-4 text-[#2CBB5D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                        </svg>
                                                                        <span className="font-medium text-[15px] text-gray-900 dark:text-[#E6E6E6]">
                                                                            {data.confidence}/10
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Experience */}
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-gray-500 dark:text-[#B3B3B3] uppercase tracking-wide">
                                                                    Experience
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <svg className="w-4 h-4 text-gray-400 dark:text-[#B3B3B3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                    </svg>
                                                                    <span className="font-medium text-[15px] text-gray-900 dark:text-[#E6E6E6]">
                                                                        {data.experience} {data.experience === 1 ? 'year' : 'years'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="rating" 
                                        stroke="#FFA116" 
                                        strokeWidth={2}
                                        dot={{ fill: '#FFA116', strokeWidth: 2 }}
                                        activeDot={{ r: 6, fill: '#FFA116' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Right Block - Leaderboard */}
                <div className='lg:col-span-4 bg-white dark:bg-leetcode-card rounded-lg shadow-md border border-purple-100 dark:border-leetcode-border p-6'>
                    <h3 className='text-xl font-semibold mb-4 flex items-center gap-2 text-gray-700 dark:text-leetcode-text'>
                        <Trophy className='h-6 w-6 text-yellow-500 dark:text-leetcode-warning' />
                        Top Performers
                    </h3>
                    <div className='overflow-hidden'>
                        <div className='grid grid-cols-12 gap-2 p-2 bg-gray-50 dark:bg-leetcode-hover font-semibold text-gray-600 dark:text-leetcode-text text-sm'>
                            <div className='col-span-1'>#</div>
                            <div className='col-span-7'>User</div>
                            <div className='col-span-2'>Avg</div>
                            <div className='col-span-2'>Int</div>
                        </div>
                        {leaderboard.map((user, index) => (
                            <div 
                                key={index} 
                                className={`grid grid-cols-12 gap-2 p-2 items-center text-sm ${
                                    user.name === user?.primaryEmailAddress?.emailAddress.split('@')[0] 
                                    ? 'bg-purple-50 dark:bg-leetcode-primary/10' 
                                    : index % 2 === 0 ? 'bg-white dark:bg-leetcode-card' : 'bg-gray-50 dark:bg-leetcode-hover'
                                }`}
                            >
                                <div className='col-span-1 flex items-center gap-1'>
                                    {index === 0 ? <Trophy className='h-4 w-4 text-yellow-500 dark:text-leetcode-warning' /> :
                                     index === 1 ? <Award className='h-4 w-4 text-gray-400 dark:text-leetcode-muted' /> :
                                     index === 2 ? <Award className='h-4 w-4 text-amber-600 dark:text-amber-500' /> :
                                     <span className='text-gray-500 dark:text-leetcode-muted'>{index + 1}</span>}
                                </div>
                                <div className='col-span-7 font-medium truncate text-gray-700 dark:text-leetcode-text'>{user.name}</div>
                                <div className='col-span-2 font-bold text-purple-600 dark:text-leetcode-primary'>{user.average.toFixed(1)}</div>
                                <div className='col-span-2 text-gray-500 dark:text-leetcode-muted'>{user.count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Section - Recent Interviews */}
            <div className='mt-8 bg-white dark:bg-leetcode-card rounded-lg shadow-md border border-purple-100 dark:border-leetcode-border p-6'>
                <h3 className='text-xl font-semibold mb-4 flex items-center gap-2 text-gray-700 dark:text-leetcode-text'>
                    <Star className='h-6 w-6 text-purple-500 dark:text-leetcode-primary' />
                    Your Recent Interviews
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {ratingData.slice(-6).map((item, index) => (
                        <div key={index} className='p-4 bg-gray-50 dark:bg-leetcode-hover rounded-lg border border-gray-200 dark:border-leetcode-border'>
                            <div className='flex flex-col gap-2'>
                                <div className='flex justify-between items-center'>
                                    <span className='font-medium text-gray-700 dark:text-leetcode-text'>{item.jobPosition}</span>
                                    <span className={`font-bold ${
                                        item.rating >= 7 ? 'text-green-600 dark:text-leetcode-success' :
                                        item.rating >= 5 ? 'text-yellow-600 dark:text-leetcode-warning' : 'text-red-600 dark:text-leetcode-error'
                                    }`}>
                                        {item.rating}/10
                                    </span>
                                </div>
                                <div className='text-sm text-gray-500 dark:text-leetcode-muted'>
                                    <p>Experience: {item.experience} years</p>
                                    <p>Date: {item.date}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Rating 