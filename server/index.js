import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createDeck, dealCards, isValidMove, shuffle } from './gameLogic.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/uno_db';
const JWT_SECRET = 'uno_super_secret_key';

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  wins: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

// Auth Routes
app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Missing fields' });
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error registering user' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
const rooms = new Map();

// ── Point values ──────────────────────────────────────────────────────────────
const cardPoints = (card) => {
  if (card.value === 'wild' || card.value === 'wild4') return 50;
  if (['skip', 'reverse', 'draw2'].includes(card.value)) return 20;
  return parseInt(card.value, 10) || 0;  // number cards = face value
};

const calculateHandPoints = (hand) =>
  hand.reduce((sum, card) => sum + cardPoints(card), 0);

// ── Time-limit winner ─────────────────────────────────────────────────────────
const resolveByPoints = (roomId) => {
  const room = rooms.get(roomId);
  if (!room || !room.gameStarted) return;

  const scores = room.players.map(p => ({
    name: p.name,
    points: calculateHandPoints(room.gameState.hands[p.id])
  }));

  scores.sort((a, b) => a.points - b.points);
  const winner = scores[0];

  io.to(roomId).emit('game_over', {
    winner: winner.name,
    byPoints: true,
    scores
  });
  room.gameStarted = false;
  clearTimeout(room.timer);
};

// ── Start 5-min countdown ─────────────────────────────────────────────────────
const startGameTimer = (roomId) => {
  const room = rooms.get(roomId);
  const GAME_DURATION = 5 * 60 * 1000; // 5 minutes
  const startTime = Date.now();

  // Send time_update every second
  room.timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, GAME_DURATION - elapsed);
    io.to(roomId).emit('time_update', { remaining });
    if (remaining === 0) clearInterval(room.timerInterval);
  }, 1000);

  // Resolve when time is up
  room.timer = setTimeout(() => {
    clearInterval(room.timerInterval);
    resolveByPoints(roomId);
  }, GAME_DURATION);
};

