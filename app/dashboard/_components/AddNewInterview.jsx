"use client"
import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { chatSession } from '@/utils/GeminiAIModal'
import { LoaderCircle } from 'lucide-react'
import { db } from '@/utils/db'
import { MockInterview } from '@/utils/schema'
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@clerk/nextjs'
import moment from 'moment'
import { useRouter } from 'next/navigation'

function AddNewInterview() {
    const [openDailog,setOpenDailog]=useState(false)
    const [jobPosition,setJobPosition]=useState();
    const [jobDesc,setJobDesc]=useState();
    const [jobExperience,setJobExperience]=useState();
    const [loading,setLoading]=useState(false);
    const [jsonResponse,setJsonResponse]=useState([]);
    const router=useRouter();
    const {user}=useUser();
    const onSubmit=async(e)=>{
        setLoading(true)
        e.preventDefault()
        console.log(jobPosition,jobDesc,jobExperience);

        try {
            const InputPrompt = `Job position: ${jobPosition}, Job Description: ${jobDesc}, Years of Experience: ${jobExperience}. Based on this information, generate exactly ${process.env.NEXT_PUBLIC_INTERVIEW_QUESTION_COUNT} interview questions with answers. Return the response as a JSON array where each item has 'question' and 'answer' fields. Do not include any markdown formatting or additional text.`;

            const result = await chatSession.sendMessage(InputPrompt);
            let MockJsonResp = result.response.text();
            
            // Clean up any potential markdown or extra text
            MockJsonResp = MockJsonResp.replace(/```json\s*|\s*```/g, '').trim();
            
            console.log('Raw AI response:', MockJsonResp);
            
            // Validate JSON format
            try {
                const parsedResponse = JSON.parse(MockJsonResp);
                
                // Validate array structure
                if (!Array.isArray(parsedResponse)) {
                    throw new Error('Response is not an array');
                }
                
                // Validate each question object
                parsedResponse.forEach((item, index) => {
                    if (!item.question || !item.answer) {
                        throw new Error(`Question ${index + 1} is missing required fields`);
                    }
                });
                
                console.log('Validated response:', parsedResponse);
                setJsonResponse(parsedResponse);
                
                // Store in database
                const resp = await db.insert(MockInterview)
                    .values({
                        mockId: uuidv4(),
                        jsonMockResp: JSON.stringify(parsedResponse), // Ensure clean JSON string
                        jobPosition: jobPosition,
                        jobDesc: jobDesc,
                        jobExperience: jobExperience,
                        createdBy: user?.primaryEmailAddress?.emailAddress,
                        createdAt: moment().format('DD-MM-yyyy')
                    }).returning({mockId: MockInterview.mockId});

                console.log("Inserted ID:", resp)
                if(resp && resp[0]?.mockId) {
                    setOpenDailog(false);
                    router.push('/dashboard/interview/'+resp[0].mockId)
                }
            } catch (parseError) {
                console.error("Error processing response:", parseError);
                alert("Failed to generate interview questions. Please try again.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred. Please try again.");
        }
        setLoading(false);
    }
  return (
    <div>
        <div className='p-10 border rounded-lg bg-secondary
        hover:scale-105 hover:shadow-md cursor-pointer
         transition-all border-dashed'
         onClick={()=>setOpenDailog(true)}
         >
            <h2 className='text-lg text-center'>+ Add New</h2>
        </div>
        <Dialog open={openDailog}>
       
        <DialogContent className="max-w-2xl">
            <DialogHeader >
            <DialogTitle className="text-2xl" >Tell us more about your job interviewing</DialogTitle>
            <DialogDescription>
                <form onSubmit={onSubmit}>
                <div>
                   
                    <h2>Add Details about you Job description and years of experience</h2>

                    <div className='mt-7 my-4'>
                        <label>Job Role/Job Position</label>
                        <Input placeholder="Ex. Full Stack Developer" required
                        onChange={(event)=>setJobPosition(event.target.value)}
                        />
                    </div>
                    <div className=' my-3'>
                        <label>Job Description/ Tech Stack (In Short)</label>
                        <Textarea placeholder="Ex. React, Angular, NodeJs, MySql etc" 
                        required
                        onChange={(event)=>setJobDesc(event.target.value)} />
                    </div>
                    <div className=' my-3'>
                        <label>Years of experience</label>
                        <Input placeholder="Ex.5"  type="number"  max="100" 
                        required
                        onChange={(event)=>setJobExperience(event.target.value)}
                        />
                    </div>
                </div>
                <div className='flex gap-5 justify-end'>
                    <Button type="button" className="bg-purple-600 text-white hover:bg-purple-700" variant="ghost" onClick={()=>setOpenDailog(false)}>Cancel</Button>
                    <Button type="submit" className="bg-purple-600 text-white hover:bg-purple-700" disabled={loading} >
                        {loading? 
                        <>
                        <LoaderCircle className='animate-spin' /> Generating from AI
                        </>:'Start Interview'    
                    }
                        </Button>
                </div>
                </form>
            </DialogDescription>
            </DialogHeader>
        </DialogContent>
        </Dialog>

    </div>
  )
}

export default AddNewInterview