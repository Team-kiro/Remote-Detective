/**
 * Composición principal según la fase del store.
 *
 * `App` es la única pieza que decide qué pantalla se muestra: pantalla inicial,
 * instrucciones, partida activa o fin de partida. Lee `phase` y `score` del
 * store y entrega sus acciones públicas (`startGame`, `resetGame`) a las
 * pantallas: no duplica estado global, no introduce acciones nuevas y no puede
 * fabricar resultado, puntuación ni feedback.
 *
 * La apertura de instrucciones es estado local de presentación sobre la
 * pantalla inicial, de modo que no se añade ninguna acción al store. La fase
 * `instructions` del dominio se compone con la misma pantalla.
 *
 * Requisitos: 2.1-2.5, 13.1, 13.9-13.11
 */

import { useCallback, useState } from 'react';
import styles from '@/App.module.css';
import { EndScreen } from '@/components/screens/EndScreen';
import { GameScreen } from '@/components/screens/GameScreen';
import { InstructionsScreen } from '@/components/screens/InstructionsScreen';
import { TitleScreen } from '@/components/screens/TitleScreen';
import { useGameStore } from '@/store/gameStore';

export function App(): React.JSX.Element {
  const phase = useGameStore((state) => state.phase);
  const score = useGameStore((state) => state.score);
  const startGame = useGameStore((state) => state.startGame);
  const resetGame = useGameStore((state) => state.resetGame);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  const openInstructions = useCallback((): void => {
    setIsInstructionsOpen(true);
  }, []);

  const closeInstructions = useCallback((): void => {
    setIsInstructionsOpen(false);
  }, []);

  const handleStartGame = useCallback((): void => {
    setIsInstructionsOpen(false);
    startGame();
  }, [startGame]);

  const handleRestart = useCallback((): void => {
    setIsInstructionsOpen(false);
    resetGame();
  }, [resetGame]);

  let screen: React.JSX.Element;
  if (phase === 'active') {
    screen = <GameScreen />;
  } else if (phase === 'title' || phase === 'instructions') {
    screen =
      phase === 'instructions' || isInstructionsOpen ? (
        <InstructionsScreen onBack={closeInstructions} />
      ) : (
        <TitleScreen onStartGame={handleStartGame} onOpenInstructions={openInstructions} />
      );
  } else {
    screen = <EndScreen phase={phase} score={score} onRestart={handleRestart} />;
  }

  return <div className={styles.app}>{screen}</div>;
}
