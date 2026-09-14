require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exitCode = 1;
} else {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });

  pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(80) UNIQUE NOT NULL,
      email VARCHAR(254) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      welcome_message TEXT NOT NULL DEFAULT 'Welcome to Beacon Wealth. Your account is ready to explore.',
      balance NUMERIC(18, 2) NOT NULL DEFAULT 0
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_message TEXT NOT NULL DEFAULT 'Welcome to Beacon Wealth. Your account is ready to explore.';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS balance NUMERIC(18, 2) NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS verification_codes (
      id BIGSERIAL PRIMARY KEY,
      email VARCHAR(254) NOT NULL,
      code VARCHAR(10) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
  `)
    .then(() => console.log('Postgres tables ready.'))
    .catch((error) => {
      console.error('Database initialization failed:', error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}