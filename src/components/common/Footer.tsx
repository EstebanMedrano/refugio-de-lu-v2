import { actionIcons } from '../../utils/icons';

export default function Footer() {
  const MusicIcon = actionIcons.music;
  const VoiceIcon = actionIcons.voice;
  const ProgressIcon = actionIcons.progress;

  return (
    <footer className="app-footer">
      <button className="footer-btn">
        <MusicIcon size={18} /> Música
      </button>
      <button className="footer-btn">
        <VoiceIcon size={18} /> Guía
      </button>
      <button className="footer-btn">
        <ProgressIcon size={18} /> Progreso
      </button>
    </footer>
  );
}