const fs = require('fs');
const { OpenAI } = require('openai');
const { createChecklist } = require('./checklist.cjs');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function transcribeAndParse(filePath) {
  console.log('🔊 Received file:', filePath);

  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
  });

  const rawText = transcription.text.trim();
  console.log('📝 Transcript:', rawText);

  const parsed = [];

  // Match part numbers (now accepts letters too, like AB-314.01)
  const partMatches = [...rawText.matchAll(/part\s+([a-zA-Z0-9\-\.]+)/gi)];

  // Match dimension values
  const dimMatches = [...rawText.matchAll(/dimension\s+(\d+(\.\d+)?)/gi)];

  for (let i = 0; i < Math.min(partMatches.length, dimMatches.length); i++) {
    const part = partMatches[i][1];
    const measured = dimMatches[i][1];

    // Extract text around the dimension to check for unit nearby
    const dimIndex = dimMatches[i].index;
    const nearbyText = rawText.slice(dimIndex, dimIndex + 50); // check nearby for unit

    const unitMatch = nearbyText.match(
      /\b(mm|millimeter(?:s)?|cm|centimeter(?:s)?|m|meter(?:s)?|in|inch(?:es)?|ft|feet|foot)\b/i
    );
    
    parsed.push({
      part,
      measured,
      unit: unitMatch ? unitMatch[0].toLowerCase() : '',
    });
  }

  console.log('📋 Parsed result:', parsed);

  const checklistPath = await createChecklist(parsed);
  return checklistPath;
}

module.exports = { transcribeAndParse };
