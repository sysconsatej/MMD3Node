import sql from "mssql";
import tls from "tls";

tls.DEFAULT_MIN_VERSION = "TLSv1";

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    enableArithAbort: true,
    trustServerCertificate: true,
  },
};

let pool;

export async function initializeConnection() {
  try {
    pool = await sql.connect(config);
    return "Connected to SQL Server";
  } catch (error) {
    throw error;
  }
}

export async function executeQuery(queryString, parameters = {}) {
  if (!pool) {
    throw new Error("Database connection not initialized");
  }

  try {
    const request = pool.request();

    for (const [key, value] of Object.entries(parameters)) {
      request.input(key, value);
    }

    const result = await request.query(queryString);
    return result.recordset;
  } catch (error) {
    throw error;
  }
}

export async function closeConnection() {
  if (pool) {
    await pool.close();
    return "Connection closed";
  }
}
