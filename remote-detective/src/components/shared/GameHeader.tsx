/**
 * HUD persistente de la partida activa.
 *
 * Cabecera siempre visible en el escritorio, el expediente, las evidencias, la
 * llamada y la acusación: título del juego, temporizador `mm:ss` y puntuación
 * actual. Solo lee el estado del store; no lo modifica.
 *
 * Requisitos: 3.2, 10.1-10.2, 11.5
 */

import styles from '@/components/shared/GameHeader.module.css';
import { ScoreDisplay } from '@/components/shared/ScoreDisplay';
import { Timer } from '@/components/shared/Timer';
import { useGameStore } from '@/store/gameStore';

export function GameHeader(): React.JSX.Element {
  const score = useGameStore((state) => state.score);

  return (
    <header className={styles.header} aria-label="Estado de la partida">
      <h1 className={styles.brand}>REMOTE DETECTIVE</h1>
      <div className={styles.status}>
        <Timer />
        <ScoreDisplay score={score} />
      </div>
    </header>
  );
}
