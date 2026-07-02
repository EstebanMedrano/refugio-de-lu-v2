import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAnxiety } from '../../context/AnxietyContext';
import { Howl } from 'howler';
import BedroomScene from './BedroomScene';
import './Puzzle.scss';

export type Phase = 'idle' | 'calling' | 'intro' | 'breaking' | 'puzzle' | 'complete';
export type DogType = 'tito' | 'lia';

const ALL_PUZZLES = [
  { name: 'Tu refugio',       src: '/assets/img/refugio-webp/exterior-casa.webp',    message: '🏡 Este es tu lugar seguro' },
  { name: 'Tulipanes',        src: '/assets/img/refugio-webp/jardin-tulipanes.webp', message: '🌷 Floreces con cada respiración' },
  { name: 'Noche estrellada', src: '/assets/img/refugio-webp/noche-estrellas.webp',  message: '✨ El universo conspira a tu favor' },
  { name: 'Patio',            src: '/assets/img/refugio-webp/patio-piscina.webp',    message: '🌊 Fluye con la calma del agua' },
  { name: 'Fuente mágica',    src: '/assets/img/refugio-webp/fuente-colores.webp',   message: '🌈 La magia está en ti' },
  { name: 'Interior',         src: '/assets/img/refugio-webp/interior-sala.webp',    message: '🛋️ Tu rincón de paz' },
];
const TOTAL = 16;

function subtitleFor(phase: Phase, dog: DogType, placed: number): string {
  const label = dog === 'tito' ? 'Tito 🦊' : 'Lia 🤍';
  switch (phase) {
    case 'idle':     return '¿A quién llamamos para romper el cuadro?';
    case 'calling':  return `Llamando a ${label}...`;
    case 'intro':    return `¡${label} viene corriendo!`;
    case 'breaking': return `¡${label} rompió el cuadro!`;
    case 'puzzle':   return `Arrastra las piezas · ${placed}/${TOTAL}`;
    case 'complete': return '¡Lo lograste! 🎉';
    default: return '';
  }
}

// FIX 4: sonido de snap sintetizado (sin Water Drop)
function useSynthSnap() {
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback(() => {
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(340, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) { /* silencioso */ }
  }, []);

  useEffect(() => () => { ctxRef.current?.close(); }, []);

  return play;
}

