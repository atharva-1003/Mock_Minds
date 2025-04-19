import { AtomIcon, Edit, Share2 } from "lucide-react";
import React from 'react'

export default function how() {
  return (
    <div>
      <section id="how-it-works" className="py-8 bg-white dark:bg-leetcode-dark z-50 px-4 mx-auto max-w-screen-xl text-center lg:py-16 lg:px-12">
        <h2 className="font-bold text-3xl text-gray-900 dark:text-leetcode-text">How it Works?</h2>
        <h2 className="text-md text-gray-500 dark:text-leetcode-muted">Give your mock interview in just 3 easy steps</h2>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <a
            className="block rounded-xl border bg-white dark:bg-leetcode-card border-gray-200 dark:border-leetcode-border p-8 shadow-xl transition hover:border-purple-500/10 hover:shadow-purple-500/10"
            href="#"
          >
            <AtomIcon className='h-8 w-8 text-gray-700 dark:text-leetcode-text' />

            <h2 className="mt-4 text-xl font-bold text-black dark:text-leetcode-text">Write promot for your form</h2>

            <p className="mt-1 text-sm text-gray-600 dark:text-leetcode-muted">
            Craft job specific and tailored prompts to guide your mock interview. These prompts help define the type of questions you want to be asked, ensuring a focused and relevant practice session that aligns with your career goals.
            </p>
          </a>

          <a
            className="block rounded-xl border bg-white dark:bg-leetcode-card border-gray-200 dark:border-leetcode-border p-8 shadow-xl transition hover:border-purple-500/10 hover:shadow-purple-500/10"
            href="#"
          >
            <Edit className='h-8 w-8 text-gray-700 dark:text-leetcode-text' />

            <h2 className="mt-4 text-xl font-bold text-black dark:text-leetcode-text">Edit Your form </h2>

            <p className="mt-1 text-sm text-gray-600 dark:text-leetcode-muted">
            Customize your interview form by editing the questions and structure as needed. This step allows you to refine your prompts, add new questions, or adjust the format, ensuring that your mock interview is as effective and personalized as possible.
            </p>
          </a>

          <a
            className="block rounded-xl border bg-white dark:bg-leetcode-card border-gray-200 dark:border-leetcode-border p-8 shadow-xl transition hover:border-purple-500/10 hover:shadow-purple-500/10"
            href="#"
          >
            <Share2 className='h-8 w-8 text-gray-700 dark:text-leetcode-text' />

            <h2 className="mt-4 text-xl font-bold text-black dark:text-leetcode-text">Share & Start Accepting Responses</h2>

            <p className="mt-1 text-sm text-gray-600 dark:text-leetcode-muted">
            Once your form is ready, share it with others or use it for self-assessment. Start accepting responses from peers or mentors, allowing you to gather valuable feedback on your performance and improve your interviewing skills over time.
            </p>
          </a>
        </div>

        <div className="mt-12 text-center">
          <a
            href="/sign-in"
            className="inline-block rounded bg-leetcode-primary px-12 py-3 text-sm font-medium text-white transition hover:bg-leetcode-primary/90 focus:outline-none focus:ring focus:ring-yellow-400"
          >
            Get Started Today
          </a>
        </div>
      </section>
    </div>
  )
}
