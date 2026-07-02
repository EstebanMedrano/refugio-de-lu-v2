import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Howl } from 'howler';
import * as THREE from 'three';
import Campfire from './Campfire';
import ForestScene, { RIGHT_STUMP, STUMP_TOP_Y } from './ForestScene';
import type { RitualStage } from './RitualActors';
import RitualActors from './RitualActors';
import Comet from './Comet';
import CustomStars from './CustomStars';
import DogCompanions from './DogCompanions';
import { useAnxiety } from '../../context/AnxietyContext';
import './RitualFire.scss';

const BASE_FOV             = 58;
const DEFAULT_STICK_TARGET = new THREE.Vector3(0.5, 0, -7);

const CAMERA_POSES = {
  seat: {
    position: [0, 1.15, 3.2] as [number,number,number],
    lookAt:   [0, 0.6,  0]   as [number,number,number],
  },
  desk: {
    position: [RIGHT_STUMP[0] - 0.7, STUMP_TOP_Y + 0.55, RIGHT_STUMP[2] + 0.9] as [number,number,number],
    lookAt:   [RIGHT_STUMP[0], STUMP_TOP_Y + 0.1, RIGHT_STUMP[2]]               as [number,number,number],
  },
  leftStump: {
    position: [-RIGHT_STUMP[0] + 0.7, STUMP_TOP_Y + 0.55, RIGHT_STUMP[2] + 0.9] as [number,number,number],
    lookAt:   [-RIGHT_STUMP[0], STUMP_TOP_Y + 0.1, RIGHT_STUMP[2]]               as [number,number,number],
  },
};

const STAGE_CAMERA: Record<RitualStage, keyof typeof CAMERA_POSES> = {
  sitting: 'seat', approachingDesk: 'desk', grabbingLetter: 'desk',
  returningToSeat: 'seat', unfolding: 'seat', writing: 'seat',
  sealing: 'seat', placingLetter: 'leftStump', collectingLetters: 'leftStump',
  returningToBurn: 'seat', throwing: 'seat', burningFire: 'seat',
};

const D = {
  approachDesk: 1100, grab: 700, returnSeat: 1100, unfold: 650,
  seal: 900, place: 1000, collectApproach: 1000, collect: 700,
  returnBurn: 1000, throwWindup: 500, throwArc: 900,
  burnBoost: 2200, cometDelay: 250,
};

// REEMPLAZA el componente ThrowAimer completo:
function ThrowAimer({ active, onAim }: {
  active: boolean; onAim: (p: THREE.Vector3) => void;
}) {
  const { camera, gl } = useThree();
  const cbRef = useRef(onAim);
  useEffect(() => { cbRef.current = onAim; }, [onAim]);

  useEffect(() => {
    if (!active) return;

    const aim = (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      const nx   = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny   = -((clientY - rect.top) / rect.height) * 2 + 1;
      const rc   = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(nx, ny), camera);
      const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit    = new THREE.Vector3();
      if (rc.ray.intersectPlane(ground, hit) && hit.z < -1.5 && hit.length() > 2.5) {
        cbRef.current(hit.clone());
      } else {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        cbRef.current(new THREE.Vector3(
          camera.position.x + dir.x * 11, 0,
          Math.min(-2, camera.position.z + dir.z * 11),
        ));
      }
    };

    let removeListeners: (() => void) | null = null;

    // 150ms de delay: el click del botón "Lanzar palo" ya se fue cuando
    // este setTimeout corre → el canvas recibe el siguiente click del usuario
    const tid = window.setTimeout(() => {
      const onClick = (e: MouseEvent) => aim(e.clientX, e.clientY);
      const onTouch = (e: TouchEvent) => {
        const t = e.changedTouches[0];
        if (t) { e.preventDefault(); aim(t.clientX, t.clientY); }
      };
      gl.domElement.addEventListener('click',    onClick, { once: true });
      gl.domElement.addEventListener('touchend', onTouch, { once: true, passive: false });
      removeListeners = () => {
        gl.domElement.removeEventListener('click',    onClick);
        gl.domElement.removeEventListener('touchend', onTouch);
      };
    }, 150);

    return () => { window.clearTimeout(tid); removeListeners?.(); };
  }, [active, camera, gl]);

  return null;
}

