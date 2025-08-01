const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');
const path = require('path');
const { supabase } = require('./supabaseClient.cjs');
const { transcribeAndParse, transcribeAndAnnotate } = require('./transcription.cjs');
const { addFile, getFiles } = require('./db.cjs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(fileUpload());
app.use(express.json());

app.post('/upload', async (req, res) => {
  const userId = req.body.userId;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!req.files || !req.files.audio) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  const audioFile = req.files.audio;
  const imageFilesRaw = req.files.images;
  const timestampsRaw = req.body.timestamps;

  const ext = path.extname(audioFile.name) || '.webm';
  const fileName = `audio_${Date.now()}${ext}`;
  const imageFiles = imageFilesRaw
    ? Array.isArray(imageFilesRaw)
      ? imageFilesRaw
      : [imageFilesRaw]
    : [];
  const timestamps = timestampsRaw ? JSON.parse(timestampsRaw) : [];
  const savedImages = [];

  try {
    const { data: audioData, error: audioError } = await supabase.storage
      .from('files')
      .upload(`${userId}/${fileName}`, audioFile.data, {
        contentType: audioFile.mimetype,
      });
    if (audioError) throw audioError;

    for (let i = 0; i < imageFiles.length; i++) {
      const img = imageFiles[i];
      const ext = path.extname(img.name) || '.jpg';
      const name = `image_${Date.now()}_${i}${ext}`;
      const { data: imgData, error: imgError } = await supabase.storage
        .from('files')
        .upload(`${userId}/${name}`, img.data, { contentType: img.mimetype });
      if (imgError) throw imgError;

      const { data: publicUrlData } = supabase.storage.from('files').getPublicUrl(`${userId}/${name}`);
      savedImages.push({ path: publicUrlData.publicUrl, time: Number(timestamps[i] || 0) });
    }

    const { data: publicUrlData } = supabase.storage.from('files').getPublicUrl(`${userId}/${fileName}`);
    const checklistFile = await transcribeAndParse(publicUrlData.publicUrl, savedImages);
    const checklistContent = fs.readFileSync(checklistFile);
    const checklistName = path.basename(checklistFile);

    const { data: checklistData, error: checklistError } = await supabase.storage
      .from('files')
      .upload(`${userId}/${checklistName}`, checklistContent, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    if (checklistError) throw checklistError;

    await addFile(userId, checklistName);

    res.json({ download: checklistName });
  } catch (err) {
    console.error('❌ Upload or processing failed:', err);
    res.status(500).json({ error: 'Failed to process file.' });
  }
});

app.post('/annotate', async (req, res) => {
  const userId = req.body.userId;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!req.files || !req.files.audio || !req.files.excel) {
    return res.status(400).json({ error: 'Audio and Excel files required.' });
  }

  const audioFile = req.files.audio;
  const excelFile = req.files.excel;
  const imageFilesRaw = req.files.images;
  const timestampsRaw = req.body.timestamps;

  const audioExt = path.extname(audioFile.name) || '.webm';
  const audioName = `audio_${Date.now()}${audioExt}`;

  const imageFiles = imageFilesRaw
    ? Array.isArray(imageFilesRaw)
      ? imageFilesRaw
      : [imageFilesRaw]
    : [];
  const timestamps = timestampsRaw ? JSON.parse(timestampsRaw) : [];
  const savedImages = [];

  const excelBase = path.basename(excelFile.name);
  const excelName = `upload_${Date.now()}_${excelBase}`;

  try {
    const { data: audioData, error: audioError } = await supabase.storage
      .from('files')
      .upload(`${userId}/${audioName}`, audioFile.data, {
        contentType: audioFile.mimetype,
      });
    if (audioError) throw audioError;

    const { data: excelData, error: excelError } = await supabase.storage
      .from('files')
      .upload(`${userId}/${excelName}`, excelFile.data, {
        contentType: excelFile.mimetype,
      });
    if (excelError) throw excelError;

    for (let i = 0; i < imageFiles.length; i++) {
      const img = imageFiles[i];
      const ext = path.extname(img.name) || '.jpg';
      const name = `image_${Date.now()}_${i}${ext}`;
      const { data: imgData, error: imgError } = await supabase.storage
        .from('files')
        .upload(`${userId}/${name}`, img.data, { contentType: img.mimetype });
      if (imgError) throw imgError;

      const { data: publicUrlData } = supabase.storage.from('files').getPublicUrl(`${userId}/${name}`);
      savedImages.push({ path: publicUrlData.publicUrl, time: Number(timestamps[i] || 0) });
    }

    const { data: audioPublicUrl } = supabase.storage.from('files').getPublicUrl(`${userId}/${audioName}`);
    const { data: excelPublicUrl } = supabase.storage.from('files').getPublicUrl(`${userId}/${excelName}`);

    const annotated = await transcribeAndAnnotate(
      audioPublicUrl.publicUrl,
      excelPublicUrl.publicUrl,
      excelBase,
      savedImages
    );
    const annotatedContent = fs.readFileSync(annotated);
    const annotatedName = path.basename(annotated);

    const { data: annotatedData, error: annotatedError } = await supabase.storage
      .from('files')
      .upload(`${userId}/${annotatedName}`, annotatedContent, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    await addFile(userId, annotatedName);
    res.json({ download: annotatedName });
  } catch (err) {
    console.error('❌ Annotation failed:', err);
    res.status(500).json({ error: 'Failed to annotate.' });
  }
});

app.get('/files/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase.storage.from('files').list(req.params.userId);
    if (error) throw error;

    const files = data
      .filter((f) => f.name.startsWith('annotated'))
      .map((f) => f.name);

    res.json({ files });
  } catch (err) {
    console.error('Error fetching files:', err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
