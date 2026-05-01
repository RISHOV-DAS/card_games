import { query, formatDatabaseErrorResponse } from '@/app/lib/db';
import { getUserIdFromToken } from '@/app/lib/auth';
import { formatError, formatSuccess } from '@/app/lib/utils';

/**
 * Get user stats
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

    const userId = getUserIdFromToken(token);

    if (!userId) {
      return Response.json(
        formatError('Invalid token'),
        { status: 401 }
      );
    }

    const statsResult = await query(
      'SELECT * FROM "UserStats" WHERE "userId" = $1 LIMIT 1',
      [userId]
    );
    const stats = statsResult.rows[0];

    if (!stats) {
      return Response.json(
        formatError('Stats not found'),
        { status: 404 }
      );
    }

    return Response.json(formatSuccess(stats));
  } catch (error) {
    console.error('Get stats error:', error);

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
 * Update user stats
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
    const { gamesPlayed, gamesWon, totalScore, cardsPlayed } = body;

    if (
      gamesPlayed === undefined &&
      gamesWon === undefined &&
      totalScore === undefined &&
      cardsPlayed === undefined
    ) {
      return Response.json(
        formatError('At least one stats field is required'),
        { status: 400 }
      );
    }

    const existingStatsResult = await query(
      'SELECT * FROM "UserStats" WHERE "userId" = $1 LIMIT 1',
      [userId]
    );
    const existingStats = existingStatsResult.rows[0];

    if (!existingStats) {
      return Response.json(
        formatError('Stats not found'),
        { status: 404 }
      );
    }

    const nextGamesPlayed = gamesPlayed !== undefined ? Number(gamesPlayed) : existingStats.gamesPlayed;
    const nextGamesWon = gamesWon !== undefined ? Number(gamesWon) : existingStats.gamesWon;
    const nextTotalScore = totalScore !== undefined ? Number(totalScore) : existingStats.totalScore;
    const nextCardsPlayed = cardsPlayed !== undefined ? Number(cardsPlayed) : existingStats.cardsPlayed;
    const nextWinRate = nextGamesPlayed > 0 ? (nextGamesWon / nextGamesPlayed) * 100 : 0;

    const statsResult = await query(
      `UPDATE "UserStats"
       SET "gamesPlayed" = $1,
           "gamesWon" = $2,
           "totalScore" = $3,
           "cardsPlayed" = $4,
           "winRate" = $5
       WHERE "userId" = $6
       RETURNING *`,
      [nextGamesPlayed, nextGamesWon, nextTotalScore, nextCardsPlayed, nextWinRate, userId]
    );
    const stats = statsResult.rows[0];

    return Response.json(
      formatSuccess(stats, 'Stats updated successfully')
    );
  } catch (error) {
    console.error('Update stats error:', error);

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
