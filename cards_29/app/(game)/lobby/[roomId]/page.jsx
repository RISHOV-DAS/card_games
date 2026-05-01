'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/app/store/authStore';
import { useGameStore } from '@/app/store/gameStore';
import { useSocket } from '@/app/hooks/useSocket';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Modal } from '@/app/components/ui/Modal';
import { motion } from 'framer-motion';

function normalizePlayer(player, index = 0) {
  return {
    id: player.user?.id || player.userId || player.id,
    username: player.user?.username || player.username || `Player ${index + 1}`,
    isBot: Boolean(player.isBot),
    botDifficulty: player.botDifficulty || 'medium',
    playerOrder: player.playerOrder || index + 1,
  };
}

function mergePlayers(players) {
  const seen = new Map();

  players.forEach((player, index) => {
    const normalized = normalizePlayer(player, index);

    if (!normalized.id) {
      return;
    }

    seen.set(normalized.id, normalized);
  });

  return [...seen.values()].sort((left, right) => left.playerOrder - right.playerOrder);
}

export default function LobbyPage() {
  const router = useRouter();
  const { roomId } = useParams();
  const { user, token } = useAuthStore();
  const { socket, emit, on, off } = useSocket();
  const { players, setPlayers, hostId } = useGameStore();
  
  const [localPlayers, setLocalPlayers] = useState(players);
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState('medium');
  const [showAddBot, setShowAddBot] = useState(false);
  const [loading, setLoading] = useState(false);

  const isHost = user?.id === hostId;

  useEffect(() => {
    if (!user || !token) {
      router.push('/login');
      return;
    }

    // Fetch room data
    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms?id=${roomId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (response.ok) {
          setRoomCode(data.data.code);
          const nextPlayers = mergePlayers(data.data.players);
          setLocalPlayers(nextPlayers);
          setPlayers(nextPlayers);
        }
      } catch (error) {
        console.error('Failed to fetch room:', error);
      }
    };

    fetchRoom();

    // Socket events
    const handlePlayerJoined = (playerData) => {
      setLocalPlayers((prev) => mergePlayers([...prev, playerData]));
    };

    const handlePlayerLeft = ({ playerId }) => {
      setLocalPlayers((prev) => prev.filter((p) => p.id !== playerId));
    };

    const handleBotAdded = (playerData) => {
      setLocalPlayers((prev) => mergePlayers([...prev, playerData]));
    };

    const handleGameStarted = () => {
      router.push(`/game/${roomId}`);
    };

    on('room:player-joined', handlePlayerJoined);
    on('room:player-left', handlePlayerLeft);
    on('game:bot-added', handleBotAdded);
    on('game:started', handleGameStarted);

    // Join room via socket
    if (socket && socket.connected) {
      emit('room:join', { roomId, userId: user.id, username: user.username });
    }

    return () => {
      off('room:player-joined', handlePlayerJoined);
      off('room:player-left', handlePlayerLeft);
      off('game:bot-added', handleBotAdded);
      off('game:started', handleGameStarted);
    };
  }, [user, token, roomId, socket, emit, on, off, router, setPlayers]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddBot = () => {
    setLoading(true);
    emit('game:add-bot', { roomId, difficulty: botDifficulty });
    setShowAddBot(false);
    setLoading(false);
  };

  const handleStartGame = () => {
    setLoading(true);
    emit('game:start', { roomId, roomCode, players: localPlayers });
    // Router will be handled by the game:started event
  };

  const canAddBot = localPlayers.length < 4;
  const allPlayersReady = localPlayers.length === 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--primary)] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-2">
            🎴 Waiting Room
          </h1>
          <p className="text-[var(--foreground)]/60">
            Share the room code with friends
          </p>
        </motion.div>

        {/* Room Code Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <Card className="text-center">
            <p className="text-sm text-[var(--foreground)]/60 mb-3">
              Room Code
            </p>
            <p className="text-5xl font-mono font-bold text-[var(--secondary)] mb-4 tracking-widest">
              {roomCode}
            </p>
            <Button
              variant={copied ? 'primary' : 'secondary'}
              onClick={handleCopyCode}
              className="w-full"
            >
              {copied ? '✓ Copied!' : 'Copy Code'}
            </Button>
          </Card>
        </motion.div>

        {/* Players */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
            Players ({localPlayers.length}/4)
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {localPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--secondary)] flex items-center justify-center text-[var(--foreground)] font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-[var(--foreground)]">
                        {player.username || `Bot - ${player.botDifficulty}`}
                        </p>
                      <p className="text-sm text-[var(--foreground)]/60">
                        {player.isBot ? `AI (${player.botDifficulty})` : 'Online'}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}

            {/* Empty slots */}
            {localPlayers.length < 4 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className="border-2 border-dashed border-[var(--accent)]">
                  <div className="flex items-center justify-center h-full min-h-24">
                    <p className="text-[var(--foreground)]/40 text-center">
                      Waiting for player {localPlayers.length + 1}...
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          {isHost && canAddBot && (
            <Button
              variant="secondary"
              onClick={() => setShowAddBot(true)}
              disabled={loading}
              className="flex-1"
            >
              + Add Bot
            </Button>
          )}

          {isHost && allPlayersReady && (
            <Button
              variant="primary"
              onClick={handleStartGame}
              loading={loading}
              disabled={loading}
              className="flex-1"
            >
              Start Game
            </Button>
          )}

          {!isHost && (
            <Button
              variant="secondary"
              disabled
              className="flex-1"
            >
              Waiting for host...
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => router.push('/home')}
            className="px-6"
          >
            Leave
          </Button>
        </div>
      </div>

      {/* Add Bot Modal */}
      <Modal
        isOpen={showAddBot}
        onClose={() => setShowAddBot(false)}
        title="Add AI Player"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)] mb-3">
              Difficulty Level
            </p>
            <div className="space-y-2">
              {['easy', 'medium', 'hard'].map((level) => (
                <label key={level} className="flex items-center gap-3 p-3 border border-[var(--accent)] rounded-lg cursor-pointer hover:bg-[var(--accent)] transition-colors">
                  <input
                    type="radio"
                    name="difficulty"
                    value={level}
                    checked={botDifficulty === level}
                    onChange={(e) => setBotDifficulty(e.target.value)}
                  />
                  <span className="capitalize font-medium text-[var(--foreground)]">
                    {level}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowAddBot(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddBot}
              loading={loading}
              disabled={loading}
              className="flex-1"
            >
              Add Bot
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
