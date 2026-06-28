import {
  Wind, HandHeart, Brain, Waves, Tornado, Flame, SpellCheck2, Puzzle, Mail,
  Music, Volume2, BarChart3, Menu, ArrowLeft, RotateCcw, Check
} from 'lucide-react';

export const gameIcons: Record<string, React.ComponentType<any>> = {
  breathing: Wind,
  grounding: HandHeart,
  memory: Brain,
  water: Waves,
  hurricane: Tornado,
  ritual: Flame,
  reverse: SpellCheck2,
  puzzle: Puzzle,
  carta: Mail,
};

export const actionIcons = {
  music: Music,
  voice: Volume2,
  progress: BarChart3,
  menu: Menu,
  back: ArrowLeft,
  reset: RotateCcw,
  check: Check,
};