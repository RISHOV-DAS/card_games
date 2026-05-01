'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/app/store/authStore';
import { useGameStore } from '@/app/store/gameStore';
import { useSocket } from '@/app/hooks/useSocket';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { motion } from 'framer-motion';

export default function GamePage() {
  const router = useRouter();
  const { roomId } = useParams();
  const { user } = useAuthStore();
  const { socket, emit, on, off } = useSocket();
  const { playerHand, setPlayerHand, playCard, currentTurn } = useGameStore();

  const [gameStarted, setGameStarted] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [playedCards, setPlayedCards] = useState({});
  const [round, setRound] = useState(1);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Initialize game
    const handleGameState = (data) => {
      setPlayerHand(data.hands[0]); // Simplified - assign first hand
      setGameStarted(true);
    };

    const handleCardPlayed = (data) => {
      setPlayedCards((prev) => ({
        ...prev,
        [data.userId]: data.card,
      }));
    };

    const handleRoundEnd = (data) => {
      setRound((prev) => prev + 1);
      setPlayedCards({});
      setSelectedCard(null);
    };

    const handleGameEnd = (data) => {
      setTimeout(() => router.push('/game-result'), 2000);
    };

    on('game:state', handleGameState);
    on('game:card-played', handleCardPlayed);
    on('game:round-end', handleRoundEnd);
    on('game:end', handleGameEnd);

    // Join game
    if (socket && socket.connected) {
      emit('room:join', { roomId, userId: user.id, username: user.username });
    }

    return () => {
      off('game:state', handleGameState);
      off('game:card-played', handleCardPlayed);
      off('game:round-end', handleRoundEnd);
      off('game:end', handleGameEnd);
    };
  }, [user, roomId, socket, emit, on, off, router, setPlayerHand]);

  const handlePlayCard = (card) => {
    setSelectedCard(card);
    playCard(card, user.id);
    emit('game:play-card', { roomId, userId: user.id, card, roundId: round });
    setPlayedCards((prev) => ({
      ...prev,
      [user.id]: card,
    }));
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Card>
          <p className="text-lg font-semibold text-[var(--foreground)]">
            Loading game...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--primary)]/30 to-[var(--background)] p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            🎴 Card 29 - Round {round}
          </h1>
          <Button variant="ghost" onClick={() => router.push('/home')}>
            Exit Game
          </Button>
        </div>

        {/* Game Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Play Area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2"
          >
            <Card className="min-h-96 flex items-center justify-center">
              <div className="text-center">
                <p className="text-5xl mb-4">🎴</p>
                <p className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  Game Board
                </p>
                <p className="text-sm text-[var(--foreground)]/60">
                  Played cards will appear here
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Trump Card */}
            <Card>
              <p className="text-sm font-medium text-[var(--foreground)]/60 mb-2">
                Trump Card
              </p>
              <div className="h-24 bg-[var(--primary)] rounded-lg flex items-center justify-center">
                <p className="text-2xl">♠️</p>
              </div>
            </Card>

            {/* Score */}
            <Card>
              <p className="text-sm font-medium text-[var(--foreground)]/60 mb-3">
                Scores
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-[var(--foreground)]">You</p>
                  <p className="font-bold text-[var(--secondary)]">0</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-[var(--foreground)]">Others</p>
                  <p className="font-bold">0</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Player Hand */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <p className="text-sm font-medium text-[var(--foreground)]/60 mb-4">
            Your Hand ({playerHand.length} cards)
          </p>
          <div className="flex gap-2 flex-wrap">
            {playerHand.map((card, index) => (
              <motion.button
                key={card}
                whileHover={{ y: -5 }}
                onClick={() => handlePlayCard(card)}
                className={`
                  w-16 h-24 rounded-lg font-bold text-sm
                  transition-all duration-200
                  ${
                    selectedCard === card
                      ? 'bg-[var(--secondary)] text-[var(--foreground)] scale-110'
                      : 'bg-[var(--card-bg)] text-[var(--foreground)] border-2 border-[var(--accent)]'
                  }
                  hover:border-[var(--secondary)]
                `}
              >
                {card}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