function CameraRig({ stage }: { stage: RitualStage }) {
  const { camera } = useThree();
  const curPos    = useRef(new THREE.Vector3(...CAMERA_POSES.seat.position));
  const curLookAt = useRef(new THREE.Vector3(...CAMERA_POSES.seat.lookAt));
  const yaw       = useRef(0);
  const pitch     = useRef(0);

  useFrame((state) => {
    const cam    = camera as THREE.PerspectiveCamera;
    const pose   = CAMERA_POSES[STAGE_CAMERA[stage]];
    const aspect = state.size.width / state.size.height;
    const pf     = THREE.MathUtils.clamp(1 - aspect, 0, 0.85);

    const base = new THREE.Vector3(...pose.position);
    const look = new THREE.Vector3(...pose.lookAt);
    const adj  = base.clone().addScaledVector(base.clone().sub(look).normalize(), pf * 2.3);

    curPos.current.lerp(adj, 0.045);
    curLookAt.current.lerp(look, 0.045);
    camera.position.copy(curPos.current);
    cam.fov = BASE_FOV + pf * 28;
    cam.updateProjectionMatrix();

    yaw.current   = THREE.MathUtils.lerp(yaw.current,   -state.pointer.x * THREE.MathUtils.degToRad(8),  0.04);
    pitch.current = THREE.MathUtils.lerp(pitch.current,   state.pointer.y * THREE.MathUtils.degToRad(5),  0.04);

    const baseQ = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(camera.position, curLookAt.current, camera.up)
    );
    const off = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));
    camera.quaternion.copy(baseQ).multiply(off);
  });

  return null;
}

