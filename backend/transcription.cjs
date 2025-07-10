const fs = require('fs');
const { OpenAI } = require('openai');
const { createChecklist } = require('./checklist.cjs');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const UNIT_MAP = {
  millimeter: 'mm',
  millimeters: 'mm',
  mm: 'mm',
  centimeter: 'cm',
  centimeters: 'cm',
  cm: 'cm',
  meter: 'm',
  meters: 'm',
  m: 'm',
  inch: 'in',
  inches: 'in',
  in: 'in',
  foot: 'ft',
  feet: 'ft',
  ft: 'ft',
  pound: 'lbs',
  pounds: 'lbs',
  lbs: 'lbs',
  kilogram: 'kg',
  kilograms: 'kg',
  kg: 'kg',
  gram: 'g',
  grams: 'g',
  g: 'g',
  degree: '°',
  degrees: '°',
};

function normalizeUnit(text) {
  const cleaned = text.toLowerCase().trim();
  return UNIT_MAP[cleaned] || cleaned;
}

async function transcribeAndParse(filePath) {
  console.log('🔊 Received file:', filePath);

  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
  });

  const rawText = transcription.text.trim();
  console.log('📝 Transcript:', rawText);

  const parsed = [];

  // Match all part numbers like "part 318-02.03a"
  const partMatches = [...rawText.matchAll(/part\s+([a-zA-Z0-9\-\.]+)/gi)];

  // Match all dimensions like "dimension 3" or "3 millimeters"
  const dimMatches = [...rawText.matchAll(/dimension\s+(\d+(\.\d+)?)/gi)];

  for (let i = 0; i < Math.min(partMatches.length, dimMatches.length); i++) {
    const part = partMatches[i][1];
    const measured = dimMatches[i][1];

    // Look for unit within ±50 characters of the match
    const dimIndex = dimMatches[i].index;
    const surrounding = rawText.slice(
      Math.max(0, dimIndex - 50),
      dimIndex + 50
    );

    const unitRegex = new RegExp(
      "\\b(mm|millimeters?|cm|centimeters?|m|meters?|in|inches?|ft|feet|foot|lbs|pounds?|kg|kilograms?|g|grams?|degrees?)\\b",
      "i"
    );

    const unitMatch = surrounding.match(unitRegex);
    const unit = unitMatch ? normalizeUnit(unitMatch[0]) : '';

    parsed.push({ part, measured, unit });
  }

  console.log('📋 Parsed result:', parsed);

  const checklistPath = await createChecklist(parsed);
  return checklistPath;
}

module.exports = { transcribeAndParse };
