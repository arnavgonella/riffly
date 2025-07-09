const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs');
const path = require('path');
const { transcribeAndParse } = require('./transcription.cjs');



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

app.post('/upload', async (req, res) => {
  if (!req.files || !req.files.audio) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  const audioFile = req.files.audio;

  // Save audio file
  const fileName = `audio_${Date.now()}.wav`;
  const savePath = path.join(uploadDir, fileName);

  try {
    await audioFile.mv(savePath);
    const checklistPath = await transcribeAndParse(savePath);

    // Send filename only (for frontend to download)
    res.json({ download: path.basename(checklistPath) });
  } catch (err) {
    console.error('❌ Upload or processing failed:', err);
    res.status(500).json({ error: 'Failed to process file.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
