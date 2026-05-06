import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = () => {
    const s = {
        container: {
            position: 'fixed', inset: 0,
            background: 'radial-gradient(circle at center, #450a0a 0%, #1a0000 70%, #000 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, overflow: 'hidden'
        },
        logoContainer: {
            position: 'relative', scale: 1.2
        },
        logo: {
            fontSize: '120px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-6px',
            background: 'linear-gradient(135deg, #fff 0%, #fca5a5 40%, #ef4444 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 30px rgba(239,68,68,0.8))',
            position: 'relative', zIndex: 10
        },
        subtitle: {
            color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontWeight: 800,
            letterSpacing: '8px', textTransform: 'uppercase', marginTop: '20px'
        }
    };

    const cardVariants = {
        animate: (i) => ({
            y: [0, -20, 0],
            rotate: [i * 10, i * 10 + 5, i * 10],
            transition: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }
        })
    };

    return (
        <motion.div exit={{ opacity: 0, scale: 1.1 }} transition={{ duration: 0.8 }} style={s.container}>
            {/* Background Particles */}
            <div style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.3 }}>
                {[...Array(20)].map((_, i) => (
                    <motion.div key={i}
                        animate={{ opacity: [0.1, 0.5, 0.1], y: [0, -100] }}
                        transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 5 }}
                        style={{ position: 'absolute', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: '2px', height: '20px', background: 'white' }}
                    />
                ))}
            </div>

            <div style={s.logoContainer}>
                {/* Orbiting Cards */}
                {[0, 1, 2, 3].map((i) => (
                    <motion.div key={i}
                        custom={i}
                        variants={cardVariants}
                        animate="animate"
                        style={{
                            position: 'absolute', width: '60px', height: '90px',
                            background: ['#ef4444', '#3b82f6', '#22c55e', '#eab308'][i],
                            borderRadius: '8px', border: '3px solid white',
                            left: '50%', top: '50%', marginLeft: '-30px', marginTop: '-45px',
                            transformOrigin: '150px center',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '24px', fontWeight: 900, color: 'white',
                            rotate: i * 90
                        }}
                    >
                        {['7', '+2', '0', 'W'][i]}
                    </motion.div>
                ))}

                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                    style={s.logo}
                >
                    UNO
                </motion.div>
            </div>

            <motion.div 
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={s.subtitle}
            >
                SHUFFLING DECK...
            </motion.div>

            {/* Progress Bar */}
            <div style={{ width: '200px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '40px', overflow: 'hidden' }}>
                <motion.div 
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.5, ease: 'easeInOut' }}
                    style={{ height: '100%', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }}
                />
            </div>
        </motion.div>
    );
};

export default LoadingScreen;
