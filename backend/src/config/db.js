const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    // host: process.env.DB_HOST,
    // user: process.env.DB_USER,
    // password: process.env.DB_PASSWORD,
    // database: process.env.DB_NAME,
    // waitForConnections: true,
    // connectionLimit: 10,
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 13968,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false,  // required for Aiven
    },
    waitForConnections: true,
    connectionLimit:    10,
});

const promisePool = pool.promise();

// Test connection on startup
promisePool.query('SELECT 1')
    .then(() => console.log('✅ MySQL connected successfully'))
    .catch(err => console.error('❌ MySQL connection failed:', err.message));

module.exports = promisePool;