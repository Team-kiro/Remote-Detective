/**
 * Puntuación visible del HUD persistente.
 *
 * Componente de presentación: recibe la puntuación ya calculada por el store y
 * no puede modificarla ni fabricarla.
 *
 * Requisitos: 3.2, 11.5
 */

import styles from '@/components/shared/ScoreDisplay.module.css';

export interface ScoreDisplayProps {
  /** Puntuación actual de la partida, calculada por el store. */
  score: number;
}

export function ScoreDisplay({ score }: ScoreDisplayProps): React.JSX.Element {
  return (
    // La puntuación solo cambia tras un acto del jugador, así que anunciarla es
    // confirmación del efecto, no ruido periódico como el reloj.
    <p className={styles.score} data-testid="hud-score" role="status" aria-live="polite">
      <span className={styles.label}>Puntuación</span>
      <span className={styles.value}>{score}</span>
    </p>
  );
}
