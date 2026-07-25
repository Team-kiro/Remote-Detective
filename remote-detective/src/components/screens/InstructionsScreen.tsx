/**
 * Sección de instrucciones accesible desde la pantalla inicial.
 *
 * Describe el objetivo, la inspección de evidencias, el interrogatorio, la
 * detección de contradicciones mediante drag-and-drop y la acusación final, y
 * ofrece una acción visible para regresar a la pantalla inicial.
 *
 * Requisitos: 2.2-2.3, 13.1
 */

import styles from '@/components/screens/InstructionsScreen.module.css';

export interface InstructionsScreenProps {
  /** Regresa a la pantalla inicial. */
  onBack: () => void;
}

export function InstructionsScreen({ onBack }: InstructionsScreenProps): React.JSX.Element {
  return (
    <main className={styles.screen} aria-labelledby="instructions-heading">
      <article className={styles.card}>
        <h1 id="instructions-heading" className={styles.title}>
          Cómo jugar
        </h1>

        <section className={styles.block} aria-labelledby="instructions-goal">
          <h2 id="instructions-goal" className={styles.blockTitle}>
            Objetivo
          </h2>
          <p>
            Eres un detective remoto y trabajas desde una computadora virtual. Debes descubrir quién
            asesinó a Marcos Linares y demostrarlo antes de que el temporizador llegue a 00:00. El
            caso se resuelve con lógica y evidencias, sin depender de la inteligencia artificial.
          </p>
        </section>

        <section className={styles.block} aria-labelledby="instructions-evidence">
          <h2 id="instructions-evidence" className={styles.blockTitle}>
            Inspeccionar evidencias
          </h2>
          <p>
            Abre el panel de evidencias desde el escritorio. Las seis evidencias están disponibles
            desde el inicio. Al seleccionar una verás su nombre, categoría, descripción y la
            información observable que puedes usar durante los interrogatorios.
          </p>
        </section>

        <section className={styles.block} aria-labelledby="instructions-interrogation">
          <h2 id="instructions-interrogation" className={styles.blockTitle}>
            Interrogar sospechosos
          </h2>
          <p>
            Llama a cualquiera de los cuatro sospechosos y escribe tus preguntas (máximo 300
            caracteres). Las respuestas relevantes quedan registradas como declaraciones y se suman
            al historial de la llamada, que se conserva entre llamadas al mismo sospechoso.
          </p>
        </section>

        <section className={styles.block} aria-labelledby="instructions-contradictions">
          <h2 id="instructions-contradictions" className={styles.blockTitle}>
            Detectar contradicciones
          </h2>
          <p>
            Arrastra una evidencia sobre una declaración registrada para confrontar al sospechoso.
            Si la combinación demuestra una mentira, ganas puntos y aumentas su presión. Una
            combinación incorrecta resta puntos, y soltar la evidencia fuera de una declaración
            cancela la acción sin evaluarla. Si acumulas suficiente presión sobre el culpable, puede
            confesar durante la llamada.
          </p>
        </section>

        <section className={styles.block} aria-labelledby="instructions-accusation">
          <h2 id="instructions-accusation" className={styles.blockTitle}>
            Acusación final
          </h2>
          <p>
            Cuando tengas tu teoría, abre la acusación final y elige culpable, motivo, método y al
            menos una evidencia. Tendrás que confirmar el envío: solo puedes acusar una vez por
            partida. Cancelar y volver al escritorio no consume el intento.
          </p>
        </section>

        <button type="button" className={styles.backAction} onClick={onBack}>
          Volver a la pantalla inicial
        </button>
      </article>
    </main>
  );
}
