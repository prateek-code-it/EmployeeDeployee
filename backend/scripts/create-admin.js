// Run this once after the database is set up:
//   npm run create-admin
// It reads ADMIN_LOGIN_ID / ADMIN_PASSWORD / ADMIN_NAME from .env,
// hashes the password properly, and inserts the first Admin account.

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

async function createAdmin() {
  const loginId = process.env.ADMIN_LOGIN_ID || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!password) {
    console.error('ADMIN_PASSWORD is not set in .env');
    process.exit(1);
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE login_id = $1', [loginId]);
    if (existing.rows.length > 0) {
      console.log(`User "${loginId}" already exists. Nothing to do.`);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (login_id, password_hash, full_name, role, must_reset_password)
       VALUES ($1, $2, $3, 'admin', true)`,
      [loginId, passwordHash, name]
    );

    console.log(`Admin account created successfully.`);
    console.log(`Login ID: ${loginId}`);
    console.log(`Temporary password: ${password}`);
    console.log(`(You'll be asked to set a new password on first login.)`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  }
}

createAdmin();
