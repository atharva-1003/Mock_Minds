# Mock Minds

Mock Minds is an AI-powered mock interview platform that helps users practice for interviews with real-time feedback and emotion detection.

## Features

- **AI-Powered Mock Interviews**: Practice with AI-generated questions and receive feedback on your answers
- **Speech Recognition**: Record your answers using your microphone
- **Emotion Detection**: Get real-time feedback on your facial expressions during interviews
- **Webcam Integration**: See yourself during the interview process
- **Timed Preparation and Answering**: Structured interview experience with preparation and answering phases

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Flask (Python) for emotion detection
- **AI**: TensorFlow for emotion detection, Gemini AI for answer evaluation
- **Database**: SQLite with Drizzle ORM

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/atharva-1003/Mock_Minds.git
   cd Mock_Minds
   ```

2. Install frontend dependencies:
   ```
   npm install
   # or
   yarn install
   ```

3. Install backend dependencies:
   ```
   cd emotion-detection-server/emotion_api
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Create a `.env.local` file in the root directory with your API keys and configuration

5. Start the development servers:
   - Frontend:
     ```
     npm run dev
     # or
     yarn dev
     ```
   - Backend (emotion detection server):
     ```
     cd emotion-detection-server/emotion_api
     python app.py
     ```

## Usage

1. Navigate to the application in your browser (default: http://localhost:3000)
2. Sign in or create an account
3. Start a mock interview
4. Follow the prompts to answer questions
5. Receive feedback on your answers and facial expressions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to all contributors who have helped with this project
- Special thanks to the open-source community for the tools and libraries used in this project 