const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, 'files.json');

function readData() {
  try {
    return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  } catch {
    return [];
  }
}

function writeData(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data));
}

async function addFile(userId, fileName) {
  const data = readData();
  data.push({ userId, fileName, createdAt: Date.now() });
  writeData(data);
}

async function getFiles(userId) {
  return readData().filter((r) => r.userId === userId);
}

async function deleteFileRecord(fileName) {
  const data = readData().filter((r) => r.fileName !== fileName);
  writeData(data);
}

function cleanupOldFiles() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let data = readData();
  data.forEach((r) => {
    if (r.createdAt < cutoff) {
      const filePath = path.join(__dirname, 'uploads', r.fileName);
      fs.unlink(filePath, () => {});
    }
  });
  data = data.filter((r) => r.createdAt >= cutoff);
  writeData(data);
}

module.exports = { addFile, getFiles, deleteFileRecord, cleanupOldFiles };
