import { prisma } from '@/app/lib/db';
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

    const userId = extractUserIdFromToken(token);

    if (!userId) {
      return Response.json(
        formatError('Invalid token'),
        { status: 401 }
      );
    }

    // Create room
    const code = generateRoomCode();
    const room = await prisma.room.create({
      data: {
        code,
        hostId: userId,
        maxPlayers: 4,
      },
    });

    // Add host as first player
    await prisma.roomPlayer.create({
      data: {
        roomId: room.id,
        userId: userId,
        playerOrder: 1,
        isBot: false,
      },
    });

    // Fetch complete room data
    const completeRoom = await prisma.room.findUnique({
      where: { id: room.id },
      include: {
        host: true,
        players: {
          include: {
            user: true,
          },
        },
      },
    });

    return Response.json(
      formatSuccess(completeRoom, 'Room created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create room error:', error);
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
    const code = request.nextUrl.searchParams.get('code');

    if (!code) {
      return Response.json(
        formatError('Room code is required'),
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        host: true,
        players: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!room) {
      return Response.json(
        formatError('Room not found'),
        { status: 404 }
      );
    }

    return Response.json(formatSuccess(room));
  } catch (error) {
    console.error('Get room error:', error);
    return Response.json(
      formatError('Internal server error'),
      { status: 500 }
    );
  }
}

// Helper function
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
