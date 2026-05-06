import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ card, onClick, isBack, disabled, style }) => {
  const getCardColor = (color) => {
    switch (color) {
      case 'red': return '#ef4444';
      case 'blue': return '#3b82f6';
      case 'green': return '#22c55e';
      case 'yellow': return '#eab308';
      case 'black': return '#18181b';
      default: return '#18181b';
    }
  };

  const getCardLabel = (value) => {
    if (value === 'skip') return '⊘';
    if (value === 'reverse') return '⇄';
    if (value === 'draw2') return '+2';
    if (value === 'wild4') return '+4';
    if (value === 'wild') return 'W';
    return value;
  };

  if (isBack) {
    return (
      <div style={{
        width: '90px', height: '140px',
        backgroundColor: '#000', borderRadius: '10px',
        border: '4px solid white', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        position: 'relative', overflow: 'hidden', ...style
      }}>
        <div style={{
          width: '95%', height: '65%',
          backgroundColor: '#ef4444', borderRadius: '50%',
          transform: 'rotate(-25deg)', border: '3px solid white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 0 15px rgba(0,0,0,0.3)'
        }}>
          <span style={{
            fontSize: '32px', fontWeight: 900, color: '#fbbf24',
            transform: 'rotate(25deg)', letterSpacing: '-2px',
            textShadow: '2px 2px 0 #000, -2px -2px 0 #fff'
          }}>UNO</span>
        </div>
      </div>
    );
  }

  const bgColor = getCardColor(card.color || 'black');
  const label = getCardLabel(card.value);

  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      style={{
        width: '90px', height: '140px',
        backgroundColor: bgColor, borderRadius: '10px',
        border: '4px solid white', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
        cursor: disabled ? 'default' : 'pointer',
        overflow: 'hidden', userSelect: 'none', ...style
      }}
    >
      {/* Corner Labels */}
      <div style={{ position: 'absolute', top: 6, left: 8, fontSize: 18, fontWeight: 900, color: 'white' }}>{label}</div>
      <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 18, fontWeight: 900, color: 'white', transform: 'rotate(180deg)' }}>{label}</div>

      {/* Center Oval */}
      <div style={{
        position: 'absolute', width: '125%', height: '70%',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '50%', transform: 'rotate(-45deg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
      }}>
        <span style={{
          fontSize: label.length > 1 ? '44px' : '64px',
          fontWeight: 900, color: bgColor,
          transform: 'rotate(45deg)', lineHeight: 1,
          textShadow: '1px 1px 0 rgba(0,0,0,0.1)'
        }}>
          {label}
        </span>
      </div>

      {/* Glossy Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
    </div>
  );
};

export default Card;
