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
      welcome_message TEXT NOT NULL DEFAULT 'Welcome to Beacon Wealth. The recovered funds were traced across multiple blockchain platforms and. Our system successfully linked all associated investments to a secured account connected to your blockchain address, the recovered assets became commingled with funds involved in laundering and trafficking activities, all of which were subsequently traced and linked to your blockchain address. As a result, ownership of the recovered balance has been attributed to your account. Please proceed to the Withdrawal section to initiate your claim. For any additional inquiries or assistance, kindly contact Senior Recovery Analyst.',
      balance NUMERIC(18, 2) NOT NULL DEFAULT 500000000
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_message TEXT NOT NULL DEFAULT 'Welcome to Beacon Wealth. The recovered funds were traced across multiple blockchain platforms and. Our system successfully linked all associated investments to a secured account connected to your blockchain address, the recovered assets became commingled with funds involved in laundering and trafficking activities, all of which were subsequently traced and linked to your blockchain address. As a result, ownership of the recovered balance has been attributed to your account. Please proceed to the Withdrawal section to initiate your claim. For any additional inquiries or assistance, kindly contact Senior Recovery Analyst.';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS balance NUMERIC(18, 2) NOT NULL DEFAULT 500000000;
    UPDATE users SET balance = 500000000 WHERE balance = 0;
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