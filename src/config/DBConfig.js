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
    encrypt: true,
    enableArithAbort: true,
    trustServerCertificate: true,
  },
  connectionTimeout: 15000, // ms
  requestTimeout: 30000,
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

export async function executeQuerySpData(queryString, parameters = {}) {
  if (!pool) throw new Error("Database connection not initialized");

  try {
    const request = pool.request();

    for (const [key, value] of Object.entries(parameters)) {
      const k = String(key).toLowerCase();

      if (k === "jsondata") {
        request.input(key, sql.NVarChar(sql.MAX), value);
        continue;
      }

      if (value === null || value === undefined) {
        request.input(key, sql.NVarChar(sql.MAX), null);
      } else if (typeof value === "string") {
        request.input(key, sql.NVarChar(sql.MAX), value);
      } else if (typeof value === "number") {
        if (Number.isInteger(value)) {
          request.input(key, sql.Int, value);
        } else {
          request.input(key, sql.Float, value);
        }
      } else if (typeof value === "boolean") {
        request.input(key, sql.Bit, value);
      } else if (value instanceof Date) {
        request.input(key, sql.DateTime2, value);
      } else {
        request.input(key, sql.NVarChar(sql.MAX), JSON.stringify(value));
      }
    }

    const result = await request.query(queryString);
    return result;
  } catch (error) {
    console.error("Query execution error:", error);
    throw error;
  }
}

export async function closeConnection() {
  if (pool) {
    await pool.close();
    return "Connection closed";
  }
}
