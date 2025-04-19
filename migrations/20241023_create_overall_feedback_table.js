// migrations/20241023_create_overall_feedback_table.js

import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

export const OverallFeedbackMigration = {
    up: async (db) => {
        await db.execute(`
            CREATE TABLE overallFeedback (
                id SERIAL NOT NULL,
                mockIdRef VARCHAR PRIMARY KEY,
                rating VARCHAR NOT NULL,
                feedback TEXT NOT NULL,
                createdAt VARCHAR
            );
        `);
    },
    down: async (db) => {
        await db.execute(`DROP TABLE IF EXISTS overallFeedback;`);
    },
};
