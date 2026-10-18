import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

if (!sqlHost) {
  throw new Error("SQL_HOST must be set in environment variables.");
}
if (!sqlDbName) {
  throw new Error("SQL_DB_NAME must be set in environment variables.");
}
if (!user) {
  throw new Error("SQL_ADMIN_USER (or SQL_USER) must be set in environment variables.");
}
if (!password) {
  throw new Error("SQL_ADMIN_PASSWORD (or SQL_PASSWORD) must be set in environment variables.");
}

// Neon PostgreSQL requires TLS connection (ssl: 'require').
// If SQL_SSL is explicitly 'false', or when connecting via local Unix sockets / loopback, disable SSL.
const isLocalOrSocket = !sqlHost || sqlHost.startsWith('/') || sqlHost === 'localhost' || sqlHost === '127.0.0.1';
const sslConfig = process.env.SQL_SSL === 'false'
  ? false
  : (process.env.SQL_SSL === 'true' || !isLocalOrSocket
      ? 'require'
      : false);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost,
    user: user,
    password: password,
    database: sqlDbName,
    ssl: sslConfig,
  },
  verbose: true,
});
