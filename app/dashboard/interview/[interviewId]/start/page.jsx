"use client"
import { db } from '@/utils/db';
import { MockInterview } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import React, { useEffect, useState } from 'react'
import QuestionsSection from './_components/QuestionsSection';
import RecordAnswerSection from './_components/RecordAnswerSection/index';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function StartInterview({params}) {

    const [interviewData,setInterviewData]=useState();
    const [mockInterviewQuestion,setMockInterviewQuestion]=useState();
    const [activeQuestionIndex,setActiveQuestionIndex]=useState(0);
    useEffect(()=>{
        GetInterviewDetails();
    },[]);

    /**
     * Used to Get Interview Details by MockId/Interview Id
     */
    const GetInterviewDetails=async()=>{
        try {
            const result = await db.select().from(MockInterview)
                .where(eq(MockInterview.mockId,params.interviewId));
            
            if (!result || result.length === 0) {
                console.error('No interview found with ID:', params.interviewId);
                return;
            }

            console.log('Raw jsonMockResp:', result[0].jsonMockResp);
            
            try {
                const jsonMockResp = JSON.parse(result[0].jsonMockResp);
                console.log('Parsed jsonMockResp:', jsonMockResp);
                
                if (!Array.isArray(jsonMockResp)) {
                    console.error('Parsed JSON is not an array:', jsonMockResp);
                    return;
                }

                console.log('Setting questions:', jsonMockResp);
                setMockInterviewQuestion(jsonMockResp);
                setInterviewData(result[0]);
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                console.error('Invalid JSON string:', result[0].jsonMockResp);
            }
        } catch (dbError) {
            console.error('Database error:', dbError);
        }
    } 

    // Add debug logs for question changes
    useEffect(() => {
        console.log('Current question index:', activeQuestionIndex);
        console.log('Questions available:', mockInterviewQuestion);
        console.log('Current question:', mockInterviewQuestion?.[activeQuestionIndex]);
    }, [activeQuestionIndex, mockInterviewQuestion]);

  return (
    <div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-10'>
            {/* Questions  */}
            <QuestionsSection 
            mockInterviewQuestion={mockInterviewQuestion}
            activeQuestionIndex={activeQuestionIndex}
            />

            {/* Video/ Audio Recording  */}
            <RecordAnswerSection
             mockInterviewQuestion={mockInterviewQuestion}
             activeQuestionIndex={activeQuestionIndex}
             interviewData={interviewData}
             setActiveQuestionIndex={setActiveQuestionIndex}
            />
        </div>
        <div className='flex justify-end gap-6'>
          {activeQuestionIndex>0&&  
          <Button onClick={()=>setActiveQuestionIndex(activeQuestionIndex-1)}>Previous Question</Button>}
          {activeQuestionIndex!=mockInterviewQuestion?.length-1&& 
           <Button onClick={()=>setActiveQuestionIndex(activeQuestionIndex+1)}>Next Question</Button>}
          {activeQuestionIndex==mockInterviewQuestion?.length-1&&  
          <Link href={'/dashboard/interview/'+interviewData?.mockId+"/feedback"}>
          <Button >End Interview</Button>
          </Link>}


        </div>
    </div>
  )
}

export default StartInterview