import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Users, Play, LogIn, Plus, Copy, CheckCircle2, User as UserIcon, Bot, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GameBoard from './components/GameBoard';
import Login from './components/Login';
import LoadingScreen from './components/LoadingScreen';

const socket = io(); // Connects to the same host that serves the page

const COLORS = { red: '#dc2626', blue: '#2563eb', green: '#16a34a', yellow: '#ca8a04', black: '#18181b' };

const FloatingCard = ({ color, label, top, left, right, bottom, rotate, delay = 0 }) => (
  <motion.div
    animate={{ y: [0, -16, 0] }}
    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay }}
    style={{
      position: 'fixed', width: 64, height: 96,
      borderRadius: 10, border: '3px solid rgba(255,255,255,0.5)',
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22, fontWeight: 900, color: 'white',
      boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
      transform: `rotate(${rotate}deg)`, opacity: 0.6,
      pointerEvents: 'none', zIndex: 0,
      top, left, right, bottom
    }}
  >{label}</motion.div>
);

const s = {
  root: {
    position: 'fixed', inset: 0,
    background: 'radial-gradient(ellipse at 50% 40%, #6b0000 0%, #1a0000 60%, #000 100%)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
    color: 'white', overflow: 'hidden'
  },
  logo: {
    fontSize: 96, fontWeight: 900, fontStyle: 'italic',
    letterSpacing: -4, lineHeight: 1,
    background: 'linear-gradient(135deg, #fff 0%, #fca5a5 40%, #ef4444 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text', textAlign: 'center',
    filter: 'drop-shadow(0 0 30px rgba(239,68,68,0.6))',
  },
  subtitle: {
    textAlign: 'center', fontSize: 12, fontWeight: 700,
    letterSpacing: 5, textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)', marginTop: 6, marginBottom: 32
  },
  card: {
    width: 440, background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 28, padding: '32px 36px',
    backdropFilter: 'blur(24px)',
    boxShadow: '0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
    position: 'relative', zIndex: 1
  },
  label: {
    display: 'block', fontSize: 11, fontWeight: 800,
    letterSpacing: '2.5px', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)', marginBottom: 8
  },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.07)',
    border: '1.5px solid rgba(255,255,255,0.12)',
    borderRadius: 14, padding: '13px 18px',
    fontSize: 15, fontFamily: "inherit", fontWeight: 700,
    color: 'white', outline: 'none', marginBottom: 24
  },
  btnSolo: {
    flex: 1, padding: '18px 12px', borderRadius: 16,
    border: '1.5px solid rgba(168,85,247,0.4)',
    background: 'rgba(168,85,247,0.1)', color: 'white',
    cursor: 'pointer', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 6,
    fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
    transition: 'all 0.2s'
  },
  btnMulti: {
    flex: 1, padding: '18px 12px', borderRadius: 16,
    border: 'none',
    background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white',
    cursor: 'pointer', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 6,
    fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
    boxShadow: '0 6px 20px rgba(239,68,68,0.35)',
    transition: 'all 0.2s'
  },
  divider: { height: 1, background: 'rgba(255,255,255,0.08)', margin: '20px 0' },
  btnAction: {
    width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none',
    background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
    color: 'white', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
    boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
    marginBottom: 10
  },
  joinRow: { display: 'flex', gap: 10 },
  joinInput: {
    flex: 1, background: 'rgba(255,255,255,0.07)',
    border: '1.5px solid rgba(255,255,255,0.12)',
    borderRadius: 14, padding: '13px 18px',
    fontSize: 15, fontFamily: 'inherit', fontWeight: 800,
    color: 'white', outline: 'none', textTransform: 'uppercase', letterSpacing: 3,
    textAlign: 'center'
  },
  btnJoin: {
    padding: '13px 18px', borderRadius: 14,
    border: '1.5px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.07)',
    color: 'white', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
    fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
    transition: 'all 0.2s'
  },
  error: {
    marginTop: 16, padding: '10px 16px', borderRadius: 12,
    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#fca5a5', fontSize: 13, fontWeight: 700, textAlign: 'center'
  },
  footer: {
    textAlign: 'center', marginTop: 20,
    fontSize: 11, color: 'rgba(255,255,255,0.18)', letterSpacing: 1
  },
  btnStart: {
    width: '100%', padding: '18px 20px', borderRadius: 18, border: 'none',
    background: 'linear-gradient(135deg, #22c55e, #15803d)',
    color: 'white', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    fontFamily: 'inherit', fontWeight: 900, fontSize: 18,
    boxShadow: '0 8px 24px rgba(34,197,94,0.4)', letterSpacing: 1
  },
  roomChip: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(59,130,246,0.1)',
    border: '1.5px solid rgba(59,130,246,0.3)',
    borderRadius: 12, padding: '9px 14px',
    cursor: 'pointer', fontWeight: 800, fontSize: 14
  },
  playerBadge: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, padding: '10px 12px',
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, fontWeight: 700, overflow: 'hidden'
  }
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState('home');

  useEffect(() => {
    window.onerror = (msg, url, line) => {
      alert(`Error: ${msg}\nLine: ${line}\nURL: ${url}`);
    };

    setTimeout(() => setLoading(false), 3000);
    
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    const savedUser = localStorage.getItem('uno_user');
    if (savedUser) setUser(JSON.parse(savedUser));

    socket.on('room_created', ({ roomId, players }) => { setRoomData({ roomId, players }); setIsJoined(true); });
    socket.on('joined_room', ({ roomId, players }) => { setRoomData({ roomId, players }); setIsJoined(true); });
    socket.on('player_joined', ({ players }) => setRoomData(p => ({ ...p, players })));
    socket.on('player_left', ({ players }) => setRoomData(p => ({ ...p, players })));
    socket.on('game_update', (state) => setGameState(state));
    socket.on('error', (msg) => { setError(msg); setTimeout(() => setError(''), 3000); });
    return () => ['room_created', 'joined_room', 'player_joined', 'player_left', 'game_update', 'error'].forEach(e => socket.off(e));
  }, []);

  const err = (msg) => { setError(msg); setTimeout(() => setError(''), 3000); };
  const handleSolo = () => socket.emit('create_solo_room', { playerName: user.username });
  const handleCreate = () => socket.emit('create_room', { playerName: user.username });
  const handleJoin = () => { if (!roomIdInput.trim()) return err('Room ID required'); socket.emit('join_room', { roomId: roomIdInput.toUpperCase(), playerName: user.username }); };
  const handleStart = () => socket.emit('start_game', { roomId: roomData.roomId });
  const copyId = () => { navigator.clipboard.writeText(roomData.roomId); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (copied) {} // dummy to keep eslint happy if needed

  return (
    <AnimatePresence mode="wait">
      {/* Connection Status Dot */}
      <div style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 10000, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: socketConnected ? '#22c55e' : '#ef4444', boxShadow: socketConnected ? '0 0 10px #22c55e' : '0 0 10px #ef4444' }} />
        {socketConnected ? 'SERVER ONLINE' : 'SERVER OFFLINE'}
      </div>

      {loading ? (
        <LoadingScreen key="loading" />
      ) : !user ? (
        <Login key="login" onLogin={setUser} />
      ) : gameState ? (
        <GameBoard key="game" gameState={gameState} socket={socket} roomId={roomData?.roomId} />
      ) : isJoined ? (
        <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={s.root}>
          <FloatingCard color={COLORS.red} label="7" top="8%" left="6%" rotate={-18} delay={0} />
          <FloatingCard color={COLORS.blue} label="+2" top="12%" right="8%" rotate={14} delay={1} />
          <FloatingCard color={COLORS.green} label="0" bottom="12%" left="5%" rotate={8} delay={1.5} />
          <FloatingCard color={COLORS.yellow} label="Wild" bottom="15%" right="6%" rotate={-12} delay={0.5} />

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
            <motion.div style={s.logo} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}>UNO</motion.div>
            <p style={s.subtitle}>{roomData?.roomId?.startsWith('SOLO-') ? '🤖 Solo vs AI' : '🌐 Multiplayer Lobby'}</p>

            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>Room Lobby</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <Users size={13} /> {roomData.players.length} / 8 players
                  </div>
                </div>
                {!roomData.roomId.startsWith('SOLO-') && (
                  <div style={s.roomChip} onClick={copyId}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>ROOM</span>
                    <span style={{ color: '#60a5fa', letterSpacing: 3 }}>{roomData.roomId}</span>
                    {copied ? <CheckCircle2 size={16} color="#4ade80" /> : <Copy size={16} color="rgba(255,255,255,0.4)" />}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 22 }}>
                {roomData.players.map(player => (
                  <div key={player.id} style={{ ...s.playerBadge, border: player.id === socket.id ? '1.5px solid rgba(99,102,241,0.5)' : s.playerBadge.border }}>
                    {player.isBot ? <Bot size={13} color="#c084fc" /> : <UserIcon size={13} color={player.host ? '#facc15' : 'rgba(255,255,255,0.4)'} />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
                  </div>
                ))}
              </div>

              {error && <div style={{ ...s.error, marginBottom: 14 }}>⚠️ {error}</div>}

              <button style={s.btnStart} onClick={handleStart}>
                <Play size={22} fill="white" /> Start Game
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={s.root}>
          <FloatingCard color={COLORS.red} label="7" top="8%" left="5%" rotate={-20} delay={0} />
          <FloatingCard color={COLORS.blue} label="+2" top="14%" right="7%" rotate={15} delay={1.2} />
          <FloatingCard color={COLORS.green} label="0" bottom="10%" left="4%" rotate={10} delay={0.7} />
          <FloatingCard color={COLORS.yellow} label="Wild" bottom="14%" right="5%" rotate={-12} delay={2.1} />

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
            <motion.div style={s.logo}>UNO</motion.div>
            <p style={s.subtitle}>The Ultimate Multiplayer Card Game</p>

            <div style={s.card}>
              <div style={{ marginBottom: 24, textAlign: 'center' }}>
                <div style={{ ...s.label, marginBottom: 4 }}>PLAYER SESSION</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#60a5fa', letterSpacing: 1, textTransform: 'uppercase' }}>
                  {user.username}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <button style={s.btnSolo} onClick={handleSolo}>
                  <Bot size={26} color="#c084fc" />
                  Solo Practice
                </button>
                <button style={s.btnMulti} onClick={() => setView('multiplayer')}>
                  <Globe size={26} />
                  Play Online
                </button>
              </div>

              {view === 'multiplayer' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                  <div style={s.divider} />
                  <button style={s.btnAction} onClick={handleCreate}><Plus size={18} /> Create New Room</button>
                  <div style={s.joinRow}>
                    <input style={s.joinInput} placeholder="ROOM ID" value={roomIdInput} onChange={e => setRoomIdInput(e.target.value.toUpperCase())} />
                    <button style={s.btnJoin} onClick={handleJoin}><LogIn size={18} /> Join</button>
                  </div>
                </motion.div>
              )}

              {error && <div style={s.error}>⚠️ {error}</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
