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

  // Pattern: match any mention of a part number
  const partPattern = /part(?: number)?(?: is)?\s*([a-zA-Z0-9\-\.]+)/gi;
  const dimensionPattern = /(\d+(\.\d+)?)\s*(mm|millimeters?|cm|centimeters?|m|meters?|in|inches?|ft|feet|foot|lbs|pounds?|kg|kilograms?|g|grams?|degrees?)/gi;

  const parts = [...rawText.matchAll(partPattern)];
  const dims = [...rawText.matchAll(dimensionPattern)];

  for (let i = 0; i < Math.min(parts.length, dims.length); i++) {
    const part = parts[i][1];
    const measured = dims[i][1];
    const unitRaw = dims[i][3];

    const unit = normalizeUnit(unitRaw);

    parsed.push({ part, measured, unit });
  }

  console.log('📋 Parsed result:', parsed);

  const checklistPath = await createChecklist(parsed);
  return checklistPath;
}

module.exports = { transcribeAndParse };
