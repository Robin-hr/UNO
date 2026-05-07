import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, Crown, ArrowRight, Star, Timer, Trophy, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

const COLORS = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  black: '#18181b',
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.12)'
};

const GameBoard = ({ gameState, socket, roomId }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [winner, setWinner] = useState(null);
  const [winByPoints, setWinByPoints] = useState(false);
  const [isFinalWin, setIsFinalWin] = useState(false);
  const [scores, setScores] = useState([]);
  const [roundPoints, setRoundPoints] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(5 * 60 * 1000);
  const [showUnoBtn, setShowUnoBtn] = useState(false);
  const [unoCountdown, setUnoCountdown] = useState(2);
  const [unoNotif, setUnoNotif] = useState(null);
  const [swapOptions, setSwapOptions] = useState(null);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState(10);
  
  const unoTimerRef = useRef(null);
  const unoCountRef = useRef(null);

  const { 
    topCard, 
    currentPlayerId, 
    currentPlayerIndex = 0,
    direction = 1,
    hand = [], 
    playerCounts = [], 
    pendingDraws = 0 
  } = gameState || {};
  const isMyTurn = currentPlayerId === socket.id;

  const isLowTime = timeRemaining <= 60000;

  const styles = {
    scene: {
      position: 'fixed', inset: 0,
      background: 'radial-gradient(circle at center, #450a0a 0%, #1a0000 70%, #000 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      perspective: '1500px', overflow: 'hidden', fontFamily: "'Nunito', sans-serif"
    },
    table: {
      position: 'absolute', width: '1100px', height: '650px',
      background: 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.1) 0%, transparent 80%)',
      borderRadius: '50%', transform: 'rotateX(60deg) translateY(60px)',
      border: '2px solid rgba(255, 255, 255, 0.03)',
      boxShadow: '0 0 120px rgba(0,0,0,0.9), inset 0 0 40px rgba(0,0,0,0.5)',
      zIndex: 1
    },
    timer: {
      position: 'fixed', top: '30px', right: '30px', zIndex: 500,
      background: isLowTime ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(10px)',
      border: `1.5px solid ${isLowTime ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: '16px', padding: '10px 22px',
      display: 'flex', alignItems: 'center', gap: '10px',
      boxShadow: isLowTime ? '0 0 25px rgba(239,68,68,0.3)' : '0 10px 30px rgba(0,0,0,0.3)',
      transition: 'all 0.5s'
    },
    notif: {
      position: 'fixed', top: '100px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, padding: '16px 36px', borderRadius: '50px',
      fontWeight: 900, fontSize: '20px', letterSpacing: '1px',
      background: unoNotif?.type === 'success' ? '#22c55e' : '#ef4444',
      color: 'white', boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', gap: '10px'
    }
  };

  useEffect(() => {
    setTurnTimeRemaining(10);
    const interval = setInterval(() => {
      setTurnTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentPlayerId]);

  // Reset internal states when a new round starts
  useEffect(() => {
    if (gameState && gameState.playedCards?.length === 1) {
      setWinner(null);
      setScores([]);
      setRoundPoints(0);
      setIsFinalWin(false);
      setTurnTimeRemaining(10);
    }
  }, [gameState?.topCard?.id]);

  useEffect(() => {
    socket.on('game_over', ({ winner, final, scores }) => {
      setWinner(winner);
      setIsFinalWin(!!final);
      setScores(scores || []);
      confetti({ particleCount: 300, spread: 80, origin: { y: 0.6 } });
    });

    socket.on('round_over', ({ winner, points, scores }) => {
      setWinner(winner);
      setIsFinalWin(false);
      setRoundPoints(points);
      setScores(scores || []);
      confetti({ particleCount: 150, spread: 60, origin: { y: 0.7 } });
    });

    socket.on('time_update', ({ remaining }) => {
      setTimeRemaining(remaining);
    });

    socket.on('uno_required', ({ playerId }) => {
      if (playerId === socket.id) {
        setShowUnoBtn(true);
        setUnoCountdown(2);
        if (unoCountRef.current) clearInterval(unoCountRef.current);
        unoCountRef.current = setInterval(() => {
          setUnoCountdown(prev => Math.max(0, prev - 1));
        }, 1000);
        if (unoTimerRef.current) clearTimeout(unoTimerRef.current);
        unoTimerRef.current = setTimeout(() => {
          setShowUnoBtn(false);
          clearInterval(unoCountRef.current);
        }, 2100);
      }
    });

    socket.on('uno_called', ({ playerId }) => {
      const name = playerCounts.find(p => p.id === playerId)?.name || 'Someone';
      setUnoNotif({ text: `${name} called UNO! 🎉`, type: 'success' });
      setTimeout(() => setUnoNotif(null), 2500);
    });

    socket.on('uno_penalty', ({ playerId }) => {
      const name = playerId === socket.id ? 'You' : (playerCounts.find(p => p.id === playerId)?.name || 'Someone');
      setUnoNotif({ text: `${name} missed UNO! +2 cards 😬`, type: 'penalty' });
      setTimeout(() => setUnoNotif(null), 2500);
    });

    socket.on('pick_swap_target', ({ players }) => {
      setSwapOptions(players);
    });

    return () => {
      socket.off('game_over');
      socket.off('time_update');
      socket.off('uno_required');
      socket.off('uno_called');
      socket.off('uno_penalty');
      socket.off('pick_swap_target');
      if (unoTimerRef.current) clearTimeout(unoTimerRef.current);
      if (unoCountRef.current) clearInterval(unoCountRef.current);
    };
  }, [socket, playerCounts]);

  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const others = playerCounts.filter(p => p.id !== socket.id);
  const nextPlayerIndex = (currentPlayerIndex + direction + playerCounts.length) % (playerCounts.length || 1);
  const nextPlayerId = playerCounts[nextPlayerIndex]?.id;

  const handleCardClick = (card) => {
    if (!isMyTurn) {
      setUnoNotif({ text: "Wait! It's not your turn yet! ⏳", type: 'penalty' });
      setTimeout(() => setUnoNotif(null), 2000);
      return;
    }
    
    if (['wild', 'wild4', 'wildShuffle', 'wildCustom'].includes(card.value)) {
      setSelectedCardId(card.id);
      setShowColorPicker(true);
    } else {
      socket.emit('play_card', { roomId, cardId: card.id });
    }
  };

  const selectColor = (color) => {
    socket.emit('play_card', { roomId, cardId: selectedCardId, colorSelection: color });
    setShowColorPicker(false);
    setSelectedCardId(null);
  };

  // --- Styles ---
  const s = styles;

  if (winner) {
    const isHost = playerCounts.find(p => p.id === socket.id)?.host || false;
    // Better to check if myInfo is host, but let's assume first player in list is host if needed.
    
    return (
      <div style={{ ...s.scene, zIndex: 2000, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)' }}>
        <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} 
          style={{ background: '#0f172a', borderRadius: '40px', padding: '60px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', minWidth: '500px', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>
          <Crown size={120} color="#facc15" style={{ margin: '0 auto 24px', filter: 'drop-shadow(0 0 20px rgba(250,204,21,0.4))' }} />
          <h1 style={{ fontSize: '56px', fontWeight: 900, marginBottom: '8px', color: 'white' }}>{winner}</h1>
          <p style={{ fontSize: '20px', color: '#94a3b8', marginBottom: '40px', letterSpacing: '4px', fontWeight: 700 }}>
            {isFinalWin ? '🏆 ULTIMATE CHAMPION' : `🎉 ROUND WINNER (+${roundPoints} pts)`}
          </p>

          <div style={{ marginBottom: '40px', textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', letterSpacing: '2px', fontWeight: 800 }}>ACCUMULATED SCORES</h3>
            {scores.map((score, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 20px', marginBottom: '8px', borderRadius: '14px',
                background: i === 0 ? 'rgba(250,204,21,0.1)' : 'rgba(255,255,255,0.03)',
                border: i === 0 ? '1px solid rgba(250,204,21,0.3)' : '1px solid transparent'
              }}>
                <span style={{ fontWeight: 800, fontSize: '18px' }}>{i === 0 ? '👑' : '👤'} {score.name}</span>
                <span style={{ fontWeight: 900, color: i === 0 ? '#facc15' : '#94a3b8', fontSize: '20px' }}>{score.points} / 500</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            {isFinalWin ? (
              <button className="btn-start" style={{ width: '100%', padding: '20px' }} onClick={() => window.location.reload()}>NEW GAME</button>
            ) : isHost ? (
              <button className="btn-start" style={{ width: '100%', padding: '20px' }} onClick={() => socket.emit('start_game', { roomId })}>START NEXT ROUND</button>
            ) : (
              <div style={{ width: '100%', padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '18px', fontWeight: 800, color: '#94a3b8' }}>
                WAITING FOR HOST TO START NEXT ROUND...
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!gameState || !topCard) {
    return (
      <div style={s.scene}>
        <div style={{ color: 'white', fontSize: '24px', fontWeight: 900, textAlign: 'center' }}>
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            SYNCHRONIZING GAME STATE...
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.scene}>
      <div style={s.table} />

      {/* Modern Timer */}
      <div style={s.timer}>
        <Timer size={20} color={isLowTime ? '#f87171' : '#94a3b8'} />
        <motion.span
          animate={isLowTime ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
          style={{ fontWeight: 900, fontSize: '24px', color: 'white', letterSpacing: '1px' }}
        >
          {formatTime(timeRemaining)}
        </motion.span>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {unoNotif && (
          <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }} style={s.notif}>
            {unoNotif.type === 'penalty' ? <AlertTriangle size={24} /> : <Star size={24} fill="white" />}
            {unoNotif.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center Deck Area */}
      <div style={{ position: 'relative', zIndex: 100, display: 'flex', alignItems: 'center', gap: '80px', transform: 'translateY(20px)' }}>
        {/* Draw Pile */}
        <div style={{ cursor: isMyTurn ? 'pointer' : 'default', perspective: '1000px' }} onClick={() => isMyTurn && socket.emit('draw_card', { roomId })}>
          <div style={{ position: 'relative', transform: 'rotateY(-20deg) rotateX(10deg)' }}>
            <Card isBack disabled />
            <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '90px', height: '140px', background: '#000', border: '4px solid white', borderRadius: '8px', zIndex: -1, opacity: 0.5 }} />
            <div style={{ position: 'absolute', bottom: '-30px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>DRAW</div>
            {isMyTurn && pendingDraws > 0 && (
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1 }} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#ef4444', color: 'white', fontWeight: 900, padding: '8px 12px', borderRadius: '12px', fontSize: '14px', whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(239,68,68,0.6)', zIndex: 200 }}>
                MUST DRAW +{pendingDraws}
              </motion.div>
            )}
          </div>
        </div>

        {/* Discard Pile */}
        <div style={{ perspective: '1000px' }}>
          <AnimatePresence mode="wait">
            {topCard && (
              <motion.div key={topCard.id} initial={{ y: -400, opacity: 0, rotate: 45 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', damping: 15 }} style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.6))' }}>
                <Card card={topCard} disabled />
                <div style={{ position: 'absolute', bottom: '-30px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', whiteSpace: 'nowrap' }}>DISCARD</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Opponents Orbiting */}
      {others.map((player, idx) => {
        const total = others.length;
        const angle = (idx + 1) * (180 / (total + 1));
        const rad = (angle + 180) * (Math.PI / 180);
        const x = Math.cos(rad) * 450;
        const y = Math.sin(rad) * 280;
        const isActive = currentPlayerId === player.id;

        return (
          <div key={player.id} style={{ position: 'absolute', transform: `translate(${x}px, ${y}px)`, display: 'flex', alignItems: 'center', gap: '20px', zIndex: 10 }}>
            {isActive && (
              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={{ position: 'absolute', right: '100%', marginRight: '20px', background: '#3b82f6', color: 'white', fontWeight: 900, padding: '6px 14px', borderRadius: '10px', fontSize: '11px', whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(59,130,246,0.4)' }}>
                PLAYING <ArrowRight size={12} style={{ marginLeft: 4 }} />
              </motion.div>
            )}
            <div style={{ position: 'relative', width: '140px', textAlign: 'center' }}>
            {currentPlayerId === player.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1.1,
                  boxShadow: ['0 0 20px rgba(239,68,68,0.3)', '0 0 40px rgba(239,68,68,0.6)', '0 0 20px rgba(239,68,68,0.3)'] 
                }}
                style={{
                  position: 'absolute', inset: -8, borderRadius: '24px',
                  background: 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)',
                  boxShadow: '0 0 30px rgba(239,68,68,0.5)', zIndex: -1
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            {nextPlayerId === player.id && currentPlayerId !== player.id && (
              <motion.div
                animate={{ opacity: [0.1, 0.4, 0.1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  position: 'absolute', inset: -4, borderRadius: '20px',
                  border: '2px dashed rgba(255,255,255,0.2)', zIndex: -1
                }}
              />
            )}
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)',
              border: `3px solid ${currentPlayerId === player.id ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
              position: 'relative', transition: 'all 0.3s',
              transform: currentPlayerId === player.id ? 'scale(1.1)' : 'scale(1)'
            }}>
                {player.id.includes('bot') ? <Bot size={40} color="#c084fc" /> : <User size={40} color="#94a3b8" />}
                <div style={{ position: 'absolute', top: -10, right: -10, background: 'white', color: 'black', fontWeight: 900, fontSize: '12px', padding: '2px 8px', borderRadius: '6px' }}>{player.count}</div>
                {isActive && (
                  <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: '#f87171', color: 'white', fontWeight: 900, fontSize: '10px', padding: '2px 6px', borderRadius: '4px', boxShadow: '0 0 10px rgba(248,113,113,0.5)' }}>
                    {turnTimeRemaining}s
                  </div>
                )}
              </div>
              <div style={{ marginTop: '10px', fontSize: '13px', fontWeight: 800, background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: '8px' }}>{player.name}</div>
            </div>

            {/* Fanned cards */}
            <div style={{ position: 'relative', width: '100px', height: '60px' }}>
              {Array.from({ length: Math.min(player.count, 6) }).map((_, i) => (
                <div key={i} style={{ position: 'absolute', left: i * 12, zIndex: i, transform: `rotate(${(i - 2) * 8}deg)` }}>
                   <Card isBack style={{ width: '40px', height: '60px', borderWidth: '2px' }} />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Local Player HUD */}
      <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'flex-end', gap: '30px', zIndex: 1000 }}>
        {/* Avatar */}
        <div style={{ position: 'relative', textAlign: 'center', flexShrink: 0 }}>
          {isMyTurn && (
            <motion.div 
              initial={{ scale: 0, y: 10 }} 
              animate={{ scale: 1, y: 0, boxShadow: ['0 0 10px rgba(250,204,21,0.3)', '0 0 30px rgba(250,204,21,0.6)', '0 0 10px rgba(250,204,21,0.3)'] }} 
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)', marginBottom: '15px', background: '#facc15', color: '#000', fontWeight: 900, fontSize: '11px', padding: '5px 14px', borderRadius: '10px', whiteSpace: 'nowrap', zIndex: 10 }}>
              <Star size={12} fill="black" style={{ verticalAlign: 'middle', marginRight: 4 }} /> YOUR TURN
            </motion.div>
          )}
          <div style={{
            width: '90px', height: '90px', borderRadius: '26px', background: 'rgba(255,255,255,0.07)',
            border: `5px solid ${isMyTurn ? '#facc15' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
            boxShadow: isMyTurn ? '0 0 50px rgba(250,204,21,0.5)' : '0 15px 30px rgba(0,0,0,0.4)',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: isMyTurn ? 'scale(1.1) translateY(-5px)' : 'scale(1)'
          }}>
            <User size={48} color="#60a5fa" />
            <div style={{ position: 'absolute', top: -12, right: -12, background: 'white', color: 'black', fontWeight: 900, fontSize: '14px', padding: '4px 10px', borderRadius: '8px' }}>{hand.length}</div>
            {isMyTurn && (
              <div style={{ position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)', background: '#f87171', color: 'white', fontWeight: 900, fontSize: '12px', padding: '2px 8px', borderRadius: '6px', boxShadow: '0 0 15px rgba(248,113,113,0.6)' }}>
                {turnTimeRemaining}s
              </div>
            )}
          </div>
          <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 800, background: 'rgba(255,255,255,0.1)', padding: '5px 14px', borderRadius: '10px' }}>{myInfo?.name || 'You'}</div>
        </div>

        {/* Hand */}
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', position: 'relative', marginLeft: '10px' }}>
          {hand.map((card, idx) => {
            const rot = (idx - (hand.length - 1) / 2) * 6;
            const yOff = Math.abs(idx - (hand.length - 1) / 2) * 6;
            return (
              <motion.div 
                key={card.id} 
                initial={{ x: -300, y: -400, opacity: 0, rotate: 0, scale: 0.5 }} 
                animate={{ x: 0, y: yOff, rotate: rot, opacity: 1, scale: 1 }} 
                whileHover={{ y: -60, scale: 1.15, zIndex: 100 }} 
                drag={isMyTurn ? "y" : false}
                dragConstraints={{ top: -500, bottom: 0 }}
                dragElastic={0.1}
                onDragEnd={(event, info) => {
                  if (info.point.y < window.innerHeight * 0.6) {
                    handleCardClick(card);
                  }
                }}
                style={{ marginLeft: idx === 0 ? 0 : -45, cursor: isMyTurn ? 'grab' : 'default', zIndex: idx }}
                transition={{ type: 'spring', damping: 15, stiffness: 100 }}
              >
                <Card card={card} onClick={() => handleCardClick(card)} disabled={!isMyTurn} />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* UNO Button */}
      <AnimatePresence>
        {showUnoBtn && (
          <motion.div initial={{ scale: 0, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }} style={{ position: 'fixed', bottom: '280px', left: '50%', transform: 'translateX(-50%)', zIndex: 2000, textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '150px', height: '150px' }}>
              <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <motion.circle cx="70" cy="70" r="62" fill="none" stroke="#ef4444" strokeWidth="8" strokeDasharray={2 * Math.PI * 62} initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: 2 * Math.PI * 62 }} transition={{ duration: 2, ease: 'linear' }} strokeLinecap="round" />
              </svg>
              <button onClick={() => { socket.emit('call_uno', { roomId }); setShowUnoBtn(false); clearInterval(unoCountRef.current); clearTimeout(unoTimerRef.current); }}
                style={{ position: 'absolute', inset: '10px', borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white', fontWeight: 900, fontSize: '36px', fontStyle: 'italic', cursor: 'pointer', boxShadow: '0 0 40px rgba(239,68,68,0.7)', letterSpacing: '-1px' }}>
                UNO!
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 800, color: '#fca5a5' }}>{unoCountdown}s LEFT!</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color Picker */}
      <AnimatePresence>
        {showColorPicker && (
          <div style={s.modalOverlay || { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(12px)' }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: '#0f172a', borderRadius: '40px', padding: '50px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 50px 100px rgba(0,0,0,0.8)' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '40px', letterSpacing: '3px', color: 'white' }}>PICK A COLOR</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {[{ c: 'red', b: '#ef4444' }, { c: 'blue', b: '#3b82f6' }, { c: 'green', b: '#22c55e' }, { c: 'yellow', b: '#eab308' }].map(item => (
                  <motion.div key={item.c} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => selectColor(item.c)} style={{ width: '120px', height: '120px', borderRadius: '24px', background: item.b, border: '6px solid white', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }} />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Swap Modal */}
      <AnimatePresence>
        {swapOptions && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, backdropFilter: 'blur(12px)' }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: '#0f172a', borderRadius: '40px', padding: '50px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 50px 100px rgba(0,0,0,0.8)', minWidth: '400px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '20px', letterSpacing: '3px', color: 'white' }}>SWAP HANDS</h2>
              <p style={{ color: '#94a3b8', marginBottom: '40px', fontWeight: 700 }}>CHOOSE A PLAYER TO SWAP CARDS WITH!</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {swapOptions.map(p => (
                  <motion.button key={p.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => { socket.emit('swap_hands', { roomId, targetPlayerId: p.id }); setSwapOptions(null); }}
                    style={{ padding: '20px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, fontSize: '18px', cursor: 'pointer' }}>
                    {p.name}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameBoard;
