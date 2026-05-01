import { prisma } from '@/app/lib/db';
import { hashPassword, generateToken } from '@/app/lib/auth';
import { isValidEmail, isValidUsername, validatePassword, formatError, formatSuccess } from '@/app/lib/utils';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, confirmPassword, username } = body;

    // Validation
    if (!email || !password || !confirmPassword || !username) {
      return Response.json(
        formatError('All fields are required'),
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        formatError('Invalid email format'),
        { status: 400 }
      );
    }

    if (!isValidUsername(username)) {
      return Response.json(
        formatError('Username must be 1-20 characters, alphanumeric with dashes or underscores'),
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return Response.json(
        formatError('Passwords do not match'),
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return Response.json(
        formatError(passwordValidation.errors.join(', ')),
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return Response.json(
        formatError('Email already registered'),
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
    });

    // Create user stats
    await prisma.userStats.create({
      data: {
        userId: user.id,
      },
    });

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
      }, 'Account created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return Response.json(
      formatError('Internal server error'),
      { status: 500 }
    );
  }
}
