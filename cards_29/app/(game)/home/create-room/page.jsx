'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/store/authStore';
import { useGameStore } from '@/app/store/gameStore';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { motion } from 'framer-motion';

export default function CreateRoomPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { setRoom } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      setRoom(data.data);
      router.push(`/lobby/${data.data.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--background)] to-[var(--primary)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <div className="text-center mb-8">
            <p className="text-5xl mb-4">➕</p>
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
              Create Room
            </h1>
            <p className="text-[var(--foreground)]/60">
              Host a new game and invite friends
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6"
            >
              {error}
            </motion.div>
          )}

          <div className="bg-[var(--primary)]/30 p-6 rounded-lg mb-6 text-center">
            <p className="text-sm text-[var(--foreground)]/60 mb-2">
              Game will be:
            </p>
            <ul className="text-left space-y-1 text-sm text-[var(--foreground)]">
              <li>✓ 4 Players Maximum</li>
              <li>✓ Can invite via Room Code</li>
              <li>✓ Add bots if needed</li>
              <li>✓ Real-time gameplay</li>
            </ul>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full mb-4"
            onClick={handleCreateRoom}
            loading={loading}
            disabled={loading}
          >
            Create Room Now
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            onClick={() => router.push('/home')}
            disabled={loading}
          >
            Back
          </Button>
        </Card>
      </motion.div>
    </div>
  );
}
