const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const DEFAULT_BASE_URL = process.env.BACKEND_PUBLIC_URL || 'http://localhost:3001';

function normalizeUnit(text) {
  const map = {
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
  const cleaned = String(text || '').toLowerCase().trim();
  return map[cleaned] || cleaned;
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

async function createChecklist(data, baseUrl = DEFAULT_BASE_URL) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inspection Results');

  sheet.columns = [
    { header: 'Part Number', key: 'part', width: 15 },
    { header: 'Measured Value', key: 'measured', width: 20 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Comment', key: 'comment', width: 30 },
  ];

  data.forEach((entry, idx) => {
    const row = sheet.addRow({
      part: entry.part,
      measured: entry.measured,
      unit: entry.unit,
      comment: '',
    });

    if (entry.images && entry.images.length > 0) {
      const pageName = `images_${idx}_${Date.now()}.html`;
      const pagePath = path.join(__dirname, 'uploads', pageName);
      const imgs = entry.images
        .map((img) => `<img src="${path.basename(img)}" style="max-width:100%;margin-bottom:10px;"/>`)
        .join('\n');
      const html = `<!DOCTYPE html><html><body>${imgs}</body></html>`;
      fs.writeFileSync(pagePath, html);
      row.getCell(4).value = {
        text: 'View Photos',
        hyperlink: `${baseUrl}/uploads/${pageName}`,
      };
    }
  });

  const filePath = path.join(__dirname, 'uploads', `inspection_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  console.log('✅ Excel generated at:', filePath);
  return path.basename(filePath);
}

async function annotateChecklist(originalPath, data, originalName = null, baseUrl = DEFAULT_BASE_URL) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(originalPath);
  const sheet = workbook.worksheets[0];

  const startCol = sheet.columnCount + 1;
  sheet.getRow(1).getCell(startCol).value = 'Recorded Value';
  sheet.getRow(1).getCell(startCol + 1).value = 'Recorded Unit';
  sheet.getRow(1).getCell(startCol + 2).value = 'Comment';

  let partCol = 1;
  let dimCol = null;
  let unitCol = null;
  let tolCol = null;

  sheet.getRow(1).eachCell((cell, col) => {
    const header = String(cell.value || '').toLowerCase();
    if (header.includes('recorded') || header.includes('comment')) return;
    if (header.includes('part')) partCol = col;
    if (!dimCol && header.match(/dimension|target|nominal|value/)) dimCol = col;
    if (!unitCol && header.includes('unit')) unitCol = col;
    if (!tolCol && header.match(/tolerance|allowable/)) tolCol = col;
  });

  const getUnitFromHeader = () => {
    const hdr = dimCol ? sheet.getRow(1).getCell(dimCol).value : '';
    if (typeof hdr === 'string') {
      const match = hdr.match(/\(([^)]+)\)/);
      if (match) return match[1];
    }
    return null;
  };

  const headerUnit = getUnitFromHeader();

  data.forEach((entry) => {
    for (let i = 2; i <= sheet.rowCount; i++) {
      const cell = sheet.getRow(i).getCell(partCol).value;
      if (
        cell &&
        String(cell).trim().toLowerCase() === String(entry.part).trim().toLowerCase()
      ) {
        let targetUnit = headerUnit;
        if (unitCol) {
          targetUnit = sheet.getRow(i).getCell(unitCol).value || targetUnit;
        }
        targetUnit = targetUnit ? normalizeUnit(String(targetUnit)) : entry.unit;

        const measured = convertUnit(entry.measured, entry.unit, targetUnit);

        sheet.getRow(i).getCell(startCol).value = measured;
        sheet.getRow(i).getCell(startCol + 1).value = targetUnit;

        let specText = '';
        if (tolCol && dimCol) {
          const targetVal = parseNumber(sheet.getRow(i).getCell(dimCol).value);
          const tolVal = parseNumber(sheet.getRow(i).getCell(tolCol).value);
          if (!isNaN(targetVal) && !isNaN(tolVal)) {
            const lower = targetVal - tolVal;
            const upper = targetVal + tolVal;
            if (measured < lower || measured > upper) {
              const diff = measured < lower ? lower - measured : measured - upper;
              specText = `Out of spec by ${diff.toFixed(2)} ${targetUnit}`;
            } else {
              specText = 'In spec';
            }
          }
        }

        if (specText) {
          sheet.getRow(i).getCell(startCol + 2).value = specText;
        }

        if (entry.images && entry.images.length > 0) {
          const pageName = `images_${i - 1}_${Date.now()}.html`;
          const pagePath = path.join(__dirname, 'uploads', pageName);
          const imgs = entry.images
            .map((img) => `<img src="${path.basename(img)}" style="max-width:100%;margin-bottom:10px;"/>`)
            .join('\n');
          const html = `<!DOCTYPE html><html><body>${imgs}</body></html>`;
          fs.writeFileSync(pagePath, html);

          const cell = sheet.getRow(i).getCell(startCol + 2);
          if (!cell.value || typeof cell.value === 'string') {
            cell.value = {
              text: typeof cell.value === 'string' ? cell.value : 'View Photos',
              hyperlink: `${baseUrl}/uploads/${pageName}`,
            };
          }
          cell.font = { color: { argb: 'FF0000FF' }, underline: true };
        }

        break;
      }
    }
  });

  const date = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
  const baseName = originalName ? path.basename(originalName) : path.basename(originalPath);
  const filePath = path.join(__dirname, 'uploads', `annotated_${date}_${baseName}`);

  await workbook.xlsx.writeFile(filePath);
  console.log('✅ Annotated Excel created at:', filePath);
  return path.basename(filePath);
}

module.exports = { createChecklist, annotateChecklist };
