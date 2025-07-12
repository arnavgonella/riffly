# Riffly

Riffly is an AI-native workflow tool for manufacturing quality control. It lets inspectors record audio measurements which the backend transcribes and turns into an Excel checklist.

## Project structure

- **frontend** – a Next.js app used for recording audio, authentication with Supabase and displaying download links for generated reports.
- **backend** – a Node.js/Express server that accepts audio uploads, calls OpenAI Whisper for transcription, parses the results and produces Excel files.

## Getting started

1. Install Node.js (18+ recommended).
2. Install dependencies for each part:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
