const mysql = require("mysql2/promise");
const env = require("./env");

const pool = mysql.createPool({
  host: env.db.host,
  port: Number(env.db.port),
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,

  ssl: {
    rejectUnauthorized: false
  },

  timezone: 'Z',
  dateStrings: false,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("Connected to MySQL via TCP Proxy");
    conn.release();
  } catch (err) {
    console.error("MySQL connection failed");
    console.error(err.code, err.message);
    process.exit(1);
  }
})();


module.exports = pool;