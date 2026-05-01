CREATE TABLE IF NOT EXISTS "User" (
  "id" text PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "username" text NOT NULL DEFAULT 'Player',
  "password" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "UserStats" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL UNIQUE,
  "gamesPlayed" integer NOT NULL DEFAULT 0,
  "gamesWon" integer NOT NULL DEFAULT 0,
  "totalScore" integer NOT NULL DEFAULT 0,
  "cardsPlayed" integer NOT NULL DEFAULT 0,
  "winRate" double precision NOT NULL DEFAULT 0,
  CONSTRAINT "UserStats_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Room" (
  "id" text PRIMARY KEY,
  "hostId" text NOT NULL,
  "code" varchar(6) NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'waiting',
  "maxPlayers" integer NOT NULL DEFAULT 4,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "startedAt" timestamptz,
  "endedAt" timestamptz,
  CONSTRAINT "Room_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "RoomPlayer" (
  "id" text PRIMARY KEY,
  "roomId" text NOT NULL,
  "userId" text,
  "playerOrder" integer NOT NULL,
  "isBot" boolean NOT NULL DEFAULT FALSE,
  "botDifficulty" text,
  "score" integer NOT NULL DEFAULT 0,
  "joinedAt" timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT "RoomPlayer_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE,
  CONSTRAINT "RoomPlayer_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL,
  CONSTRAINT "RoomPlayer_roomId_playerOrder_key" UNIQUE ("roomId", "playerOrder")
);

CREATE TABLE IF NOT EXISTS "GameRound" (
  "id" text PRIMARY KEY,
  "roomId" text NOT NULL,
  "roundNumber" integer NOT NULL,
  "phase" text NOT NULL DEFAULT 'bidding',
  "bidAmount" integer,
  "bidWinnerOrder" integer,
  "bidWinnerTeam" integer,
  "trumpCard" text,
  "trumpSuit" text,
  "trumpRevealed" boolean NOT NULL DEFAULT FALSE,
  "dealerOrder" integer NOT NULL DEFAULT 1,
  "currentTurnOrder" integer,
  "trickNumber" integer NOT NULL DEFAULT 1,
  "team1Points" integer NOT NULL DEFAULT 0,
  "team2Points" integer NOT NULL DEFAULT 0,
  "winnerTeam" integer,
  "bidHistory" jsonb,
  "currentTrick" jsonb,
  "status" text NOT NULL DEFAULT 'in_progress',
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "completedAt" timestamptz,
  CONSTRAINT "GameRound_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "GameCard" (
  "id" text PRIMARY KEY,
  "roundId" text NOT NULL,
  "playerId" text NOT NULL,
  "trickNumber" integer NOT NULL DEFAULT 1,
  "playOrder" integer NOT NULL DEFAULT 1,
  "card" text NOT NULL,
  "isTrumpReveal" boolean NOT NULL DEFAULT FALSE,
  "timestamp" timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT "GameCard_roundId_fkey"
    FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE,
  CONSTRAINT "GameCard_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "RoomPlayer"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Room_hostId_idx" ON "Room" ("hostId");
CREATE INDEX IF NOT EXISTS "RoomPlayer_userId_idx" ON "RoomPlayer" ("userId");
CREATE INDEX IF NOT EXISTS "GameRound_roomId_idx" ON "GameRound" ("roomId");
CREATE INDEX IF NOT EXISTS "GameCard_roundId_idx" ON "GameCard" ("roundId");
CREATE INDEX IF NOT EXISTS "GameCard_playerId_idx" ON "GameCard" ("playerId");
