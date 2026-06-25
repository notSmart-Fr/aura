import pg from "pg";

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "vendure",
      ssl:
        process.env.DB_HOST && process.env.DB_HOST !== "localhost"
          ? { rejectUnauthorized: false }
          : false,
    });
  }
  return poolInstance;
}
