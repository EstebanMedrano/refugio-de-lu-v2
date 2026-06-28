import GameCarousel from './GameCarousel';
import { useNavigate } from 'react-router-dom';

const games = [
  { id: 'reverse', title: 'Texto al Revés', desc: 'Descifra frases positivas' },
  // Próximamente: breathing, grounding, memory, water, hurricane, ritual, puzzle, carta
];

export default function GamesMenu() {
  const navigate = useNavigate();

  return (
    <div className="games-view">
      <h2 className="text-center" style={{ marginBottom: '1rem' }}>¿Qué necesitas ahora?</h2>
      <GameCarousel games={games} />
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}