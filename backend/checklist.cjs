const ExcelJS = require('exceljs');
const path = require('path');

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

async function annotateChecklist(originalPath, data) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(originalPath);

  const sheet = workbook.worksheets[0];

  const startCol = sheet.columnCount + 1;
  sheet.getRow(1).getCell(startCol).value = 'Recorded Value';
  sheet.getRow(1).getCell(startCol + 1).value = 'Recorded Unit';

  data.forEach((entry) => {
    for (let i = 2; i <= sheet.rowCount; i++) {
      const cell = sheet.getRow(i).getCell(1).value;
      if (
        cell &&
        String(cell).trim().toLowerCase() ===
          String(entry.part).trim().toLowerCase()
      ) {
        sheet.getRow(i).getCell(startCol).value = entry.measured;
        sheet.getRow(i).getCell(startCol + 1).value = entry.unit;
        break;
      }
    }
  });

  const date = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
  const baseName = path.basename(originalPath);
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
