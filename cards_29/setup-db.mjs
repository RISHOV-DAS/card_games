import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const requiredTables = ['User', 'UserStats', 'Room', 'RoomPlayer', 'GameRound', 'GameCard'];

function parseEnvLine(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

async function loadEnvFileIfPresent(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');

    for (const line of content.split(/\r?\n/g)) {
      const parsed = parseEnvLine(line);
      if (!parsed) {
        continue;
      }

      if (process.env[parsed.key] === undefined) {
        process.env[parsed.key] = parsed.value;
      }
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function main() {
  await loadEnvFileIfPresent(path.join(__dirname, '.env.local'));
  await loadEnvFileIfPresent(path.join(__dirname, '.env'));

  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('Missing SUPABASE_DB_URL or DATABASE_URL environment variable.');
    process.exitCode = 1;
    return;
  }

  const shouldUseSsl =
    !/localhost|127\.0\.0\.1/i.test(connectionString) && process.env.DB_SSL !== 'false';

  const pool = new Pool({
    connectionString,
    ...(shouldUseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  const schemaPath = path.join(__dirname, 'database', 'schema.sql');
  const schemaSql = await readFile(schemaPath, 'utf8');

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(schemaSql);
    await client.query('COMMIT');

    const verifyResult = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1)
       ORDER BY table_name ASC`,
      [requiredTables]
    );

    const found = verifyResult.rows.map((row) => row.table_name);
    const missing = requiredTables.filter((tableName) => !found.includes(tableName));

    console.log('Database schema applied.');
    console.log(`Tables found: ${found.join(', ') || 'none'}`);

    if (missing.length > 0) {
      console.error(`Missing tables: ${missing.join(', ')}`);
      process.exitCode = 1;
      return;
    }

    console.log('All required tables are present.');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Failed to apply database schema:', error.message);
    process.exitCode = 1;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

main();
