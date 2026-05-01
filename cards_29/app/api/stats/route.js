import { prisma } from '@/app/lib/db';
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

    const userId = extractUserIdFromToken(token);

    if (!userId) {
      return Response.json(
        formatError('Invalid token'),
        { status: 401 }
      );
    }

    const stats = await prisma.userStats.findUnique({
      where: { userId },
    });

    if (!stats) {
      return Response.json(
        formatError('Stats not found'),
        { status: 404 }
      );
    }

    return Response.json(formatSuccess(stats));
  } catch (error) {
    console.error('Get stats error:', error);
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

    const userId = extractUserIdFromToken(token);

    if (!userId) {
      return Response.json(
        formatError('Invalid token'),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { gamesPlayed, gamesWon, totalScore, cardsPlayed } = body;

    const stats = await prisma.userStats.update({
      where: { userId },
      data: {
        gamesPlayed: gamesPlayed !== undefined ? gamesPlayed : undefined,
        gamesWon: gamesWon !== undefined ? gamesWon : undefined,
        totalScore: totalScore !== undefined ? totalScore : undefined,
        cardsPlayed: cardsPlayed !== undefined ? cardsPlayed : undefined,
        winRate: gamesPlayed && gamesWon ? (gamesWon / gamesPlayed) * 100 : undefined,
      },
    });

    return Response.json(
      formatSuccess(stats, 'Stats updated successfully')
    );
  } catch (error) {
    console.error('Update stats error:', error);
    return Response.json(
      formatError('Internal server error'),
      { status: 500 }
    );
  }
}

function extractUserIdFromToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload.userId;
  } catch {
    return null;
  }
}
