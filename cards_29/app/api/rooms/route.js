import { createId, getRoomByIdOrCode, query, withTransaction, formatDatabaseErrorResponse } from '@/app/lib/db';
import { getUserIdFromToken } from '@/app/lib/auth';
import { generateRoomCode, formatError, formatSuccess } from '@/app/lib/utils';

/**
 * Create a new room
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

    // Create room
    const code = generateRoomCode();
    let roomId;

    await withTransaction(async (client) => {
      const roomResult = await query(
        `INSERT INTO "Room" ("id", "hostId", "code", "status", "maxPlayers", "createdAt")
         VALUES ($1, $2, $3, 'waiting', $4, NOW())
         RETURNING "id"`,
        [createId(), userId, code, 4],
        client
      );

      roomId = roomResult.rows[0].id;

      await query(
        `INSERT INTO "RoomPlayer" ("id", "roomId", "userId", "playerOrder", "isBot", "score", "joinedAt")
         VALUES ($1, $2, $3, 1, FALSE, 0, NOW())`,
        [createId(), roomId, userId],
        client
      );
    });

    // Fetch complete room data
    const completeRoom = await getRoomByIdOrCode({ id: roomId });

    return Response.json(
      formatSuccess(completeRoom, 'Room created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create room error:', error);

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

/**
 * Get room by code
 */
export async function GET(request) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const code = request.nextUrl.searchParams.get('code');

    if (!id && !code) {
      return Response.json(
        formatError('Room id or room code is required'),
        { status: 400 }
      );
    }

    const room = await getRoomByIdOrCode(id ? { id } : { code });

    if (!room) {
      return Response.json(
        formatError('Room not found'),
        { status: 404 }
      );
    }

    return Response.json(formatSuccess(room));
  } catch (error) {
    console.error('Get room error:', error);

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
