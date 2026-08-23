const { Pool } = require('pg');
require('dotenv').config();

// Supports either a full connection string (DATABASE_URL, e.g. for Neon/Render)
// or separate host/port/user/password variables (e.g. for local development).
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(1);
});

module.exports = pool;
