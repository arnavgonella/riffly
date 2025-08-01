const fs = require('fs');
const { OpenAI } = require('openai');
const { createChecklist, annotateChecklist } = require('./checklist.cjs');

// Polyfill for older Node versions
if (typeof global.File === 'undefined') {
  const { File, Blob } = require('node:buffer');
  global.File = File;
  global.Blob = Blob;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const UNIT_MAP = {
  millimeter: 'mm', millimeters: 'mm', mm: 'mm',
  centimeter: 'cm', centimeters: 'cm', cm: 'cm',
  meter: 'm', meters: 'm', m: 'm',
  inch: 'in', inches: 'in', in: 'in',
  foot: 'ft', feet: 'ft', ft: 'ft',
  pound: 'lbs', pounds: 'lbs', lbs: 'lbs',
  kilogram: 'kg', kilograms: 'kg', kg: 'kg',
  gram: 'g', grams: 'g', g: 'g',
  degree: '°', degrees: '°',
};

function normalizeUnit(text) {
  const cleaned = text.toLowerCase().trim();
  return UNIT_MAP[cleaned] || cleaned;
}

function convertUnit(value, from, to) {
  const LENGTH_FACTORS = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 };
  const MASS_FACTORS = { g: 1, kg: 1000, lbs: 453.592 };
  const f = normalizeUnit(from);
  const t = normalizeUnit(to);
  if (f === t) return value;
  if (LENGTH_FACTORS[f] && LENGTH_FACTORS[t]) {
    const meters = value * LENGTH_FACTORS[f];
    return meters / LENGTH_FACTORS[t];
  }
  if (MASS_FACTORS[f] && MASS_FACTORS[t]) {
    const grams = value * MASS_FACTORS[f];
    return grams / MASS_FACTORS[t];
  }
  return value;
}

function parseNumber(val) {
  if (val == null) return NaN;
  if (typeof val === 'number') return val;
  const match = String(val).match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : NaN;
}

function wordsToNumber(str) {
  const singles = {
    zero: 0, one: 1, two: 2, three: 3, four: 4,
    five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13,
    fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19,
  };
  const tens = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  };
  const tokens = str.replace(/-/g, ' ').toLowerCase().split(/\s+/).filter(t => t !== 'and' && t !== 'a');
  let result = 0;
  let decimal = false;
  let decimalStr = '';
  for (const t of tokens) {
    if (t === 'point' || t === 'dot') {
      decimal = true;
      continue;
    }
    if (t === 'half') {
      decimalStr += '5';
      continue;
    }
    if (t === 'quarter') {
      decimalStr += '25';
      continue;
    }
    if (singles[t] != null) {
      if (decimal) decimalStr += String(singles[t]);
      else result += singles[t];
      continue;
    }
    if (tens[t] != null) {
      if (decimal) decimalStr += String(tens[t] / 10);
      else result += tens[t];
      continue;
    }
    const fracMatch = t.match(/^(\d+)\/(\d+)$/);
    if (fracMatch) {
      const [_, num, den] = fracMatch;
      const frac = parseInt(num) / parseInt(den);
      if (decimal) decimalStr += String(frac).split('.')[1] || '';
      else result += frac;
    }
  }
  if (decimal && decimalStr) result += parseFloat('0.' + decimalStr);
  return result;
}

function parseNumericSlice(slice) {
  if (!slice) return NaN;
  const replaced = slice.replace(/(?:point|dot)/gi, '.');
  const digits = replaced.match(/-?\d+(?:\.\d+)?/);
  let result = digits ? parseFloat(digits[0]) : NaN;
  if (!isNaN(result)) {
    const after = replaced.slice(digits.index + digits[0].length);
    const frac = after.match(/(\d+)\/(\d+)/);
    if (frac) result += parseInt(frac[1]) / parseInt(frac[2]);
    else if (/half/i.test(after)) result += 0.5;
    else if (/quarter/i.test(after)) result += 0.25;
    return result;
  }
  return wordsToNumber(slice);
}

