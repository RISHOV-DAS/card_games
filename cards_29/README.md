# 🎴 Card 29 - Multiplayer Online Card Game

A modern, real-time multiplayer Card 29 game built with Next.js, featuring smooth animations, dark mode, and AI bots.

## 🎮 Features

- ✅ **Real-time Multiplayer** - Play with up to 3 friends using WebSockets
- ✅ **Account System** - Email/password registration and login
- ✅ **Room Management** - Create rooms with shareable codes
- ✅ **AI Bots** - Add bots with 3 difficulty levels (Easy, Medium, Hard)
- ✅ **Card 29 Rules** - Full implementation of standard rules
- ✅ **User Profiles** - Edit username and track statistics
- ✅ **Modern UI** - Beautiful soft color scheme with retro royal vibes
- ✅ **Dark Mode** - Fully functional dark/light mode
- ✅ **Smooth Animations** - Framer Motion animations throughout
- ✅ **Real-time Card Animations** - See cards being played in real-time

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (NeonDB recommended)

### 1. Setup Environment

```bash
# Copy and configure environment variables
cp .env.local.example .env.local

# Edit .env.local and add:
# - DATABASE_URL: Your NeonDB connection string
# - NEXTAUTH_SECRET: Random secret (generate with: openssl rand -base64 32)
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 5. Build for Production

```bash
npm run build
npm start
```

## 📋 How to Play

### Starting a Game

1. **Sign Up/Login** - Create an account or login
2. **Create Room** - Click "Create Room" on the home page
3. **Invite Players** - Share the 6-character room code with friends
4. **Add Bots** (Optional) - Click "Add Bot" to fill empty slots
5. **Start Game** - Once ready, the host can start the game

### Game Rules (Card 29)

- 4 players maximum
- 32 cards dealt (8 per player)
- Points: A=1, 2-9=face value, 10/J/Q/K=0 (except trump)
- Trump suit special: 9=14, 10=10, J/Q/K=3, A=1
- First player to reach 52+ points wins
- Follow suit rule applies

## 🏗️ Project Structure

```
cards_29/
├── app/
│   ├── (auth)/              # Authentication pages
│   ├── (game)/              # Game pages
│   ├── api/                 # API routes
│   ├── components/          # React components
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities and logic
│   ├── store/               # Zustand stores
│   └── layout.jsx           # Root layout
├── prisma/
│   └── schema.prisma        # Database schema
├── server.js                # Custom Socket.io server
├── .env.local               # Environment variables
└── package.json
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **State**: Zustand
- **Animations**: Framer Motion
- **Auth**: JWT + bcryptjs

## 🎨 Color Scheme

### Light Mode (Retro Royal)
- Primary: `#F4E4C1` (Soft Cream)
- Secondary: `#D4AF37` (Royal Gold)
- Accent: `#E8D8B8` (Light Beige)

### Dark Mode
- Primary: `#2A2A3E` (Deep Navy)
- Secondary: `#D4AF37` (Gold)
- Accent: `#3E3E52` (Lighter Navy)

## 🤖 Bot Difficulty Levels

### Easy
- Random valid card selection
- No strategy

### Medium
- Simple strategy
- Tries to win with low cards
- Discards high cards when losing

### Hard
- Advanced strategy
- Tracks played cards
- Optimizes for point value
- Defensive plays

## 📊 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register user
- `POST /api/auth/login` - Login user
- `GET/PUT /api/auth/profile` - Get/update profile

### Rooms
- `POST /api/rooms` - Create room
- `GET /api/rooms?code=CODE` - Get room by code
- `POST /api/rooms/join` - Join room

## 🔌 Socket Events

### Emit (Client → Server)
- `room:join` - Join a room
- `game:player-ready` - Mark player ready
- `game:play-card` - Play a card
- `game:add-bot` - Add AI player
- `game:start` - Start the game

### Listen (Server → Client)
- `room:player-joined` - Player joined
- `room:player-left` - Player disconnected
- `game:card-played` - Card was played
- `game:bot-added` - Bot added
- `game:started` - Game started

## 🚀 Deployment (Vercel)

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project" and import your GitHub repo
3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your Vercel domain)
   - `NEXT_PUBLIC_SOCKET_URL` (your Vercel domain)
4. Click "Deploy"

### 3. Database Migration

Run migrations on deployed database:

```bash
npx prisma migrate deploy
```

## 📝 Database Schema

See `prisma/schema.prisma` for the complete schema including:
- User accounts with stats
- Rooms with players
- Game rounds and card history
- User statistics tracking

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9  # Mac/Linux
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process  # Windows
```

### Database connection error
- Check `DATABASE_URL` in `.env.local`
- Ensure NeonDB is running and accessible
- Run `npx prisma db push` to create tables

### Socket.io connection issues
- Check `NEXT_PUBLIC_SOCKET_URL` matches your domain
- Ensure WebSocket is enabled on your server
- Check browser console for connection errors

## 📞 Support

For issues or questions, please open an issue on GitHub.

## 📄 License

MIT License - feel free to use this project!

---

**Happy Playing! 🎴**
