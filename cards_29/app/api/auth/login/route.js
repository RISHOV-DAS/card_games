import { query, formatDatabaseErrorResponse } from '@/app/lib/db';
import { comparePassword, generateToken } from '@/app/lib/auth';
import { isValidEmail, formatError, formatSuccess } from '@/app/lib/utils';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return Response.json(
        formatError('Email and password are required'),
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        formatError('Invalid email format'),
        { status: 400 }
      );
    }

    // Find user by email
    const userResult = await query(
      `SELECT "id", "email", "username", "password"
       FROM "User"
       WHERE "email" = $1
       LIMIT 1`,
      [email]
    );
    const user = userResult.rows[0];

    if (!user) {
      return Response.json(
        formatError('Invalid email or password'),
        { status: 401 }
      );
    }

    // Compare passwords
    const passwordMatch = await comparePassword(password, user.password);

    if (!passwordMatch) {
      return Response.json(
        formatError('Invalid email or password'),
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    return Response.json(
      formatSuccess({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        token,
      }, 'Logged in successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);

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
