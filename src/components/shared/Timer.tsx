/**
 * Temporizador visible del HUD persistente.
 *
 * Muestra el tiempo restante en formato `mm:ss` derivado por `useTimer` del
 * `timerEndTimestamp` del store y escala su énfasis en tres niveles. No calcula
 * puntuación ni decide el resultado de la partida.
 *
 * Requisitos: 3.2, 10.1-10.2
 */

import styles from '@/components/shared/Timer.module.css';
import { useTimer, type TimerLevel } from '@/hooks/useTimer';

const LEVEL_CLASS: Record<TimerLevel, string | undefined> = {
  calm: styles.timer,
  caution: styles.timerCaution,
  critical: styles.timerCritical,
};

export function Timer(): React.JSX.Element {
  const { formatted, isCritical, level, announcement } = useTimer();

  return (
    <>
      <p
        className={LEVEL_CLASS[level]}
        role="timer"
        aria-live="off"
        data-testid="hud-timer"
        data-level={level}
        data-critical={isCritical ? 'true' : 'false'}
      >
        <span className={styles.label}>Tiempo restante</span>
        <span className={styles.value}>{formatted}</span>
      </p>
      {/*
        El `mm:ss` no puede ser una región viva sin volverse ruido continuo: el
        aviso solo cambia al cruzar un umbral, así que se anuncia dos veces.
      */}
      <span className="sr-only" role="status">
        {announcement}
      </span>
    </>
  );
}