function parseTranscript(rawText) {
  const results = [];
  const partPattern = /part(?: number)?(?: is)?\s*([a-zA-Z0-9\-\.]+)/gi;
  const unitPattern = /\b(mm|millimeters?|cm|centimeters?|m|meters?|in|inches?|ft|feet|foot|lbs|pounds?|kg|kilograms?|g|grams?|degrees?)\b/i;
  const parts = [];
  let match;
  while ((match = partPattern.exec(rawText))) {
    parts.push({ part: match[1], index: match.index + match[0].length });
  }

  for (let i = 0; i < parts.length; i++) {
    const start = parts[i].index;
    const end = i + 1 < parts.length ? parts[i + 1].index : rawText.length;
    const segment = rawText.slice(start, end);
    const unitMatch = segment.match(unitPattern);
    if (!unitMatch) continue;
    const unit = normalizeUnit(unitMatch[1]);
    const before = segment.slice(0, unitMatch.index).trim();
    const tokens = before.split(/\s+/);
    const look = [];
    const allowed = /^(?:-?\d+(?:\.\d+)?|\d+\/\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|point|dot|and|a|half|quarter)$/i;
    for (let j = tokens.length - 1; j >= 0; j--) {
      const t = tokens[j];
      if (allowed.test(t)) look.unshift(t);
      else if (look.length > 0) break;
    }
    const slice = look.join(' ');
    const measured = parseNumericSlice(slice);
    results.push({ part: parts[i].part, measured, unit });
  }

  return results;
}

async function transcribeAndParse(fileUrl, images = [], baseUrl = null) {
  console.log('🔊 Received file:', fileUrl);
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
  const blob = await response.blob();
  const file = new File([blob], new URL(fileUrl).pathname.split('/').pop(), { type: blob.type });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
  });

  const rawText = transcription.text.trim();
  console.log('📝 Transcript:', rawText);
  const parsed = parseTranscript(rawText);
  console.log('📋 Parsed result:', parsed);

  const partTimes = [];
  const partRegex = /part(?: number)?(?: is)?\s*([a-zA-Z0-9\-\.]+)/gi;
  if (Array.isArray(transcription.segments)) {
    for (const seg of transcription.segments) {
      let m;
      while ((m = partRegex.exec(seg.text))) {
        partTimes.push(seg.start);
      }
    }
  }

  for (let i = 0; i < parsed.length && i < partTimes.length; i++) {
    parsed[i].time = partTimes[i];
  }

  if (parsed.length > 0) {
    images.forEach((img) => {
      let target = parsed[0];
      for (const p of parsed) {
        if (img.time >= (p.time || 0)) target = p;
        else break;
      }
      if (!target.images) target.images = [];
      target.images.push(img.path);
    });
  }

  return await createChecklist(parsed, baseUrl);
}

async function transcribeAndAnnotate(audioUrl, excelUrl, originalName, images = [], baseUrl = null) {
  console.log('🔊 Received files:', audioUrl, excelUrl);

  // Transcribe audio from URL
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
  const audioBlob = await audioResponse.blob();
  const audioFile = new File([audioBlob], new URL(audioUrl).pathname.split('/').pop(), { type: audioBlob.type });

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    response_format: 'verbose_json',
  });

  // Download Excel file to a temporary path
  const excelResponse = await fetch(excelUrl);
  if (!excelResponse.ok) throw new Error(`Failed to fetch excel: ${excelResponse.statusText}`);
  const excelBuffer = await excelResponse.arrayBuffer();
  const tempDir = './temp';
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  const tempExcelPath = `${tempDir}/${originalName}`;
  fs.writeFileSync(tempExcelPath, Buffer.from(excelBuffer));

  const rawText = transcription.text.trim();
  console.log('📝 Transcript:', rawText);
  const parsed = parseTranscript(rawText);
  console.log('📋 Parsed result:', parsed);

  const partTimes = [];
  const partRegex = /part(?: number)?(?: is)?\s*([a-zA-Z0-9\-\.]+)/gi;
  if (Array.isArray(transcription.segments)) {
    for (const seg of transcription.segments) {
      let m;
      while ((m = partRegex.exec(seg.text))) {
        partTimes.push(seg.start);
      }
    }
  }

  for (let i = 0; i < parsed.length && i < partTimes.length; i++) {
    parsed[i].time = partTimes[i];
  }

  if (parsed.length > 0) {
    images.forEach((img) => {
      let target = parsed[0];
      for (const p of parsed) {
        if (img.time >= (p.time || 0)) target = p;
        else break;
      }
      if (!target.images) target.images = [];
      target.images.push(img.path);
    });
  }

  const result = await annotateChecklist(tempExcelPath, parsed, originalName, baseUrl);
  fs.unlinkSync(tempExcelPath); // Clean up temporary file
  return result;
}

module.exports = { transcribeAndParse, transcribeAndAnnotate };
