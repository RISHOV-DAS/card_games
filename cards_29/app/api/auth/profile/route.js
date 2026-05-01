import { query, formatDatabaseErrorResponse } from '@/app/lib/db';
import { getUserIdFromToken } from '@/app/lib/auth';
import { isValidUsername, formatError, formatSuccess } from '@/app/lib/utils';

/**
 * Get current user profile
 */
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];

    if (!token) {
      return Response.json(
        formatError('No token provided'),
        { status: 401 }
      );
    }

    // For now, we'll parse the token manually
    // In production, use a proper JWT verification
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return Response.json(
        formatError('Invalid token'),
        { status: 401 }
      );
    }

    const userResult = await query(
      `SELECT
        userRecord."id",
        userRecord."email",
        userRecord."username",
        userRecord."createdAt",
        stats."id" AS "statsId",
        stats."userId" AS "statsUserId",
        stats."gamesPlayed",
        stats."gamesWon",
        stats."totalScore",
        stats."cardsPlayed",
        stats."winRate"
      FROM "User" userRecord
      LEFT JOIN "UserStats" stats ON stats."userId" = userRecord."id"
      WHERE userRecord."id" = $1
      LIMIT 1`,
      [userId]
    );
    const row = userResult.rows[0];
    const user = row
      ? {
          id: row.id,
          email: row.email,
          username: row.username,
          createdAt: row.createdAt,
          stats: row.statsId
            ? {
                id: row.statsId,
                userId: row.statsUserId,
                gamesPlayed: row.gamesPlayed,
                gamesWon: row.gamesWon,
                totalScore: row.totalScore,
                cardsPlayed: row.cardsPlayed,
                winRate: row.winRate,
              }
            : null,
        }
      : null;

    if (!user) {
      return Response.json(
        formatError('User not found'),
        { status: 404 }
      );
    }

    return Response.json(formatSuccess(user));
  } catch (error) {
    console.error('Get profile error:', error);

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
 * Update user profile (username)
 */
export async function PUT(request) {
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

    const body = await request.json();
    const { username } = body;

    if (!username || !isValidUsername(username)) {
      return Response.json(
        formatError('Invalid username'),
        { status: 400 }
      );
    }

    const userResult = await query(
      `UPDATE "User"
       SET "username" = $1, "updatedAt" = NOW()
       WHERE "id" = $2
       RETURNING "id", "email", "username"`,
      [username, userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      return Response.json(
        formatError('User not found'),
        { status: 404 }
      );
    }

    return Response.json(
      formatSuccess(user, 'Username updated successfully')
    );
  } catch (error) {
    console.error('Update profile error:', error);

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
