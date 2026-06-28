// Memorama.tsx — Juego de memorama calmante para "El Refugio de Lu" v2
// Migrado desde v1/js/games/memoryGame.js
// Mejoras: animaciones 3D de volteo, efectos de match, sonido suave,
//          pausa "Respira..." en no-match, overlay de victoria con stats

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAnxiety } from '../../context/AnxietyContext';
import './Memorama.scss';

// --- Tipos ---
interface Card {
  id: number;       // identificador único por instancia (0-15)
  emoji: string;    // el emoji que muestra esta carta
  pairId: number;   // id del par (0-7) para detectar match
}

type CardState = 'hidden' | 'flipped' | 'matched';

// --- Emojis temáticos para Lu ---
// Se mantienen los originales y se añaden del refugio
const EMOJIS = ['🌿', '🌸', '🦋', '🌙', '⭐', '☁️', '🌈', '🕊️'];

// --- Fisher-Yates shuffle ---
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// --- Crear mazo inicial barajado ---
const createDeck = (): Card[] => {
  const pairs: Card[] = EMOJIS.flatMap((emoji, pairId) => [
    { id: pairId * 2,     emoji, pairId },
    { id: pairId * 2 + 1, emoji, pairId },
  ]);
  return shuffle(pairs);
};

// --- Componente principal ---
export default function Memorama() {
  const navigate = useNavigate();
  const { reduceLevel } = useAnxiety();

  // Estado del juego
  const [deck, setDeck]               = useState<Card[]>(createDeck);
  const [cardStates, setCardStates]   = useState<CardState[]>(Array(16).fill('hidden'));
  const [flipped, setFlipped]         = useState<number[]>([]);   // índices volteados actualmente
  const [moves, setMoves]             = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isLocked, setIsLocked]       = useState(false);  // bloqueo durante evaluación
  const [hint, setHint]               = useState('');     // mensaje contextual
  const [completed, setCompleted]     = useState(false);
  const [elapsedSec, setElapsedSec]   = useState(0);

  // Audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Timer ---
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Detener timer al completar
  useEffect(() => {
    if (completed && timerRef.current) clearInterval(timerRef.current);
  }, [completed]);

  // --- AudioContext lazy ---
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  };

  // Tono suave al voltear
  const playFlipTone = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch { /* AudioContext bloqueado por política del navegador */ }
  }, []);

  // Tono de match (acorde mayor)
  const playMatchTone = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      [261.6, 329.6, 392].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.06;
        gain.gain.setValueAtTime(0.07, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    } catch { /* silencioso */ }
  }, []);

  // --- Reiniciar ---
  const resetGame = useCallback(() => {
    setDeck(createDeck());
    setCardStates(Array(16).fill('hidden'));
    setFlipped([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsLocked(false);
    setHint('');
    setCompleted(false);
    setElapsedSec(0);
    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  // --- Lógica de flip ---
  const handleCardClick = useCallback((idx: number) => {
    // Ignorar si: bloqueado, ya volteada o ya encontrada
    if (isLocked) return;
    if (cardStates[idx] !== 'hidden') return;
    if (flipped.length >= 2) return;

    playFlipTone();

    // Voltear carta
    const newStates = [...cardStates];
    newStates[idx] = 'flipped';
    setCardStates(newStates);

    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      // Evaluar par
      setIsLocked(true);
      setMoves(m => m + 1);

      const [a, b] = newFlipped;
      const isMatch = deck[a].pairId === deck[b].pairId;

      if (isMatch) {
        playMatchTone();
        setHint('¡Encontraste un par! 🌟');
        setTimeout(() => {
          const matched = [...newStates];
          matched[a] = 'matched';
          matched[b] = 'matched';
          setCardStates(matched);
          setFlipped([]);
          setIsLocked(false);
          setHint('');

          const newCount = matchedPairs + 1;
          setMatchedPairs(newCount);

          if (newCount === EMOJIS.length) {
            // ¡Victoria!
            setTimeout(() => {
              setCompleted(true);
              reduceLevel();
            }, 400);
          }
        }, 600);
      } else {
        // No match — pausa "Respira..." antes de voltear
        setHint('Respira... 🌬️');
        setTimeout(() => {
          const reset = [...newStates];
          reset[a] = 'hidden';
          reset[b] = 'hidden';
          setCardStates(reset);
          setFlipped([]);
          setIsLocked(false);
          setHint('');
        }, 1000);
      }
    }
  }, [isLocked, cardStates, flipped, deck, matchedPairs, playFlipTone, playMatchTone, reduceLevel]);

  // --- Formatear tiempo ---
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- Render ---
  return (
    <div className="memorama">
      {/* Encabezado */}
      <motion.div
        className="memorama__header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="memorama__title">
          <span className="memorama__title-gradient">🎴 Memorama Calmante</span>
        </h2>
        <p className="memorama__subtitle">Encuentra los pares. Tómate tu tiempo.</p>
      </motion.div>

      {/* Estadísticas */}
      <div className="memorama__stats">
        <div className="memorama__stat">
          <span className="memorama__stat-icon">🎯</span>
          <span className="memorama__stat-label">Movimientos</span>
          <span className="memorama__stat-value">{moves}</span>
        </div>
        <div className="memorama__stat">
          <span className="memorama__stat-icon">✅</span>
          <span className="memorama__stat-label">Pares</span>
          <span className="memorama__stat-value">{matchedPairs}/{EMOJIS.length}</span>
        </div>
        <div className="memorama__stat">
          <span className="memorama__stat-icon">⏱️</span>
          <span className="memorama__stat-label">Tiempo</span>
          <span className="memorama__stat-value">{formatTime(elapsedSec)}</span>
        </div>
      </div>

      {/* Mensaje contextual (hint) */}
      <AnimatePresence>
        {hint && (
          <motion.p
            className="memorama__hint"
            key="hint"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Grid de cartas */}
      <div className="memorama__grid">
        {deck.map((card, idx) => {
          const state = cardStates[idx];
          const isFlipped = state === 'flipped' || state === 'matched';
          return (
            <motion.div
              key={`${card.id}-${idx}`}
              className={`memorama__card memorama__card--${state}`}
              onClick={() => handleCardClick(idx)}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03, duration: 0.3 }}
              whileHover={state === 'hidden' ? { scale: 1.05 } : {}}
              whileTap={state === 'hidden' ? { scale: 0.95 } : {}}
            >
              <motion.div
                className="memorama__card-inner"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Cara frontal (oculta) */}
                <div className="memorama__card-front">
                  <span className="memorama__card-question">❓</span>
                </div>
                {/* Cara trasera (emoji) */}
                <div className="memorama__card-back">
                  <span className="memorama__card-emoji">{card.emoji}</span>
                </div>
              </motion.div>

              {/* Glow en matched */}
              <AnimatePresence>
                {state === 'matched' && (
                  <motion.div
                    className="memorama__card-glow"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.3, 1] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Botones */}
      <div className="memorama__actions">
        <button className="btn-secondary" onClick={resetGame}>🔄 Reiniciar</button>
        <button className="btn-secondary" onClick={() => navigate('/games')}>← Volver</button>
      </div>

      {/* Overlay de victoria */}
      <AnimatePresence>
        {completed && (
          <motion.div
            className="memorama__victory"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="memorama__victory-card"
              initial={{ scale: 0.5, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            >
              <div className="memorama__victory-emoji">🎉</div>
              <h3 className="memorama__victory-title">¡Lo lograste!</h3>
              <p className="memorama__victory-desc">
                Completaste el memorama en<br />
                <strong>{moves} movimientos</strong> y <strong>{formatTime(elapsedSec)}</strong>
              </p>
              <div className="memorama__victory-actions">
                <button className="btn-primary" onClick={resetGame}>Jugar de nuevo</button>
                <button className="btn-secondary" onClick={() => navigate('/games')}>Volver a juegos</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}