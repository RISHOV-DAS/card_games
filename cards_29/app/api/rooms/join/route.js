import { createId, getRoomByIdOrCode, query, withTransaction, formatDatabaseErrorResponse } from '@/app/lib/db';
import { getUserIdFromToken } from '@/app/lib/auth';
import { formatError, formatSuccess } from '@/app/lib/utils';

/**
 * Join a room
 */
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];

    if (!token) {
      return Response.json(
        formatError('No token provided'),
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(token);

    if (!userId) {
      return Response.json(
        formatError('Invalid token'),
        { status: 401 }
      );
    }

    const { roomCode } = await request.json();

    if (!roomCode) {
      return Response.json(
        formatError('Room code is required'),
        { status: 400 }
      );
    }

    let roomId;
    const normalizedRoomCode = roomCode.toUpperCase();

    const joinResult = await withTransaction(async (client) => {
      const roomResult = await query(
        `SELECT "id", "status", "maxPlayers"
         FROM "Room"
         WHERE "code" = $1
         LIMIT 1
         FOR UPDATE`,
        [normalizedRoomCode],
        client
      );
      const room = roomResult.rows[0];

      if (!room) {
        return { error: 'Room not found', status: 404 };
      }

      if (room.status !== 'waiting') {
        return { error: 'Room is not accepting new players', status: 400 };
      }

      const existingPlayerResult = await query(
        `SELECT "id"
         FROM "RoomPlayer"
         WHERE "roomId" = $1 AND "userId" = $2
         LIMIT 1`,
        [room.id, userId],
        client
      );

      if (existingPlayerResult.rows[0]) {
        return { error: 'You are already in this room', status: 400 };
      }

      const playerCountResult = await query(
        `SELECT COUNT(*)::int AS "playerCount"
         FROM "RoomPlayer"
         WHERE "roomId" = $1`,
        [room.id],
        client
      );
      const playerCount = playerCountResult.rows[0]?.playerCount ?? 0;

      if (playerCount >= room.maxPlayers) {
        return { error: 'Room is full', status: 400 };
      }

      await query(
        `INSERT INTO "RoomPlayer" ("id", "roomId", "userId", "playerOrder", "isBot", "score", "joinedAt")
         VALUES ($1, $2, $3, $4, FALSE, 0, NOW())`,
        [createId(), room.id, userId, playerCount + 1],
        client
      );

      roomId = room.id;
      return { status: 200 };
    });

    if (joinResult.error) {
      return Response.json(
        formatError(joinResult.error),
        { status: joinResult.status }
      );
    }

    const updatedRoom = await getRoomByIdOrCode({ id: roomId });

    return Response.json(
      formatSuccess(updatedRoom, 'Joined room successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Join room error:', error);

    const databaseErrorResponse = formatDatabaseErrorResponse(error);
    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    return Response.json(
      formatError('Internal server error'),
      { status: 500 }
    );
  }
}
