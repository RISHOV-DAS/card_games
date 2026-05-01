import { nanoid } from 'nanoid';
import { Pool } from 'pg';
import { formatError } from '@/app/lib/utils';

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const shouldUseSsl =
  connectionString &&
  !/localhost|127\.0\.0\.1/i.test(connectionString) &&
  process.env.DB_SSL !== 'false';

const globalForDatabase = globalThis;

if (!globalForDatabase.pgPool && connectionString) {
  globalForDatabase.pgPool = new Pool({
    connectionString,
    ...(shouldUseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

export const pool = globalForDatabase.pgPool ?? null;

function createDatabaseConfigError() {
  const error = new Error('Missing Supabase database connection string');
  error.code = 'MISSING_DATABASE_URL';
  return error;
}

export async function query(text, params = [], client = pool) {
  if (!client) {
    throw createDatabaseConfigError();
  }

  return client.query(text, params);
}

export async function withTransaction(callback) {
  if (!pool) {
    throw createDatabaseConfigError();
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function createId(size = 21) {
  return nanoid(size);
}

export async function getRoomByIdOrCode({ id, code }, client = pool) {
  const field = id ? '"id"' : '"code"';
  const value = id ?? code;

  const roomResult = await query(
    `SELECT
      room."id",
      room."hostId",
      room."code",
      room."status",
      room."maxPlayers",
      room."createdAt",
      room."startedAt",
      room."endedAt",
      host."id" AS "hostIdValue",
      host."email" AS "hostEmail",
      host."username" AS "hostUsername",
      host."createdAt" AS "hostCreatedAt",
      host."updatedAt" AS "hostUpdatedAt"
    FROM "Room" room
    JOIN "User" host ON host."id" = room."hostId"
    WHERE room.${field} = $1
    LIMIT 1`,
    [value],
    client
  );

  const room = roomResult.rows[0];

  if (!room) {
    return null;
  }

  const playersResult = await query(
    `SELECT
      player."id",
      player."roomId",
      player."userId",
      player."playerOrder",
      player."isBot",
      player."botDifficulty",
      player."score",
      player."joinedAt",
      playerUser."id" AS "playerUserId",
      playerUser."email" AS "playerUserEmail",
      playerUser."username" AS "playerUserUsername",
      playerUser."createdAt" AS "playerUserCreatedAt",
      playerUser."updatedAt" AS "playerUserUpdatedAt"
    FROM "RoomPlayer" player
    LEFT JOIN "User" playerUser ON playerUser."id" = player."userId"
    WHERE player."roomId" = $1
    ORDER BY player."playerOrder" ASC`,
    [room.id],
    client
  );

  return {
    id: room.id,
    hostId: room.hostId,
    code: room.code,
    status: room.status,
    maxPlayers: room.maxPlayers,
    createdAt: room.createdAt,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
    host: {
      id: room.hostIdValue,
      email: room.hostEmail,
      username: room.hostUsername,
      createdAt: room.hostCreatedAt,
      updatedAt: room.hostUpdatedAt,
    },
    players: playersResult.rows.map((player) => ({
      id: player.id,
      roomId: player.roomId,
      userId: player.userId,
      playerOrder: player.playerOrder,
      isBot: player.isBot,
      botDifficulty: player.botDifficulty,
      score: player.score,
      joinedAt: player.joinedAt,
      user: player.playerUserId
        ? {
            id: player.playerUserId,
            email: player.playerUserEmail,
            username: player.playerUserUsername,
            createdAt: player.playerUserCreatedAt,
            updatedAt: player.playerUserUpdatedAt,
          }
        : null,
    })),
  };
}

export function formatDatabaseErrorResponse(error) {
  if (
    error?.code === 'MISSING_DATABASE_URL' ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ENOTFOUND' ||
    error?.code === '28P01' ||
    error?.code === '3D000' ||
    error?.code === '53300' ||
    error?.code === '57P03'
  ) {
    return Response.json(
      formatError('Database unavailable. Check your Supabase connection settings and try again later.', 503),
      { status: 503 }
    );
  }

  return null;
}

export default pool;
