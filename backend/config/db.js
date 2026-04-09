const mysql = require("mysql2/promise");
const env = require("./env");

const RETRYABLE_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "EPIPE",
  "PROTOCOL_CONNECTION_LOST",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
]);

const pool = mysql.createPool({
  host: env.db.host,
  port: Number(env.db.port),
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  ssl: {
    rejectUnauthorized: false
  },
  timezone: "Z",
  dateStrings: false,
  waitForConnections: true,
  connectionLimit: 20,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 10000,
});

const rawQuery = pool.query.bind(pool);
const rawExecute = pool.execute.bind(pool);
const rawGetConnection = pool.getConnection.bind(pool);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(operationName, fn, attempt = 1) {
  try {
    return await fn();
  } catch (error) {
    const shouldRetry = RETRYABLE_CODES.has(error?.code) && attempt < 3;
    if (!shouldRetry) {
      throw error;
    }

    const waitMs = 300 * attempt;
    console.warn(
      `[DB] ${operationName} failed with ${error.code}. Retrying in ${waitMs}ms (attempt ${attempt + 1}/3)`
    );
    await delay(waitMs);
    return withRetry(operationName, fn, attempt + 1);
  }
}

pool.query = (...args) => withRetry("query", () => rawQuery(...args));
pool.execute = (...args) => withRetry("execute", () => rawExecute(...args));
pool.getConnection = (...args) => withRetry("getConnection", () => rawGetConnection(...args));

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
