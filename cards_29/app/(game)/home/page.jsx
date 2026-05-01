'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/store/authStore';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { motion } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  const { user, token, isLoading, logout, updateProfile, restoreSession } = useAuthStore();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          restoreSession(storedToken);
        } else {
          router.push('/login');
        }
      }
    }
  }, [token, router, restoreSession]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--foreground)]">Loading...</p>
      </div>
    );
  }

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      setError('Username cannot be empty');
      return;
    }

    const result = await updateProfile(newUsername);
    if (result.success) {
      setIsEditingUsername(false);
      setError(null);
    } else {
      setError(result.error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--primary)] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <h1 className="text-4xl font-bold text-[var(--foreground)]">
            🎴 Card 29
          </h1>
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-6 mb-8"
        >
          <Card className="md:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-[var(--foreground)]/60 mb-1">
                  Welcome back,
                </p>
                <p className="text-3xl font-bold text-[var(--foreground)]">
                  {user.username}
                </p>
                <p className="text-sm text-[var(--foreground)]/60 mt-2">
                  {user.email}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setIsEditingUsername(true)}
              >
                Edit Username
              </Button>
            </div>
          </Card>

          {/* Stats Card */}
          <Card>
            <div className="text-center">
              <p className="text-sm text-[var(--foreground)]/60 mb-2">
                Statistics
              </p>
              <p className="text-3xl font-bold text-[var(--secondary)] mb-2">
                0-0
              </p>
              <p className="text-sm text-[var(--foreground)]/60">
                Wins - Losses
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6"
        >
          <Card hover className="cursor-pointer hover:bg-[var(--accent)]" onClick={() => router.push('/create-room')}>
            <div className="text-center">
              <p className="text-4xl mb-2">➕</p>
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
                Create Room
              </h2>
              <p className="text-sm text-[var(--foreground)]/60">
                Start a new game
              </p>
            </div>
          </Card>

          <Card hover className="cursor-pointer hover:bg-[var(--accent)]" onClick={() => router.push('/join-room')}>
            <div className="text-center">
              <p className="text-4xl mb-2">🚪</p>
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
                Join Room
              </h2>
              <p className="text-sm text-[var(--foreground)]/60">
                Enter a room code
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Edit Username Modal */}
      <Modal
        isOpen={isEditingUsername}
        onClose={() => setIsEditingUsername(false)}
        title="Edit Username"
      >
        <div className="space-y-4">
          <Input
            label="New Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            error={error}
            disabled={isLoading}
          />

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsEditingUsername(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateUsername}
              loading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              Update
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
