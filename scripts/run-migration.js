#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATION_PATH = path.resolve(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20251014120000_minimal_adjustments.sql"
);

function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function ensureEnv() {
  if (!process.env.POSTGRES_URL_NON_POOLING && !process.env.POSTGRES_URL) {
    const envCandidates = [
      path.resolve(__dirname, "..", ".env.local"),
      path.resolve(__dirname, "..", ".env.development.local"),
    ];
    for (const candidate of envCandidates) {
      parseEnvFile(candidate);
    }
  }

  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error(
      "POSTGRES_URL_NON_POOLING or POSTGRES_URL must be set before running the migration."
    );
  }

  return connectionString;
}

async function run() {
  const connectionString = ensureEnv();

  if (!fs.existsSync(MIGRATION_PATH)) {
    throw new Error(`Migration file not found at ${MIGRATION_PATH}`);
  }

  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log("Connecting to database...");
  await client.connect();
  console.log("Running migration: 20251014120000_minimal_adjustments.sql");

  try {
    await client.query(sql);
    console.log("Migration executed successfully.");
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

run().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
