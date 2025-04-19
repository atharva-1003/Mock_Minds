"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ConfidenceMetrics, MockInterview, OverallFeedback, UserAnswer } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from '@/utils/db';
import { cardStyles, textStyles, buttonStyles, dialogStyles } from "@/utils/styles";

function InterviewItemCard({ interview }) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [overallRating, setOverallRating] = useState(null);

  // Memoize the getOverallRating function
  const getOverallRating = useCallback(async () => {
    try {
      const result = await db
        .select()
        .from(OverallFeedback)
        .where(eq(OverallFeedback.mockIdRef, interview.mockId))
        .limit(1);

      if (result.length > 0) {
        setOverallRating(result[0].rating);
      }
    } catch (error) {
      console.error("Error fetching overall rating:", error);
    }
  }, [interview.mockId]);

  // Use useEffect with proper dependency
  useEffect(() => {
    getOverallRating();
  }, [getOverallRating]);

  const onStart = useCallback(() => {
    router.push("/dashboard/interview/" + interview?.mockId);
  }, [router, interview?.mockId]);

  const onFeedbackPress = useCallback(() => {
    router.push("/dashboard/interview/" + interview.mockId + "/feedback");
  }, [router, interview.mockId]);

  const onDeleteConfirm = async () => {
    setLoading(true);
    try {
      // Batch delete operations
      await Promise.all([
        db.delete(OverallFeedback).where(eq(OverallFeedback.mockIdRef, interview.mockId)),
        db.delete(UserAnswer).where(eq(UserAnswer.mockIdRef, interview.mockId)),
        db.delete(ConfidenceMetrics).where(eq(ConfidenceMetrics.mockIdRef, interview.mockId)),
        db.delete(MockInterview).where(eq(MockInterview.mockId, interview.mockId))
      ]);

      setIsDialogOpen(false);
      setIsDeleted(true);
    } catch (error) {
      console.error("Error deleting interview:", error);
    }
    setLoading(false);
  };

  if (isDeleted) {
    return null;
  }

  return (
    <div className={`relative border shadow-sm rounded-lg p-3 bg-purple-50 dark:bg-[#282828] dark:border-[#3E3E3E] dark:shadow-none`}>
      <button 
        className="absolute top-2 right-2 text-gray-500 dark:text-[#B3B3B3] hover:text-gray-700 dark:hover:text-[#E6E6E6]" 
        onClick={() => setIsDialogOpen(true)}
        aria-label="Delete interview"
      >
        <X className="h-5 w-5" />
      </button>

      <h2 className="mt-3 p-1 font-bold capitalize text-center text-lg text-purple-700 dark:text-[#E6E6E6]">
        {interview?.jobPosition}
      </h2>
      <h2 className="mt-1 text-sm text-gray-600 dark:text-[#B3B3B3]">
        {interview?.jobExperience} Years of Experience
      </h2>
      <h2 className="text-xs text-gray-400 dark:text-[#808080]">
        Created At: {interview.createdAt}
      </h2>

      <div className="mt-1 text-purple-700 dark:text-[#FFA116]">
        <h3 className="font-bold text-sm">
          Overall Rating: {overallRating !== null ? `${overallRating}/10` : '0/10'}
        </h3>
      </div>

      <div className="flex justify-between mt-2 gap-5">
        <Button 
          size="sm" 
          variant="outline" 
          className="w-full dark:border-[#3E3E3E] dark:text-[#E6E6E6] dark:hover:bg-[#2A2A2A] dark:bg-transparent"
          onClick={onFeedbackPress}
        >
          Feedback
        </Button>
        <Button 
          size="sm" 
          className="w-full bg-white text-purple-700 border border-purple-700 hover:bg-purple-700 hover:text-white dark:bg-[#1A1A1A] dark:text-[#FFA116] dark:border-[#FFA116] dark:hover:bg-[#FFA116] dark:hover:text-[#1A1A1A]"
          onClick={onStart}
        >
          Start
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md dark:bg-[#282828] dark:border-[#3E3E3E]">
          <DialogHeader>
            <DialogTitle className="text-2xl dark:text-[#E6E6E6]">Delete Interview</DialogTitle>
            <DialogDescription className="dark:text-[#B3B3B3]">
              <p>Are you sure you want to delete this interview? This action cannot be undone.</p>
              <div className="flex gap-5 justify-end mt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsDialogOpen(false)}
                  className="dark:text-[#E6E6E6] dark:hover:bg-[#2A2A2A] dark:bg-transparent"
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-red-600 text-white hover:bg-red-700 dark:bg-[#FF4D4D] dark:hover:bg-[#FF3333]"
                  onClick={onDeleteConfirm} 
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default React.memo(InterviewItemCard);

