import { pgTable, serial, text, varchar, jsonb } from "drizzle-orm/pg-core";

export const MockInterview = pgTable('mockInterview', {
    id: serial('id').primaryKey(),
    jsonMockResp: text('jsonMockResp').notNull(),
    jobPosition: varchar('jobPosition').notNull(),
    jobDesc: varchar('jobDesc').notNull(),
    jobExperience: varchar('jobExperience').notNull(),
    createdBy: varchar('createdBy').notNull(),
    createdAt: varchar('createdAt'),
    mockId: varchar('mockId').notNull(),
});

export const UserAnswer = pgTable('userAnswer', {
    id: serial('id').primaryKey(),
    mockIdRef: varchar('mockId').notNull(),
    question: varchar('question').notNull(),
    correctAns: text('correctAns'),
    userAns: text('userAns'),
    feedback: text('feedback'),
    rating: varchar('rating'),
    userEmail: varchar('userEmail'),
    createdAt: varchar('createdAt'),
    emotionHistory: text('emotionHistory'),
});

export const OverallFeedback = pgTable('overallFeedback', {
    id: serial('id').notNull(),
    mockIdRef: varchar('mockIdRef').primaryKey(), // Reference to the mock interview
    rating: varchar('rating').notNull(), // Overall rating out of 10
    feedback: text('feedback').notNull(), // Summary of feedback
    createdAt: varchar('createdAt'),
});

export const ConfidenceMetrics = pgTable('confidenceMetrics', {
    id: serial('id').primaryKey(),
    mockIdRef: varchar('mockIdRef').notNull().unique(), // Reference to the mock interview
    emotionCounts: jsonb('emotionCounts').notNull(), // JSON of emotion counts
    confidenceScore: varchar('confidenceScore').notNull(), // Raw confidence score
    confidencePercentage: varchar('confidencePercentage').notNull(), // Percentage value
    createdAt: varchar('createdAt'),
});
