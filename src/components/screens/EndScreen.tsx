/**
 * Pantalla de fin de partida para las cuatro fases terminales.
 *
 * Muestra el resultado, el tipo de victoria o derrota, la puntuación final ya
 * calculada por el store y la acción de reinicio. La pantalla no calcula ni
 * puede fabricar resultado ni puntuación: recibe la fase terminal y el score
 * del store mediante props.
 *
 * Requisitos: 11.5, 13.1, 13.9-13.11
 */

import styles from '@/components/screens/EndScreen.module.css';
import type { EndGamePhase } from '@/data/types';

/** Textos aprobados por fase terminal; no contienen lógica de juego. */
interface EndScreenCopy {
  outcome: 'Victoria' | 'Derrota';
  heading: string;
  detail: string;
}

const END_SCREEN_COPY: Record<EndGamePhase, EndScreenCopy> = {
  victory_accusation: {
    outcome: 'Victoria',
    heading: 'Victoria por acusación correcta',
    detail:
      'Tu acusación final señaló al culpable, el motivo, el método y las evidencias que sostienen el caso.',
  },
  victory_confession: {
    outcome: 'Victoria',
    heading: 'Victoria por confesión',
    detail:
      'La presión de las contradicciones obligó a Daniel Rivas a admitir el asesinato de Marcos Linares.',
  },
  defeat_time: {
    outcome: 'Derrota',
    heading: 'Derrota por tiempo agotado',
    detail: 'El temporizador llegó a 00:00 antes de que pudieras cerrar el caso.',
  },
  defeat_accusation: {
    outcome: 'Derrota',
    heading: 'Derrota por acusación incorrecta',
    detail:
      'La acusación confirmada no coincide con la solución del caso, y solo se permite un intento por partida. La puntuación conserva lo que sí acertaste.',
  },
};

export interface EndScreenProps {
  /** Fase terminal alcanzada por la partida. */
  phase: EndGamePhase;
  /** Puntuación final calculada por el store al finalizar. */
  score: number;
  /** Reinicia la partida (`resetGame` del store). */
  onRestart: () => void;
}

export function EndScreen({ phase, score, onRestart }: EndScreenProps): React.JSX.Element {
  const copy = END_SCREEN_COPY[phase];
  const isVictory = copy.outcome === 'Victoria';

  return (
    <main className={styles.screen} aria-labelledby="end-heading">
      <section className={styles.card} data-phase={phase}>
        <p className={isVictory ? styles.outcomeVictory : styles.outcomeDefeat}>{copy.outcome}</p>
        <h1 id="end-heading" className={styles.title}>
          {copy.heading}
        </h1>
        <p className={styles.detail}>{copy.detail}</p>
        <p className={styles.score} data-testid="final-score">
          Puntuación final: <strong>{score}</strong>
        </p>
        <button type="button" className={styles.restartAction} onClick={onRestart}>
          Reiniciar partida
        </button>
      </section>
    </main>
  );
}
