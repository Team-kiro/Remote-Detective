/**
 * Pantalla inicial (`phase === 'title'`).
 *
 * Muestra el título y el subtítulo exactos aprobados, la acción de inicio de
 * partida y el acceso a la sección de instrucciones. No consulta ni duplica el
 * estado global: recibe las acciones desde `App`, que las toma del store.
 *
 * Requisitos: 2.1-2.2, 13.1
 */

import styles from '@/components/screens/TitleScreen.module.css';

export interface TitleScreenProps {
  /** Inicia la partida y el temporizador (`startGame` del store). */
  onStartGame: () => void;
  /** Abre la sección de instrucciones. */
  onOpenInstructions: () => void;
}

export function TitleScreen({
  onStartGame,
  onOpenInstructions,
}: TitleScreenProps): React.JSX.Element {
  return (
    <main className={styles.screen} aria-labelledby="title-heading">
      <section className={styles.card}>
        <p className={styles.classification}>EXPEDIENTE CONFIDENCIAL</p>
        <h1 id="title-heading" className={styles.title}>
          REMOTE DETECTIVE
        </h1>
        <p className={styles.subtitle}>Solve the case before time runs out.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryAction} onClick={onStartGame}>
            Iniciar partida
          </button>
          <button type="button" className={styles.secondaryAction} onClick={onOpenInstructions}>
            Cómo jugar
          </button>
        </div>
      </section>
    </main>
  );
}
