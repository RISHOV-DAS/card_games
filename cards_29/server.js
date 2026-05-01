const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Game state
let rooms = new Map();
let playerSockets = new Map();

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Socket.io event handlers
  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Join room
    socket.on('room:join', (data) => {
      const { roomId, userId, username } = data;
      
      socket.join(roomId);
      playerSockets.set(userId, socket.id);

      // Notify others in room
      io.to(roomId).emit('room:player-joined', {
        userId,
        username,
        socketId: socket.id,
      });
    });

    // Player ready
    socket.on('game:player-ready', (data) => {
      const { roomId, userId } = data;
      io.to(roomId).emit('game:player-status-changed', {
        userId,
        status: 'ready',
      });
    });

    // Play card
    socket.on('game:play-card', (data) => {
      const { roomId, userId, card, roundId } = data;
      io.to(roomId).emit('game:card-played', {
        userId,
        card,
        roundId,
      });
    });

    // Add bot
    socket.on('game:add-bot', (data) => {
      const { roomId, difficulty } = data;
      io.to(roomId).emit('game:bot-added', {
        difficulty,
        botId: `bot-${Date.now()}`,
      });
    });

    // Start game
    socket.on('game:start', (data) => {
      const { roomId } = data;
      io.to(roomId).emit('game:started', data);
    });

    // Game state update
    socket.on('game:state-update', (data) => {
      const { roomId } = data;
      io.to(roomId).emit('game:state-updated', data);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      
      // Find and notify room
      for (const [userId, socketId] of playerSockets.entries()) {
        if (socketId === socket.id) {
          playerSockets.delete(userId);
          io.emit('room:player-left', { userId });
          break;
        }
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server running`);
  });
});
