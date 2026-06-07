const sqlite3 = require('sqlite3').verbose();

// This creates a physical file named "database.sqlite" in your folder
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create our tables
db.serialize(() => {
  // 1. The Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `, (err) => {
    if (err) console.error('Error creating users table:', err.message);
    else console.log('Users table ready.');
  });

  // 2. The Temporary 2FA Verification Codes Table
  db.run(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL
    )
  `, (err) => {
    if (err) console.error('Error creating codes table:', err.message);
    else console.log('Verification codes table ready.');
  });
});

db.close();