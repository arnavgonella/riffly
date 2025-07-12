const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs');
const path = require('path');
const { transcribeAndParse, transcribeAndAnnotate } = require('./transcription.cjs');
const { addFile, getFiles, cleanupOldFiles } = require('./db.cjs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(fileUpload());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Remove expired files on startup
cleanupOldFiles();

app.post('/upload', async (req, res) => {
  const userId = req.body.userId;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!req.files || !req.files.audio) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  const audioFile = req.files.audio;
  const ext = path.extname(audioFile.name) || '.webm';
  const fileName = `audio_${Date.now()}${ext}`;
  const savePath = path.join(uploadDir, fileName);

  try {
    await audioFile.mv(savePath);
    const checklistFile = await transcribeAndParse(savePath);
    await addFile(userId, path.basename(checklistFile));
    res.json({ download: path.basename(checklistFile) });
  } catch (err) {
    console.error('❌ Upload or processing failed:', err);
    res.status(500).json({ error: 'Failed to process file.' });
  }
});

app.post('/annotate', async (req, res) => {
  const userId = req.body.userId;
  if (!userId)
    return res.status(400).json({ error: 'Missing userId' });
  if (!req.files || !req.files.audio || !req.files.excel) {
    return res.status(400).json({ error: 'Audio and Excel files required.' });
  }

  const audioFile = req.files.audio;
  const excelFile = req.files.excel;

  const audioExt = path.extname(audioFile.name) || '.webm';
  const audioName = `audio_${Date.now()}${audioExt}`;
  const audioPath = path.join(uploadDir, audioName);

  const excelBase = path.basename(excelFile.name);
  const excelExt = path.extname(excelBase) || '.xlsx';
  const excelName = `upload_${Date.now()}_${excelBase}`;
  const excelPath = path.join(uploadDir, excelName);

  try {
    await audioFile.mv(audioPath);
    await excelFile.mv(excelPath);
    const annotated = await transcribeAndAnnotate(audioPath, excelPath, excelBase);
    await addFile(userId, path.basename(annotated));
    res.json({ download: path.basename(annotated) });
  } catch (err) {
    console.error('❌ Annotation failed:', err);
    res.status(500).json({ error: 'Failed to annotate.' });
  }
});

app.get('/files/:userId', async (req, res) => {
  try {
    cleanupOldFiles();
    const rows = await getFiles(req.params.userId);
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const files = rows
      .filter((r) => r.created_at >= cutoff)
      .map((r) => r.file_name);
    res.json({ files });
  } catch {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
