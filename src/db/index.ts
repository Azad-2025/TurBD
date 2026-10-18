import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

// Function to create or retrieve the connection pool using the Object Method
export const createPool = () => {
  if (!global._postgresPool) {
    const host = process.env.SQL_HOST;
    const isLocalOrSocket = !host || host.startsWith('/') || host === 'localhost' || host === '127.0.0.1';

    // Explicit SSL configuration:
    // If connecting to remote PostgreSQL (e.g. Neon pooled or direct endpoint), enable TLS with CA certificate validation.
    // If explicitly disabled via SQL_SSL=false or running against local Unix domain socket / localhost, disable SSL.
    const ssl = process.env.SQL_SSL === 'false'
      ? false
      : (process.env.SQL_SSL === 'true' || !isLocalOrSocket
          ? { rejectUnauthorized: true }
          : false);

    global._postgresPool = new Pool({
      host,
      user: process.env.SQL_USER || process.env.SQL_ADMIN_USER,
      password: process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
      ssl,
    });

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance lazily
const pool = createPool();

// Initialize Drizzle with the pool and schema
export const db = drizzle(pool, { schema });