// ─────────────────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {

  socket.on('create_room', ({ playerName }) => {
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const player = { id: socket.id, name: playerName, host: true };
    rooms.set(roomId, { players: [player], gameStarted: false });
    socket.join(roomId);
    socket.emit('room_created', { roomId, players: [player] });
  });

  socket.on('create_solo_room', ({ playerName }) => {
    const roomId = "SOLO-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const player = { id: socket.id, name: playerName, host: true };
    const bot = { id: 'bot-1', name: 'Bot-1', host: false, isBot: true };
    rooms.set(roomId, { players: [player, bot], gameStarted: false, isSolo: true });
    socket.join(roomId);
    socket.emit('room_created', { roomId, players: [player, bot] });
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('error', 'Room not found');
    if (room.gameStarted) return socket.emit('error', 'Game already started');
    if (room.players.length >= 8) return socket.emit('error', 'Room is full');

    const player = { id: socket.id, name: playerName, host: false };
    room.players.push(player);
    socket.join(roomId);
    socket.emit('joined_room', { roomId, players: room.players });
    socket.to(roomId).emit('player_joined', { players: room.players });
  });

  socket.on('start_game', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.players[0].id !== socket.id) return;

    const deck = createDeck();
    const { hands, remainingDeck } = dealCards(deck, room.players);
    let topCardIndex = remainingDeck.findIndex(c => c.value !== 'wild4');
    const topCard = remainingDeck.splice(topCardIndex, 1)[0];
    
    // Initial Action Handling
    let initialIndex = 0;
    let initialDirection = 1;
    let initialPending = 0;

    if (topCard.value === 'skip') initialIndex = 1;
    if (topCard.value === 'reverse') { initialDirection = -1; initialIndex = room.players.length - 1; }
    if (topCard.value === 'draw2') { initialPending = 2; }

    room.gameState = {
      deck: remainingDeck,
      hands,
      topCard,
      currentPlayerIndex: initialIndex,
      direction: initialDirection,
      playedCards: [topCard],
      pendingDraws: initialPending
    };
    room.gameStarted = true;

    updateAllPlayers(roomId);
    startGameTimer(roomId);   // ← start 5-minute clock
    startTurnTimer(roomId);   // ← NEW: start 10-second turn timer
    checkBotTurn(roomId);
  });

  socket.on('play_card', ({ roomId, cardId, colorSelection }) => {
    const room = rooms.get(roomId);
    if (!room || !room.gameStarted) return;
    const gameState = room.gameState;
    if (room.players[gameState.currentPlayerIndex].id !== socket.id) {
      console.log(`Rejected move: it is ${room.players[gameState.currentPlayerIndex].id}'s turn, but ${socket.id} tried to play.`);
      return;
    }

    const playerHand = gameState.hands[socket.id];
    const cardIndex = playerHand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    const card = playerHand[cardIndex];

    // Official Rules: No Stacking.
    // Stacking Rules
    if (gameState.pendingDraws > 0) {
      const isStackingDraw2 = card.value === 'draw2' && gameState.topCard.value === 'draw2';
      const isStackingWild4 = card.value === 'wild4' && gameState.topCard.value === 'wild4';
      
      if (!isStackingDraw2 && !isStackingWild4) {
        return socket.emit('error', `You must draw ${gameState.pendingDraws} cards or stack a similar card!`);
      }
    }

    if (isValidMove(card, gameState.topCard)) {
      playerHand.splice(cardIndex, 1);
      if (card.type === 'wild' || card.value === 'wild4') {
        card.color = colorSelection || 'red';
      }
      gameState.topCard = card;
      gameState.playedCards.push(card);
      resetTurnTimer(roomId); // Reset timer on successful play
      handleSpecialEffects(room, card);

      if (playerHand.length === 0) {
        clearTimeout(room.timer);
        clearInterval(room.timerInterval);
        io.to(roomId).emit('game_over', { winner: room.players.find(p => p.id === socket.id).name });
        room.gameStarted = false;
        return;
      }

      // UNO rule: player dropped to 1 card — start 2s window
      if (playerHand.length === 1) {
        room.unoCalled = false;
        room.unoPlayerId = socket.id;
        io.to(roomId).emit('uno_required', { playerId: socket.id });

        room.unoTimer = setTimeout(() => {
          // Missed UNO call — draw 2 penalty cards
          if (!room.unoCalled && room.gameStarted) {
            drawCardForPlayer(room, socket.id);
            drawCardForPlayer(room, socket.id);
            io.to(roomId).emit('uno_penalty', { playerId: socket.id });
            updateAllPlayers(roomId);
          }
        }, 2000);
      }

      updateAllPlayers(roomId);
      checkBotTurn(roomId);
    }
  });

  socket.on('call_uno', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.unoPlayerId === socket.id) {
      room.unoCalled = true;
      clearTimeout(room.unoTimer);
      io.to(roomId).emit('uno_called', { playerId: socket.id });
    }
  });

  socket.on('draw_card', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !room.gameStarted) return;
    const gameState = room.gameState;
    if (room.players[gameState.currentPlayerIndex].id !== socket.id) return;

    if (gameState.pendingDraws > 0) {
      // Must draw the entire stack
      for (let i = 0; i < gameState.pendingDraws; i++) {
        drawCardForPlayer(room, socket.id);
      }
      gameState.pendingDraws = 0;
      // Skip turn after drawing stack
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + gameState.direction + room.players.length) % room.players.length;
    } else {
      const drawnCard = drawCardForPlayer(room, socket.id);
      if (!isValidMove(drawnCard, gameState.topCard)) {
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + gameState.direction + room.players.length) % room.players.length;
      }
    }

    resetTurnTimer(roomId); // Reset timer on draw
    updateAllPlayers(roomId);
    checkBotTurn(roomId);
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function drawCardForPlayer(room, playerId) {
    const gameState = room.gameState;
    if (gameState.deck.length < 1) {
      const top = gameState.playedCards.pop();
      gameState.deck = shuffle(gameState.playedCards);
      gameState.playedCards = [top];
    }
    const card = gameState.deck.shift();
    gameState.hands[playerId].push(card);
    return card;
  }

  function handleSpecialEffects(room, card) {
    const gameState = room.gameState;
    let skipNext = card.value === 'skip';
    if (card.value === 'reverse') {
      if (room.players.length === 2) skipNext = true;
      else gameState.direction *= -1;
    }
    
    // Official Rules: Draw and Skip
    if (card.value === 'draw2' || card.value === 'wild4') {
      const penalty = card.value === 'draw2' ? 2 : 4;
      gameState.pendingDraws += penalty; // Stack the penalty
      
      // Advance to the player who must draw or stack
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + gameState.direction + room.players.length) % room.players.length;
    } else {
      // Normal turn advancement
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + gameState.direction + room.players.length) % room.players.length;
      if (skipNext) {
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + gameState.direction + room.players.length) % room.players.length;
      }
    }
  }

  function startTurnTimer(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    if (room.turnTimer) clearTimeout(room.turnTimer);
    
    room.turnTimer = setTimeout(() => {
      if (room.gameStarted) performAutoMove(roomId);
    }, 11000); // 11s to give a bit of buffer
  }

  function resetTurnTimer(roomId) {
    startTurnTimer(roomId);
  }

  function performAutoMove(roomId) {
    const room = rooms.get(roomId);
    if (!room || !room.gameStarted) return;
    const gameState = room.gameState;
    const playerId = room.players[gameState.currentPlayerIndex].id;
    const hand = gameState.hands[playerId];

    const validCardIndex = hand.findIndex(c => {
      if (gameState.pendingDraws > 0) {
        return (c.value === 'draw2' && gameState.topCard.value === 'draw2') || 
               (c.value === 'wild4' && gameState.topCard.value === 'wild4');
      }
      return isValidMove(c, gameState.topCard);
    });
    
    if (validCardIndex !== -1) {
      const card = hand.splice(validCardIndex, 1)[0];
      if (card.type === 'wild' || card.value === 'wild4') card.color = ['red','blue','green','yellow'][Math.floor(Math.random()*4)];
      gameState.topCard = card;
      gameState.playedCards.push(card);
      handleSpecialEffects(room, card);
    } else {
      // 2. If no valid card, draw
      if (gameState.pendingDraws > 0) {
        for (let i = 0; i < gameState.pendingDraws; i++) drawCardForPlayer(room, playerId);
        gameState.pendingDraws = 0;
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + gameState.direction + room.players.length) % room.players.length;
      } else {
        const drawn = drawCardForPlayer(room, playerId);
        if (!isValidMove(drawn, gameState.topCard)) {
          gameState.currentPlayerIndex = (gameState.currentPlayerIndex + gameState.direction + room.players.length) % room.players.length;
        }
      }
    }

    updateAllPlayers(roomId);
    startTurnTimer(roomId); // Start timer for next player
    checkBotTurn(roomId);
  }

  function checkBotTurn(roomId) {
    const room = rooms.get(roomId);
    if (!room || !room.gameStarted) return;
    const nextPlayer = room.players[room.gameState.currentPlayerIndex];
    if (nextPlayer.isBot) setTimeout(() => performBotMove(roomId), 1500);
  }

  function performBotMove(roomId) {
    const room = rooms.get(roomId);
    if (!room || !room.gameStarted) return;
    const gameState = room.gameState;
    const botId = room.players[gameState.currentPlayerIndex].id;
    const botHand = gameState.hands[botId];

    let cardToPlay = botHand.find(card => {
      if (gameState.pendingDraws > 0) {
        return (card.value === 'draw2' && gameState.topCard.value === 'draw2') || 
               (card.value === 'wild4' && gameState.topCard.value === 'wild4');
      }
      return isValidMove(card, gameState.topCard);
    });

    if (!cardToPlay && gameState.pendingDraws === 0) {
      const drawn = drawCardForPlayer(room, botId);
      if (isValidMove(drawn, gameState.topCard)) cardToPlay = drawn;
    }

    if (cardToPlay) {
      const cardIndex = botHand.findIndex(c => c.id === cardToPlay.id);
      botHand.splice(cardIndex, 1);
      if (cardToPlay.type === 'wild' || cardToPlay.value === 'wild4') {
        const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
        botHand.forEach(c => { if (counts[c.color] !== undefined) counts[c.color]++; });
        cardToPlay.color = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      }
      gameState.topCard = cardToPlay;
      gameState.playedCards.push(cardToPlay);
      handleSpecialEffects(room, cardToPlay);

      if (botHand.length === 0) {
        clearTimeout(room.timer);
        clearInterval(room.timerInterval);
        io.to(roomId).emit('game_over', { winner: room.players.find(p => p.id === botId).name });
        room.gameStarted = false;
        return;
      }

      // Bot auto-calls UNO instantly
      if (botHand.length === 1) {
        room.unoCalled = true;
        room.unoPlayerId = botId;
        io.to(roomId).emit('uno_called', { playerId: botId });
      }

    } else {
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + gameState.direction + room.players.length) % room.players.length;
    }

    updateAllPlayers(roomId);
    checkBotTurn(roomId);
  }

  function updateAllPlayers(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    room.players.forEach(player => {
      if (player.isBot) return;
      const state = {
        topCard: room.gameState.topCard,
        currentPlayerId: room.players[room.gameState.currentPlayerIndex].id,
        hand: room.gameState.hands[player.id],
        pendingDraws: room.gameState.pendingDraws,
        playerCounts: room.players.map(p => ({
          id: p.id,
          name: p.name,
          count: room.gameState.hands[p.id].length
        }))
      };
      io.to(player.id).emit('game_update', state);
    });
  }

  socket.on('disconnect', () => {
    for (const [roomId, room] of rooms.entries()) {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        // Adjust currentPlayerIndex if a player leaves
        if (room.gameState) {
          if (idx < room.gameState.currentPlayerIndex) {
            room.gameState.currentPlayerIndex--;
          } else if (idx === room.gameState.currentPlayerIndex) {
            // It was this player's turn, move to next
            // No need to increment, because splicing shifts everything
          }
          if (room.gameState.currentPlayerIndex >= room.players.length - 1) {
             room.gameState.currentPlayerIndex = 0;
          }
        }

        room.players.splice(idx, 1);
        if (room.players.filter(p => !p.isBot).length === 0) {
          clearTimeout(room.timer);
          clearInterval(room.timerInterval);
          if (room.turnTimer) clearTimeout(room.turnTimer);
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('player_left', { players: room.players });
          if (room.gameStarted) updateAllPlayers(roomId);
        }
        break;
      }
    }
  });
});

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
