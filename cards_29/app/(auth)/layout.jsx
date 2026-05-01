'use client';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--primary)]">
      {children}
    </div>
  );
}