export default function Puzzle() {
  const navigate       = useNavigate();
  const { reduceLevel } = useAnxiety();
  const playSnap       = useSynthSnap();

  const puzzlesRef = useRef([...ALL_PUZZLES].sort(() => Math.random() - 0.5).slice(0, 3));

  const [phase,     setPhase]     = useState<Phase>('idle');
  const [dogType,   setDogType]   = useState<DogType>('tito');
  const [callId,    setCallId]    = useState(0);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [placed,    setPlaced]    = useState(0);
  const [message,   setMessage]   = useState('');
  const [completed, setCompleted] = useState(false);
  const [allDone,   setAllDone]   = useState(false);

  // FIX 3: phaseRef para handleImpact seguro (evita stale closure)
  const phaseRef = useRef<Phase>('idle');
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const sfx    = useRef<{ bark?: Howl; success?: Howl }>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    sfx.current = {
      bark:    new Howl({ src: ['/assets/sounds/lia-bark.mp3'],     volume: 0.32 }),
      success: new Howl({ src: ['/assets/sounds/magia-brillo.mp3'], volume: 0.28 }),
    };
    return () => {
      Object.values(sfx.current).forEach(s => s?.unload());
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const showMsg = useCallback((text: string, dur = 3000) => {
    setMessage(text);
    const t = setTimeout(() => setMessage(''), dur);
    timers.current.push(t);
  }, []);

  const callDog = (dog: DogType) => {
    setDogType(dog);
    setPhase('calling');
    const t = setTimeout(() => { setPhase('intro'); setCallId(id => id + 1); }, 700);
    timers.current.push(t);
    showMsg(`¡${dog === 'tito' ? 'Tito 🦊' : 'Lia 🤍'}, ven aquí!`, 2000);
  };

  // FIX 3: handleImpact distingue primera rotura vs re-rotura
  const handleImpact = useCallback(() => {
    const p = phaseRef.current;
    if (p === 'intro') {
      setPhase('breaking');
      sfx.current.bark?.play();
    } else if (p === 'puzzle') {
      // Re-rotura: resetea piezas y contador
      setPhase('breaking');
      setPlaced(0);
      sfx.current.bark?.play();
      showMsg('¡Volvió a romperlo! 😅', 2200);
    }
    // En cualquier otro estado (complete, etc.) no hace nada
  }, [showMsg]);

  const handleSettled  = useCallback(() => setPhase('puzzle'), []);

  const handleSnap = useCallback((count: number) => {
    setPlaced(count);
    playSnap(); // FIX 4: sin water-drop
    if (count > 0 && count % 4 === 0 && count < TOTAL) {
      const msgs = ['¡Vas increíble! 🌟', '¡Sigue así! 💪', '¡Casi lo tienes! ✨'];
      showMsg(msgs[Math.floor(Math.random() * msgs.length)]);
    }
  }, [showMsg, playSnap]);

  const handleComplete = useCallback(() => {
    reduceLevel();
    sfx.current.success?.play();
    setCompleted(true);
    setPhase('complete');
    showMsg(puzzlesRef.current[puzzleIdx]?.message ?? '', 5000);
  }, [reduceLevel, puzzleIdx, showMsg]);

  const nextPuzzle = () => {
    if (puzzleIdx >= puzzlesRef.current.length - 1) { setAllDone(true); return; }
    setPlaced(0); setCompleted(false); setMessage(''); setPhase('idle');
    setPuzzleIdx(p => p + 1);
  };

  const cur      = puzzlesRef.current[puzzleIdx];
  const progress = (placed / TOTAL) * 100;

  return createPortal(
    <div className="puzzle">
      <div className="puzzle__canvas-wrap">
        <Canvas
          shadows
          camera={{ position: [0, 1.6, 4.6], fov: 58, near: 0.1, far: 60 }}
          gl={{ antialias: true }}
          dpr={[1, 2]}
          style={{ touchAction: 'none' }}
        >
          <Suspense fallback={null}>
            <BedroomScene
              phase={phase} dogType={dogType} callId={callId}
              texture={cur.src}
              onImpact={handleImpact} onSettled={handleSettled}
              onSnap={handleSnap} onComplete={handleComplete}
            />
          </Suspense>
          <EffectComposer>
            <Bloom intensity={0.3} luminanceThreshold={0.8} luminanceSmoothing={0.2} mipmapBlur />
            <Vignette eskil={false} offset={0.22} darkness={0.45} />
          </EffectComposer>
        </Canvas>

        {/* Top bar */}
        <div className="puzzle__topbar">
          <button className="puzzle__back-btn" onClick={() => navigate('/games')}>← Volver</button>
          <div className="puzzle__title-block">
            <h2 className="puzzle__title">🧩 <span className="puzzle__gradient">Rompecabezas del Refugio</span></h2>
            <p className="puzzle__subtitle">{subtitleFor(phase, dogType, placed)}</p>
          </div>
        </div>

        {/* Selector de perro */}
        <AnimatePresence>
          {phase === 'idle' && (
            <motion.div className="puzzle__dog-select"
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:10 }}>
              <p className="puzzle__dog-select-label">¿Quién rompe el cuadro hoy?</p>
              <div className="puzzle__dog-btns">
                <button className="puzzle__call-btn puzzle__call-btn--tito" onClick={() => callDog('tito')}>🦊 Llamar a Tito</button>
                <button className="puzzle__call-btn puzzle__call-btn--lia"  onClick={() => callDog('lia')}>🤍 Llamar a Lia</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'puzzle' && (
          <div className="puzzle__hint">
            Arrastra las piezas de los costados hacia el cuadro
          </div>
        )}

        <AnimatePresence>
          {message && (
            <motion.div className="puzzle__msg" key={message}
              initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'puzzle' && (
          <div className="puzzle__progress">
            <motion.div className="puzzle__progress-fill"
              animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        )}
      </div>

      {/* Victory overlay */}
      <AnimatePresence>
        {(completed || allDone) && (
          <motion.div className="puzzle__overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <motion.div className="puzzle__victory"
              initial={{ scale:0.5, y:50 }} animate={{ scale:1, y:0 }}
              transition={{ type:'spring', stiffness:200, damping:18 }}>
              <div className="puzzle__victory-emoji">{allDone ? '🏆' : '🎉'}</div>
              <h3>{allDone ? '¡Increíble!' : '¡Lo lograste!'}</h3>
              <p>{allDone ? 'Completaste todos los rompecabezas.\nEres maravillosa 🌟' : cur.message}</p>
              <div className="puzzle__victory-actions">
                {!allDone && (
                  <button className="btn-primary" onClick={nextPuzzle}>
                    {puzzleIdx < puzzlesRef.current.length - 1 ? 'Siguiente imagen →' : 'Finalizar 🌟'}
                  </button>
                )}
                <button className="btn-secondary" onClick={() => navigate('/games')}>← Volver</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}