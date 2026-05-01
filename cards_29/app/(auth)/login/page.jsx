'use client';

import { LoginForm } from '@/app/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <LoginForm />
    </div>
  );
}
