const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'files.db');
const uploadsDir = path.join(__dirname, 'uploads');

// Ensure uploads folder exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const db = new sqlite3.Database(dbPath);

// Initialize DB
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
});

async function addFile(userId, fileName) {
  const stmt = db.prepare("INSERT INTO files (user_id, file_name, created_at) VALUES (?, ?, ?)");
  stmt.run(userId, fileName, Date.now());
  stmt.finalize();
}

async function getFiles(userId) {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM files WHERE user_id = ?", [userId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function deleteFileRecord(fileName) {
  const stmt = db.prepare("DELETE FROM files WHERE file_name = ?");
  stmt.run(fileName);
  stmt.finalize();
}

function cleanupOldFiles() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

  db.all("SELECT * FROM files WHERE created_at < ?", [cutoff], (err, rows) => {
    if (err) return;
    rows.forEach((r) => {
      const filePath = path.join(uploadsDir, r.file_name);
      fs.unlink(filePath, () => {});
    });

    const stmt = db.prepare("DELETE FROM files WHERE created_at < ?");
    stmt.run(cutoff);
    stmt.finalize();
  });
}

module.exports = {
  addFile,
  getFiles,
  deleteFileRecord,
  cleanupOldFiles,
};