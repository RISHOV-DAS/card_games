'use client';

import { SignupForm } from '@/app/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <SignupForm />
    </div>
  );
}
