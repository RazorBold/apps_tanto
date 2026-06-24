const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'solar_tracker.db')
  : path.join(__dirname, 'solar_tracker.db');

let db = null;

// Save database to disk
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Auto-save every 30 seconds
let saveInterval = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('✅ Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('✅ Created new database');
  }

  // Enable WAL-like behavior (not exactly WAL in sql.js but helps)
  db.run('PRAGMA journal_mode = MEMORY;');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'teknisi',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS installations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imei TEXT NOT NULL,
      device_model TEXT NOT NULL,
      container_number TEXT,
      notes TEXT,
      installed_by INTEGER NOT NULL,
      latitude REAL,
      longitude REAL,
      city TEXT,
      battery_percent INTEGER,
      last_device_timestamp TEXT,
      photo_path TEXT,
      installation_date DATE DEFAULT (date('now')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (installed_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS device_check_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imei TEXT NOT NULL,
      checked_by INTEGER NOT NULL,
      device_data TEXT,
      is_online INTEGER,
      checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (checked_by) REFERENCES users(id)
    )
  `);

  // Create indexes
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_installations_imei ON installations(imei)');
    db.run('CREATE INDEX IF NOT EXISTS idx_installations_date ON installations(installation_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_installations_user ON installations(installed_by)');
    db.run('CREATE INDEX IF NOT EXISTS idx_device_check_imei ON device_check_logs(imei)');
  } catch (e) {
    // Indexes may already exist
  }

  // Seed default admin user if not exists
  const adminCheck = db.exec("SELECT id FROM users WHERE username = 'admin'");
  if (adminCheck.length === 0 || adminCheck[0].values.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      ['admin', hash, 'Administrator', 'admin']
    );
    console.log('✅ Default admin user created (admin / admin123)');
  }

  // Save to disk
  saveDatabase();

  // Auto-save every 30 seconds
  saveInterval = setInterval(saveDatabase, 30000);

  return db;
}

// Helper: convert sql.js result to array of objects
function queryAll(sql, params = []) {
  const result = db.exec(sql, params);
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

// Helper: get single row
function queryGet(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: run insert/update/delete and return changes info
function queryRun(sql, params = []) {
  db.run(sql, params);
  const changes = db.exec("SELECT changes() as changes, last_insert_rowid() as lastId");
  const result = {
    changes: changes[0]?.values[0]?.[0] || 0,
    lastInsertRowid: changes[0]?.values[0]?.[1] || 0
  };
  // Auto-save after writes
  saveDatabase();
  return result;
}

function getDb() {
  return db;
}

module.exports = { initDatabase, queryAll, queryGet, queryRun, getDb, saveDatabase, DB_PATH };
