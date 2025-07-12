const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'riffly.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`);
});

function addFile(userId, fileName) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO files (user_id, file_name, created_at) VALUES (?, ?, ?)',
      [userId, fileName, Date.now()],
      (err) => {
        if (err) reject(err); else resolve();
      }
    );
  });
}

function getFiles(userId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT file_name, created_at FROM files WHERE user_id = ?', [userId], (err, rows) => {
      if (err) reject(err); else resolve(rows || []);
    });
  });
}

function deleteFileRecord(fileName) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM files WHERE file_name = ?', [fileName], (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

function cleanupOldFiles() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 1 week
  db.all('SELECT file_name, created_at FROM files WHERE created_at < ?', [cutoff], (err, rows) => {
    if (err || !rows) return;
    rows.forEach((row) => {
      const filePath = path.join(__dirname, 'uploads', row.file_name);
      fs.unlink(filePath, () => {});
      deleteFileRecord(row.file_name);
    });
  });
}

module.exports = { addFile, getFiles, deleteFileRecord, cleanupOldFiles };