export default function RitualFire() {
  const navigate       = useNavigate();
  const { reduceLevel } = useAnxiety();

  const [stage,        setStage]        = useState<RitualStage>('sitting');
  const [letterText,   setLetterText]   = useState('');
  const [burnThrow,    setBurnThrow]    = useState(false);
  const [showComet,    setShowComet]    = useState(false);
  const [throwActive,  setThrowActive]  = useState(false);
  const [aiming,       setAiming]       = useState(false);
  const [stickTarget,  setStickTarget]  = useState(() => DEFAULT_STICK_TARGET.clone());
  const [savedLetters, setSavedLetters] = useState<number>(() =>
    parseInt(localStorage.getItem('calma_ritual_letters_count') ?? '0', 10)
  );

  const ids        = useRef<number[]>([]);
  const captureRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem('calma_ritual_letters_count', savedLetters.toString());
  }, [savedLetters]);
  useEffect(() => () => { ids.current.forEach(clearTimeout); }, []);
  useEffect(() => { if (stage === 'writing') captureRef.current?.focus(); }, [stage]);

  useEffect(() => {
    const s = new Howl({ src: ['/assets/sounds/fire-crackling.mp3'], loop: true, volume: 0.28 });
    s.play();
    return () => { s.stop(); s.unload(); };
  }, []);

  const addT = (fn: () => void, delay: number) => {
    ids.current.push(window.setTimeout(fn, delay));
  };

  const handleStartWriting = () => {
    let t = 0;
    const go = (s: RitualStage, d: number) => { addT(() => setStage(s), t); t += d; };
    go('approachingDesk', D.approachDesk);
    go('grabbingLetter',  D.grab);
    go('returningToSeat', D.returnSeat);
    go('unfolding',       D.unfold);
    addT(() => setStage('writing'), t);
  };

  const handleFinishLetter = () => {
    if (!letterText.trim()) return;
    setStage('sealing');
    addT(() => {
      setSavedLetters(n => n + 1);
      setLetterText('');
      setStage('placingLetter');
      addT(() => setStage('sitting'), D.place);
    }, D.seal);
  };

  const handleBurn = () => {
    setShowComet(false); setBurnThrow(false);
    let t = 0;
    const go = (s: RitualStage, d: number) => { addT(() => setStage(s), t); t += d; };
    go('collectingLetters', D.collectApproach + D.collect);
    go('returningToBurn',   D.returnBurn);
    go('throwing',          D.throwWindup + D.throwArc);
    addT(() => setStage('burningFire'), t);

    const throwAt = D.collectApproach + D.collect + D.returnBurn + D.throwWindup;
    addT(() => setBurnThrow(true), throwAt);

    const burnAt = throwAt + D.throwArc;
    addT(() => {
      for (let i = 0; i < Math.min(savedLetters, 3); i++) reduceLevel();
      setSavedLetters(0);
    }, burnAt + 150);
    addT(() => setShowComet(true),              burnAt + D.cometDelay);
    addT(() => { setBurnThrow(false); setStage('sitting'); }, burnAt + D.burnBoost);
  };

  const handleThrowStick = () => setAiming(true);

  const handleAim = useCallback((pos: THREE.Vector3) => {
    setStickTarget(pos);
    setThrowActive(true);
    setAiming(false);
  }, []);

  const handleThrowComplete = useCallback(() => setThrowActive(false), []);

  const GRABBED: RitualStage[] = [
    'grabbingLetter','returningToSeat','unfolding','writing','sealing','placingLetter'
  ];
  const lettersOnDesk = GRABBED.includes(stage) ? 2 : 3;

  return createPortal(
    <div className="ritual-fire-container">
      <button className="btn-secondary ritual-back-btn" onClick={() => navigate('/games')}>
        ← Volver a juegos
      </button>

      <Canvas
        className="ritual-canvas"
        style={{ cursor: aiming ? 'crosshair' : 'default' }}
        dpr={[1, 1.5]}
        camera={{ position: CAMERA_POSES.seat.position, fov: BASE_FOV, near: 0.1, far: 120 }}
      >
        <color attach="background" args={['#16284d']} />
        <fog   attach="fog"        args={['#16284d', 14, 38]} />
        <ambientLight    color="#22305c" intensity={0.28} />
        <directionalLight color="#8aa0e0" intensity={0.22} position={[4, 10, -3]} />

        <CustomStars />

        <Suspense fallback={null}>
          <ForestScene lettersOnDesk={lettersOnDesk} />
          <Campfire boost={stage === 'burningFire'} />
          <RitualActors
            stage={stage}
            letterText={letterText}
            savedLetters={savedLetters}
            burnThrow={burnThrow}
          />
          {/* ✅ FIX: Se agregó stickTarget aquí */}
          <DogCompanions
            throwActive={throwActive}
            stickTarget={stickTarget}
            onThrowComplete={handleThrowComplete}
          />
          <Comet active={showComet} />
        </Suspense>

        <ThrowAimer active={aiming} onAim={handleAim} />
        <CameraRig stage={stage} />

        <EffectComposer>
          <Bloom intensity={0.5} luminanceThreshold={0.35} luminanceSmoothing={0.25} mipmapBlur />
        </EffectComposer>
      </Canvas>

      {stage === 'writing' && (
        <textarea
          ref={captureRef}
          className="ritual-capture-input"
          value={letterText}
          onChange={e => setLetterText(e.target.value)}
          maxLength={1200}
          autoFocus
          inputMode="text"
        />
      )}

      {stage === 'sitting' && !aiming && (
        <>
          <button className="ritual-hotspot ritual-hotspot--right" onClick={handleStartWriting}>
            ✉️ Escribir carta
          </button>
          <button
            className="ritual-hotspot ritual-hotspot--center"
            onClick={handleThrowStick}
            disabled={throwActive}
          >
            🪵 Lanzar palo
          </button>
          {savedLetters > 0 && (
            <button
              className="ritual-hotspot ritual-hotspot--left ritual-hotspot--burn"
              onClick={handleBurn}
            >
              🔥 Quemar {savedLetters} carta{savedLetters > 1 ? 's' : ''}
            </button>
          )}
        </>
      )}

      {aiming && (
        <div className="ritual-aim-overlay">
          <div className="ritual-crosshair" />
          <p className="ritual-aim-hint">Toca donde quieres lanzar el palo</p>
        </div>
      )}

      {stage === 'writing' && (
        <button
          className="ritual-finish-btn"
          onClick={handleFinishLetter}
          disabled={letterText.trim() === ''}
        >
          ✉️ Terminar carta
        </button>
      )}
    </div>,
    document.body
  );
}