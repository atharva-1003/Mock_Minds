"use client";
import { db } from '@/utils/db';
import { MockInterview } from '@/utils/schema';
import { useUser } from '@clerk/nextjs';
import { desc, eq } from 'drizzle-orm';
import React, { useEffect, useState } from 'react';
import InterviewItemCard from './InterviewItemCard';

function InterviewList() {
    const { user } = useUser();
    const [interviewList, setInterviewList] = useState([]);

    useEffect(() => {
        if (user) {
            GetInterviewList();
        }
    }, [user]);

    const GetInterviewList = async () => {
        const result = await db.select()
            .from(MockInterview)
            .where(eq(MockInterview.createdBy, user?.primaryEmailAddress?.emailAddress))
            .orderBy(desc(MockInterview.id));

        console.log(result);
        setInterviewList(result);
    };

    return (
        <div>
            <h2 className='font-medium text-xl'>Previous Mock Interviews</h2>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 my-3'>
                {interviewList?.length > 0 ? interviewList.map((interview) => (
                    <InterviewItemCard 
                        interview={interview}
                        key={interview.id} // Use a unique identifier if available
                    />
                )) : [1, 2, 3, 4].map((item) => (
                    <div 
                        key={item} // Use item as the key for fallback loading state
                        className='h-[100px] w-full bg-gray-200 animate-pulse rounded-lg'
                    />
                ))}
            </div>
        </div>
    );
}

export default InterviewList;
