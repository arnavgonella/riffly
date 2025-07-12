const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "files.db");
const uploadsDir = path.join(__dirname, "uploads");

// Ensure uploads folder exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const db = new Database(dbPath);

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

function addFile(userId, fileName) {
  const stmt = db.prepare("INSERT INTO files (user_id, file_name, created_at) VALUES (?, ?, ?)");
  stmt.run(userId, fileName, Date.now());
}

function getFiles(userId) {
  const stmt = db.prepare("SELECT * FROM files WHERE user_id = ?");
  return stmt.all(userId);
}

function deleteFileRecord(fileName) {
  const stmt = db.prepare("DELETE FROM files WHERE file_name = ?");
  stmt.run(fileName);
}

function cleanupOldFiles() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const oldFiles = db.prepare("SELECT * FROM files WHERE created_at < ?").all(cutoff);

  oldFiles.forEach((r) => {
    const filePath = path.join(uploadsDir, r.file_name);
    fs.unlink(filePath, () => {});
  });

  db.prepare("DELETE FROM files WHERE created_at < ?").run(cutoff);
}

module.exports = {
  addFile,
  getFiles,
  deleteFileRecord,
  cleanupOldFiles,
};
