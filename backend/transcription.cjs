const fs = require('fs');
const { OpenAI } = require('openai');
const { createChecklist } = require('./checklist.cjs');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Normalize various spoken/written units into consistent short forms.
 * e.g. "millimeters", "mm" → "mm", "feet", "foot" → "ft"
 */
function normalizeUnits(unit) {
  const map = {
    millimeter: 'mm', millimeters: 'mm', mm: 'mm',
    centimeter: 'cm', centimeters: 'cm', cm: 'cm',
    meter: 'm', meters: 'm', m: 'm',
    inch: 'in', inches: 'in', in: 'in',
    foot: 'ft', feet: 'ft', ft: 'ft',
    kilogram: 'kg', kilograms: 'kg', kg: 'kg',
    gram: 'g', grams: 'g', g: 'g',
    pound: 'lb', pounds: 'lb', lbs: 'lb', lb: 'lb',
    degree: '°', degrees: '°',
    second: 's', seconds: 's', s: 's',
    minute: 'min', minutes: 'min', min: 'min',
    newton: 'N', newtons: 'N',
    percent: '%', percentage: '%'
  };

  return map[unit.toLowerCase()] || unit;
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

  // Match part numbers (letters and numbers, e.g., AB-314.01)
  const partMatches = [...rawText.matchAll(/part\s+([a-zA-Z0-9\-\.]+)/gi)];

  // Match dimension values
  const dimMatches = [...rawText.matchAll(/dimension\s+(\d+(\.\d+)?)/gi)];

  for (let i = 0; i < Math.min(partMatches.length, dimMatches.length); i++) {
    const part = partMatches[i][1];
    const measured = dimMatches[i][1];

    // Look ahead in the transcript to find the unit near the dimension
    const dimIndex = dimMatches[i].index;
    const nearbyText = rawText.slice(dimIndex, dimIndex + 50);

    const unitMatch = nearbyText.match(
      /\b(mm|millimeter(?:s)?|cm|centimeter(?:s)?|m|meter(?:s)?|in|inch(?:es)?|ft|feet|foot|kg|kilogram(?:s)?|g|gram(?:s)?|lb|pound(?:s)?|lbs|degree(?:s)?|°|percent(?:age)?|%|second(?:s)?|s|min|minute(?:s)?|newton(?:s)?)\b/i
    );

    const normalizedUnit = unitMatch ? normalizeUnits(unitMatch[0]) : '';

    parsed.push({
      part,
      measured,
      unit: normalizedUnit
    });
  }

  console.log('📋 Parsed result:', parsed);

  const checklistPath = await createChecklist(parsed);
  return checklistPath;
}

module.exports = { transcribeAndParse };
