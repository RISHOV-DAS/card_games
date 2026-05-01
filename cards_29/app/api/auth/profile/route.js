import { prisma } from '@/app/lib/db';
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
    const userId = extractUserIdFromToken(token);

    if (!userId) {
      return Response.json(
        formatError('Invalid token'),
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        stats: true,
        createdAt: true,
      },
    });

    if (!user) {
      return Response.json(
        formatError('User not found'),
        { status: 404 }
      );
    }

    return Response.json(formatSuccess(user));
  } catch (error) {
    console.error('Get profile error:', error);
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

    const userId = extractUserIdFromToken(token);

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

    const user = await prisma.user.update({
      where: { id: userId },
      data: { username },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    return Response.json(
      formatSuccess(user, 'Username updated successfully')
    );
  } catch (error) {
    console.error('Update profile error:', error);
    return Response.json(
      formatError('Internal server error'),
      { status: 500 }
    );
  }
}

// Helper function to extract user ID from token
function extractUserIdFromToken(token) {
  try {
    // This is a simplified approach - in production use proper JWT verification
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
