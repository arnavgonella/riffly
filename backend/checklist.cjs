const ExcelJS = require('exceljs');
const path = require('path');

function normalizeUnit(text) {
  const map = {
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

async function createChecklist(data) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inspection Results');

  sheet.columns = [
    { header: 'Part Number', key: 'part', width: 15 },
    { header: 'Measured Value', key: 'measured', width: 20 },
    { header: 'Unit', key: 'unit', width: 10 },
  ];

  data.forEach((entry) => {
    sheet.addRow(entry);
  });

  const filePath = path.join(
    __dirname,
    'uploads',
    `inspection_${Date.now()}.xlsx`
  );
  await workbook.xlsx.writeFile(filePath);
  console.log('✅ Excel generated at:', filePath);
  return path.basename(filePath);
}

async function annotateChecklist(originalPath, data, originalName = null) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(originalPath);

  const sheet = workbook.worksheets[0];

  const startCol = sheet.columnCount + 1;
  sheet.getRow(1).getCell(startCol).value = 'Recorded Value';
  sheet.getRow(1).getCell(startCol + 1).value = 'Recorded Unit';
  sheet.getRow(1).getCell(startCol + 2).value = 'Comment';

  // detect relevant columns
  let partCol = 1;
  let dimCol = null;
  let unitCol = null;
  let tolCol = null;
  sheet.getRow(1).eachCell((cell, col) => {
    const header = String(cell.value || '').toLowerCase();
    if (header.includes('part')) partCol = col;
    if (header.match(/dimension|target|nominal|value/)) dimCol = col;
    if (header.includes('unit')) unitCol = col;
    if (header.match(/tolerance|allowable/)) tolCol = col;
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
        String(cell).trim().toLowerCase() ===
          String(entry.part).trim().toLowerCase()
      ) {
        let targetUnit = headerUnit;
        if (unitCol) {
          targetUnit = sheet.getRow(i).getCell(unitCol).value || targetUnit;
        }
        targetUnit = targetUnit ? normalizeUnit(String(targetUnit)) : entry.unit;

        const measured = convertUnit(entry.measured, entry.unit, targetUnit);

        sheet.getRow(i).getCell(startCol).value = measured;
        sheet.getRow(i).getCell(startCol + 1).value = targetUnit;

        if (tolCol && dimCol) {
          const targetVal = parseNumber(sheet.getRow(i).getCell(dimCol).value);
          const tolVal = parseNumber(sheet.getRow(i).getCell(tolCol).value);
          if (!isNaN(targetVal) && !isNaN(tolVal)) {
            const lower = targetVal - tolVal;
            const upper = targetVal + tolVal;
            if (measured < lower || measured > upper) {
              const diff = measured < lower ? lower - measured : measured - upper;
              sheet.getRow(i).getCell(startCol + 2).value = `Out of spec by ${diff.toFixed(2)} ${targetUnit}`;
            }
          }
        }
        break;
      }
    }
  });

  const date = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
  const baseName = originalName ? path.basename(originalName) : path.basename(originalPath);
  const filePath = path.join(
    __dirname,
    'uploads',
    `annotated_${date}_${baseName}`
  );

  await workbook.xlsx.writeFile(filePath);
  console.log('✅ Annotated Excel created at:', filePath);
  return path.basename(filePath);
}

module.exports = { createChecklist, annotateChecklist };
