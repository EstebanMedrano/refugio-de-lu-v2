import GameCarousel from './GameCarousel';
import { useNavigate } from 'react-router-dom';

const games = [
  {
    id: 'reverse',
    title: 'Texto al Revés',
    desc: 'Descifra frases positivas',
    image: '/assets/img/games/reverse.webp',
    accentColor: '#06b6d4',
  },
  {
    id: 'breathing',
    title: 'Respiración 4-7-8',
    desc: 'Sigue el ritmo del círculo',
    image: '/assets/img/games/breathing.webp',
    accentColor: '#10b981',
  },
  { id: 'grounding', 
    title: 'Grounding 5-4-3-2-1', 
    desc: 'Vuelve al presente', 
    accentColor: '#10b981' 
  },
  { id: 'memory', 
    title: 'Memorama Calmante', 
    desc: 'Encuentra los pares, calma tu mente', 
    accentColor: '#a78bfa' 
  },
  { id: 'hurricane', 
    title: 'Huracán de Pensamientos', 
    desc: 'Destruye lo que te pesa', 
    accentColor: '#ef4444' 
  },
  { id: 'water', 
    title: 'Lago de Calma', 
    desc: 'Crea ondas y escapa de los perritos', 
    accentColor: '#3b82f6' 
  },
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