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

module.exports = { createChecklist };
