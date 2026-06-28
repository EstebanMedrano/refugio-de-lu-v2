import { useParams, useNavigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const ReverseText = lazy(() => import('../games/ReverseText/ReverseText'));

const gameComponents: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  reverse: ReverseText,
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