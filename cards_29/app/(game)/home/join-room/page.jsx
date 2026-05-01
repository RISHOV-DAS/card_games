'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/store/authStore';
import { useGameStore } from '@/app/store/gameStore';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { motion } from 'framer-motion';

export default function JoinRoomPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { setRoom } = useGameStore();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomCode: roomCode.toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
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
            <p className="text-5xl mb-4">🚪</p>
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
              Join Room
            </h1>
            <p className="text-[var(--foreground)]/60">
              Enter the room code to join a game
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

          <form onSubmit={handleJoinRoom} className="space-y-4">
            <Input
              label="Room Code"
              type="text"
              placeholder="Enter 6-character code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength="6"
              disabled={loading}
              className="text-center text-2xl tracking-widest font-mono"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              Join Room
            </Button>
          </form>

          <Button
            variant="ghost"
            size="lg"
            className="w-full mt-4"
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
