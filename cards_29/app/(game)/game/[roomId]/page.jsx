'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { useAuthStore } from '@/app/store/authStore';
import { useSocket } from '@/app/hooks/useSocket';
import { GAME_PHASES, MAX_BID, MIN_BID, SUITS, getSuitName, getSuitSymbol } from '@/app/lib/gameLogic';

function formatCard(card) {
  if (!card) {
    return '';
  }

  return `${card.slice(0, -1)}${getSuitSymbol(card.slice(-1))}`;
}

export default function GamePage() {
  const router = useRouter();
  const { roomId } = useParams();
  const { user } = useAuthStore();
  const { socket, emit, on, off } = useSocket();

  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const syncState = (nextState) => {
      setGameState(nextState);
      setError(null);
    };

    const handleError = ({ message }) => {
      setError(message);
    };

    const joinAndRequestState = () => {
      emit('room:join', { roomId, userId: user.id, username: user.username });
      emit('game:request-state', { roomId, userId: user.id });
    };

    on('connect', joinAndRequestState);
    on('game:started', joinAndRequestState);
    on('game:state', syncState);
    on('game:error', handleError);

    if (socket?.connected) {
      joinAndRequestState();
    } else {
      setTimeout(joinAndRequestState, 300);
    }

    return () => {
      off('connect', joinAndRequestState);
      off('game:started', joinAndRequestState);
      off('game:state', syncState);
      off('game:error', handleError);
    };
  }, [user, roomId, socket, emit, on, off, router]);

  const currentPlayer = useMemo(
    () => gameState?.players?.find((player) => player.id === gameState.currentTurnPlayerId) || null,
    [gameState]
  );
  const highestBid = gameState?.bid?.highestBid ?? null;
  const bidOptions = useMemo(() => {
    const minimum = highestBid === null ? MIN_BID : highestBid + 1;
    return Array.from({ length: Math.max(0, MAX_BID - minimum + 1) }, (_, index) => minimum + index);
  }, [highestBid]);
  const isMyTurn = gameState?.currentTurnPlayerId === user?.id;
  const isBidWinner = gameState?.bidWinnerId === user?.id;

  const handleBid = (amount) => {
    emit('game:bid', { roomId, userId: user.id, amount });
  };

  const handlePass = () => {
    emit('game:bid', { roomId, userId: user.id, pass: true });
  };

  const handleSelectTrump = (suit) => {
    emit('game:select-trump', { roomId, userId: user.id, suit });
  };

  const handlePlayCard = (card) => {
    emit('game:play-card', { roomId, userId: user.id, card });
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <Card>
          <p className="text-lg font-semibold text-[var(--foreground)]">Waiting for game state...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--primary)]/25 to-[var(--background)] p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Twenty-Nine</h1>
            <p className="text-sm text-[var(--foreground)]/70">
              Room {gameState.roomCode} • Trick {gameState.trickNumber}/8 • Phase {gameState.phase.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => router.push('/home')}>
              Leave Game
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border border-red-500/30 bg-red-500/10">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {gameState.players.map((player) => (
                  <div key={player.id} className="rounded-xl border border-[var(--accent)]/30 bg-[var(--background)]/60 p-4">
                    <p className="font-semibold text-[var(--foreground)]">{player.username}</p>
                    <p className="text-sm text-[var(--foreground)]/60">
                      Team {player.team} • Seat {player.playerOrder}
                    </p>
                    <p className="text-sm text-[var(--foreground)]/60">
                      {gameState.handSizes[player.id]} cards remaining
                    </p>
                    {gameState.currentTurnPlayerId === player.id && (
                      <p className="mt-2 text-sm font-semibold text-[var(--secondary)]">Current turn</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="min-h-72">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]/60">Current Trick</p>
                  <p className="text-sm text-[var(--foreground)]/70">
                    {currentPlayer ? `${currentPlayer.username} to act` : 'Waiting for result'}
                  </p>
                </div>
                {gameState.leadSuit && (
                  <p className="text-sm font-medium text-[var(--foreground)]/70">
                    Lead: {getSuitName(gameState.leadSuit)} {getSuitSymbol(gameState.leadSuit)}
                  </p>
                )}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {gameState.players.map((player) => {
                  const play = gameState.currentTrick.find((entry) => entry.playerId === player.id);

                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-[var(--accent)]/30 bg-[var(--background)]/50 p-4 text-center"
                    >
                      <p className="mb-3 text-sm font-medium text-[var(--foreground)]/70">{player.username}</p>
                      <div className="mx-auto flex h-24 w-20 items-center justify-center rounded-xl border-2 border-dashed border-[var(--accent)]/50 bg-[var(--card-bg)] text-xl font-bold text-[var(--foreground)]">
                        {play ? formatCard(play.card) : '...'}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {gameState.lastTrickSummary && (
                <div className="mt-6 rounded-xl bg-[var(--primary)]/15 p-4 text-sm text-[var(--foreground)]/80">
                  Trick winner: {gameState.players.find((player) => player.id === gameState.lastTrickSummary.winnerId)?.username} •
                  {' '}+{gameState.lastTrickSummary.points} points
                </div>
              )}
            </Card>

            {gameState.phase === GAME_PHASES.BIDDING && (
              <Card>
                <p className="text-lg font-semibold text-[var(--foreground)]">Bidding</p>
                <p className="mt-1 text-sm text-[var(--foreground)]/70">
                  Highest bid: {highestBid ?? 'No bid yet'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {bidOptions.map((amount) => (
                    <Button
                      key={amount}
                      variant="secondary"
                      onClick={() => handleBid(amount)}
                      disabled={!isMyTurn}
                    >
                      {amount}
                    </Button>
                  ))}
                  <Button variant="ghost" onClick={handlePass} disabled={!isMyTurn}>
                    Pass
                  </Button>
                </div>
                <div className="mt-4 space-y-2 text-sm text-[var(--foreground)]/70">
                  {gameState.bid.history.map((entry, index) => {
                    const player = gameState.players.find((item) => item.id === entry.playerId);

                    return (
                      <p key={`${entry.playerId}-${index}`}>
                        {player?.username}: {entry.pass ? 'Pass' : entry.amount}
                        {entry.forced ? ' (forced minimum bid)' : ''}
                      </p>
                    );
                  })}
                </div>
              </Card>
            )}

            {gameState.phase === GAME_PHASES.TRUMP_SELECTION && (
              <Card>
                <p className="text-lg font-semibold text-[var(--foreground)]">Choose Trump</p>
                <p className="mt-1 text-sm text-[var(--foreground)]/70">
                  {isBidWinner ? 'Choose your trump suit.' : 'Waiting for the bid winner to choose trump.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {SUITS.map((suit) => (
                    <Button
                      key={suit}
                      variant="secondary"
                      onClick={() => handleSelectTrump(suit)}
                      disabled={!isBidWinner}
                    >
                      {getSuitName(suit)} {getSuitSymbol(suit)}
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            {gameState.phase === GAME_PHASES.COMPLETED && gameState.result && (
              <Card>
                <p className="text-lg font-semibold text-[var(--foreground)]">Round Complete</p>
                <p className="mt-2 text-[var(--foreground)]/80">
                  Bidder team: {gameState.result.bidderTeam} • Bid: {gameState.result.bidAmount}
                </p>
                <p className="text-[var(--foreground)]/80">
                  Bidder points: {gameState.result.bidderPoints} • {gameState.result.bidderSucceeded ? 'Bid made' : 'Bid failed'}
                </p>
                <p className="mt-2 font-semibold text-[var(--secondary)]">
                  Winner: {gameState.result.winningTeam}
                </p>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <p className="text-sm font-medium text-[var(--foreground)]/60">Trump</p>
              <div className="mt-4 rounded-xl bg-[var(--primary)]/20 p-4 text-center">
                <p className="text-3xl font-bold text-[var(--foreground)]">
                  {gameState.trumpSuit ? `${getSuitSymbol(gameState.trumpSuit)}` : '?'}
                </p>
                <p className="mt-2 text-sm text-[var(--foreground)]/70">
                  {gameState.trumpSuit
                    ? `${getSuitName(gameState.trumpSuit)}${gameState.trumpRevealed ? ' revealed' : ' hidden'}`
                    : 'Hidden from you'}
                </p>
              </div>
            </Card>

            <Card>
              <p className="text-sm font-medium text-[var(--foreground)]/60">Scoreboard</p>
              <div className="mt-4 space-y-3 text-sm text-[var(--foreground)]">
                <div className="flex items-center justify-between">
                  <span>Team 1 trick points</span>
                  <span className="font-semibold">{gameState.teamPoints.team1}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Team 2 trick points</span>
                  <span className="font-semibold">{gameState.teamPoints.team2}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--accent)]/30 pt-3">
                  <span>Team 1 game points</span>
                  <span className="font-semibold">{gameState.gamePoints.team1}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Team 2 game points</span>
                  <span className="font-semibold">{gameState.gamePoints.team2}</span>
                </div>
              </div>
            </Card>

            <Card>
              <p className="text-sm font-medium text-[var(--foreground)]/60">Your Hand</p>
              <p className="mt-1 text-sm text-[var(--foreground)]/70">
                {isMyTurn && gameState.phase === GAME_PHASES.PLAY
                  ? gameState.canRevealTrump
                    ? 'You are void in the lead suit. Playing trump will reveal it.'
                    : 'Play a valid card.'
                  : 'Waiting for your turn.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {gameState.playerHand.map((card) => {
                  const isPlayable = !isMyTurn || gameState.phase !== GAME_PHASES.PLAY
                    ? false
                    : gameState.validPlays.includes(card);

                  return (
                    <button
                      key={card}
                      type="button"
                      onClick={() => handlePlayCard(card)}
                      disabled={!isMyTurn || gameState.phase !== GAME_PHASES.PLAY || !isPlayable}
                      className={`h-24 w-16 rounded-xl border-2 text-sm font-bold transition ${
                        isPlayable
                          ? 'border-[var(--secondary)] bg-[var(--card-bg)] text-[var(--foreground)] hover:-translate-y-1'
                          : 'border-[var(--accent)]/40 bg-[var(--card-bg)]/70 text-[var(--foreground)]/40'
                      }`}
                    >
                      {formatCard(card)}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
