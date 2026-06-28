import { useParams, useNavigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const ReverseText = lazy(() => import('../games/ReverseText/ReverseText'));
const Breathing   = lazy(() => import('../games/Breathing/Breathing'));
const Grounding = lazy(() => import('../games/Grounding/Grounding'));
const Memorama = lazy(() => import('../games/Memorama/Memorama'));
const Hurricane = lazy(() => import('../games/Hurricane/Hurricane'));
const WaterCalm = lazy(() => import('../games/WaterCalm/WaterCalm'));

const gameComponents: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  reverse:   ReverseText,
  breathing: Breathing,
  grounding: Grounding,
  memory: Memorama,
  hurricane: Hurricane,
  water: WaterCalm,
};

export default function GameView() {
  const { gameName } = useParams<{ gameName: string }>();
  const navigate = useNavigate();

  if (!gameName || !gameComponents[gameName]) {
    return (
      <div className="text-center">
        <h2>Juego no encontrado</h2>
        <button onClick={() => navigate('/games')}>← Volver</button>
      </div>
    );
  }

  const GameComponent = gameComponents[gameName];

  return (
    <Suspense fallback={<div className="loader">Cargando juego...</div>}>
      <div>
        <button className="btn-secondary" onClick={() => navigate('/games')} style={{ marginBottom: 20 }}>
          ← Volver a juegos
        </button>
        <GameComponent />
      </div>
    </Suspense>
  );
}