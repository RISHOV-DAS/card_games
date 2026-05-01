import { prisma } from '@/app/lib/db';
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

    const userId = extractUserIdFromToken(token);

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

    // Find room
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        players: true,
      },
    });

    if (!room) {
      return Response.json(
        formatError('Room not found'),
        { status: 404 }
      );
    }

    if (room.status !== 'waiting') {
      return Response.json(
        formatError('Room is not accepting new players'),
        { status: 400 }
      );
    }

    // Check if player already in room
    const existingPlayer = await prisma.roomPlayer.findFirst({
      where: {
        roomId: room.id,
        userId: userId,
      },
    });

    if (existingPlayer) {
      return Response.json(
        formatError('You are already in this room'),
        { status: 400 }
      );
    }

    // Check if room is full
    if (room.players.length >= room.maxPlayers) {
      return Response.json(
        formatError('Room is full'),
        { status: 400 }
      );
    }

    // Add player to room
    const nextOrder = room.players.length + 1;
    await prisma.roomPlayer.create({
      data: {
        roomId: room.id,
        userId: userId,
        playerOrder: nextOrder,
        isBot: false,
      },
    });

    // Fetch updated room
    const updatedRoom = await prisma.room.findUnique({
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
      formatSuccess(updatedRoom, 'Joined room successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Join room error:', error);
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
