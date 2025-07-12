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
   ```
3. Provide environment variables:
   - `backend/.env` – requires `OPENAI_API_KEY` for transcription.
   - `frontend/.env.local` – requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_BACKEND_URL` (defaults to `http://localhost:3001`).
4. Run the development servers in separate terminals:
   ```bash
   # Backend
   cd backend && npm start

   # Frontend
   cd frontend && npm run dev
   ```
   The frontend defaults to `http://localhost:3000` and the backend to `http://localhost:3001`.

Recorded audio uploaded from the dashboard page will generate Excel files in `backend/uploads` that can be downloaded from the UI.

You can also upload an existing Excel template alongside the audio. The backend
copies the template, fills in any matching part numbers with the recorded
measurements, converts units to match the template, checks tolerances and adds
comments for values that fall outside the allowed range. The annotated workbook
keeps the original filename, prefixed with `annotated_` and the recording date,
so it's easy to trace back to the source file.

Transcripts can use digits or spelled numbers ("five and a half", "six point three" etc.) and the parser will still match values to the correct units.

The backend stores a small record of generated files in `backend/files.json`. Each
entry is tied to the authenticated user ID so the dashboard can list your past
reports. Entries and their files are automatically removed after one week.
