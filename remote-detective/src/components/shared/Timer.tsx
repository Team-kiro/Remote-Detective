/**
 * Temporizador visible del HUD persistente.
 *
 * Muestra el tiempo restante en formato `mm:ss` derivado por `useTimer` del
 * `timerEndTimestamp` del store y lo resalta en rojo por debajo de dos minutos.
 * No calcula puntuación ni decide el resultado de la partida.
 *
 * Requisitos: 3.2, 10.1-10.2
 */

import styles from '@/components/shared/Timer.module.css';
import { useTimer } from '@/hooks/useTimer';

export function Timer(): React.JSX.Element {
  const { formatted, isCritical } = useTimer();

  return (
    <p
      className={isCritical ? styles.timerCritical : styles.timer}
      role="timer"
      aria-live="off"
      data-testid="hud-timer"
      data-critical={isCritical ? 'true' : 'false'}
    >
      <span className={styles.label}>Tiempo restante</span>
      <span className={styles.value}>{formatted}</span>
    </p>
  );
}
