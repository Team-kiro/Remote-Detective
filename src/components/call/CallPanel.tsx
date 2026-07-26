/**
 * Sistema de llamadas: selector de sospechosos, llamada activa, historial
 * persistente por sospechoso, entrada de preguntas y presentación de evidencias
 * sobre declaraciones mediante drag-and-drop.
 *
 * El componente solo lee estado y llama acciones públicas: la vista de llamada
 * se abre exclusivamente con `startCall`, `askQuestion` recibe únicamente el
 * texto de la pregunta y las declaraciones se muestran con su texto canónico
 * congelado, nunca con textos ni identificadores fabricados por la UI. El
 * arrastre solo invoca `presentEvidence(evidenceId, statementId)`: resultado,
 * presión, puntuación, penalización y confesión los decide el store.
 *
 * Requisitos: 5.1, 6.1-6.11, 7.8, 8.1-8.10, 9.1-9.3, 13.8, 14.4, 16.5
 */

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useCallback, useState } from 'react';
import styles from '@/components/call/CallPanel.module.css';
import { resolveDrop } from '@/components/call/contradictionDrop';
import { config } from '@/config';
import { STATEMENTS } from '@/data/statements';
import type {
  ContradictionFeedbackState,
  ContradictionOutcome,
  EvidenceView,
  StatementDef,
  SuspectId,
  SuspectProfileView,
} from '@/data/types';
import { MAX_QUESTION_LENGTH } from '@/logic/localResponseEngine';
import { useGameStore } from '@/store/gameStore';

export interface CallPanelProps {
  /** Los cuatro sospechosos, ya proyectados sin metadatos internos. */
  suspects: readonly SuspectProfileView[];
  /** Las seis evidencias, disponibles durante toda la llamada. */
  evidence: readonly EvidenceView[];
}

const STATEMENT_LIST: readonly StatementDef[] = Object.values(STATEMENTS);

/** Mensaje fijo de cada uno de los cuatro resultados posibles. */
const FEEDBACK_MESSAGES: Record<ContradictionOutcome, string> = {
  valid: 'Contradicción demostrada.',
  already_discovered: 'Ya habías demostrado esta contradicción.',
  related_insufficient:
    'La evidencia es relevante para este sospechoso, pero no demuestra la contradicción.',
  incorrect: 'La combinación no demuestra nada: se aplicó la penalización.',
};

export function CallPanel({ suspects, evidence }: CallPanelProps): React.JSX.Element {
  const activeCallSuspect = useGameStore((state) => state.activeCallSuspect);
  const suspectPressure = useGameStore((state) => state.suspectPressure);
  const callHistory = useGameStore((state) => state.callHistory);
  const registeredStatements = useGameStore((state) => state.registeredStatements);
  const isLoading = useGameStore((state) => state.isInterrogationLoading);
  const startCall = useGameStore((state) => state.startCall);
  const endCall = useGameStore((state) => state.endCall);
  const askQuestion = useGameStore((state) => state.askQuestion);
  const presentEvidence = useGameStore((state) => state.presentEvidence);
  const clearFeedback = useGameStore((state) => state.clearFeedback);
  const feedback = useGameStore((state) => state.lastContradictionFeedback);

  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Solo presentación: resalta las zonas de drop mientras dura el arrastre.
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const handleDragStart = useCallback((): void => {
    setIsDragging(true);
    clearFeedback();
  }, [clearFeedback]);

  const handleDragCancel = useCallback((): void => {
    setIsDragging(false);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      setIsDragging(false);
      const drop = resolveDrop(event.active.id, event.over?.id, evidence);
      if (drop === null) {
        return;
      }

      presentEvidence(drop.evidenceId, drop.statementId);
    },
    [evidence, presentEvidence],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const question = draft.trim();
      if (question.length === 0 || isLoading) {
        return;
      }

      setDraft('');
      setError(null);
      // Un fallo inesperado nunca bloquea la partida: el store ya garantiza la
      // respuesta local, así que solo se informa y la llamada continúa.
      askQuestion(question).catch(() => {
        setError('No se pudo completar la consulta. La llamada sigue abierta.');
      });
    },
    [askQuestion, draft, isLoading],
  );

  const active = suspects.find((suspect) => suspect.id === activeCallSuspect) ?? null;

  return (
    <section className={styles.panel} aria-labelledby="call-heading">
      <div className={styles.header}>
        <h2 id="call-heading" className={styles.title}>
          Sistema de llamadas
        </h2>
        {config.interrogationMode === 'local' ? (
          <span className={styles.modeBadge} data-testid="call-local-mode">
            Modo local
          </span>
        ) : null}
      </div>

      {active === null ? (
        <>
          <p className={styles.hint}>Selecciona a quién quieres llamar.</p>
          <ul className={styles.suspectList}>
            {suspects.map((suspect) => (
              <li key={suspect.id}>
                <button
                  type="button"
                  className={styles.suspectButton}
                  data-call-suspect={suspect.id}
                  onClick={() => {
                    setDraft('');
                    setError(null);
                    startCall(suspect.id);
                  }}
                >
                  <Portrait suspect={suspect} />
                  <span className={styles.suspectName}>{suspect.name}</span>
                  <span className={styles.suspectRole}>{suspect.role}</span>
                  <Pressure suspectId={suspect.id} value={suspectPressure[suspect.id]} />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <article className={styles.callHeader} data-active-call={active.id}>
            <Portrait suspect={active} />
            <div>
              <h3 className={styles.suspectName}>{active.name}</h3>
              <p className={styles.suspectRole}>{active.role}</p>
              <Pressure suspectId={active.id} value={suspectPressure[active.id]} />
            </div>
            <button type="button" className={styles.endCall} onClick={endCall}>
              Terminar llamada
            </button>
          </article>

          <section className={styles.history} aria-labelledby="call-history-heading">
            <h3 id="call-history-heading" className={styles.subtitle}>
              Historial de la llamada
            </h3>
            <ol className={styles.messageList} data-testid="call-history">
              {callHistory[active.id].map((message, index) => (
                <li
                  key={`${String(message.timestamp)}-${String(index)}`}
                  className={
                    message.role === 'player' ? styles.playerMessage : styles.suspectMessage
                  }
                  data-role={message.role}
                >
                  <span className={styles.messageAuthor}>
                    {message.role === 'player' ? 'Detective' : active.name}
                  </span>
                  <span className={styles.messageText}>{message.text}</span>
                </li>
              ))}
            </ol>
            {callHistory[active.id].length === 0 ? (
              <p className={styles.hint}>Aún no has preguntado nada a {active.name}.</p>
            ) : null}
            {isLoading ? (
              <p className={styles.loading} role="status" data-testid="call-loading">
                Esperando respuesta…
              </p>
            ) : null}
          </section>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.subtitle} htmlFor="call-question">
              Tu pregunta
            </label>
            <textarea
              id="call-question"
              className={styles.input}
              value={draft}
              maxLength={MAX_QUESTION_LENGTH}
              rows={3}
              aria-describedby="call-question-status"
              onChange={(event) => {
                setDraft(event.currentTarget.value);
              }}
            />
            <p id="call-question-status" className={styles.status} role="status">
              {draft.trim().length === 0
                ? 'Escribe una pregunta para poder enviarla.'
                : `${String(draft.length)} de ${String(MAX_QUESTION_LENGTH)} caracteres.`}
            </p>
            <button
              type="submit"
              className={styles.send}
              data-testid="call-send"
              disabled={draft.trim().length === 0 || isLoading}
            >
              {isLoading ? 'Enviando…' : 'Enviar pregunta'}
            </button>
            {error === null ? null : (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </form>

          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <section className={styles.evidenceTray} aria-labelledby="call-evidence-heading">
              <h3 id="call-evidence-heading" className={styles.subtitle}>
                Evidencias disponibles
              </h3>
              <p className={styles.hint}>
                Arrastra una evidencia sobre una declaración registrada. Con teclado: enfoca la
                evidencia, pulsa Espacio, muévete con las flechas y pulsa Espacio para soltarla.
              </p>
              <ul className={styles.evidenceList}>
                {evidence.map((item) => (
                  <li key={item.id}>
                    <DraggableEvidence evidence={item} />
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.statements} aria-labelledby="call-statements-heading">
              <h3 id="call-statements-heading" className={styles.subtitle}>
                Declaraciones registradas
              </h3>
              {registeredStatements.size === 0 ? (
                <p className={styles.hint}>
                  Todavía no hay declaraciones registradas en esta investigación.
                </p>
              ) : (
                <ul className={styles.statementList}>
                  {STATEMENT_LIST.filter((statement) => registeredStatements.has(statement.id)).map(
                    (statement) => (
                      <DroppableStatement
                        key={statement.id}
                        statement={statement}
                        author={
                          suspects.find((suspect) => suspect.id === statement.suspectId)?.name ??
                          statement.suspectId
                        }
                        isDragging={isDragging}
                      />
                    ),
                  )}
                </ul>
              )}
              {/* El aviso va al final: si apareciera encima, desplazaría las
                  zonas de drop justo después de cada intento. */}
              {feedback === null ? null : <Feedback feedback={feedback} onDismiss={clearFeedback} />}
            </section>
          </DndContext>
        </>
      )}
    </section>
  );
}

/**
 * Evidencia arrastrable. Su identificador es el `EvidenceId` congelado: la UI no
 * fabrica identificadores ni resultados, solo transporta la pareja al store.
 */
function DraggableEvidence({ evidence }: { evidence: EvidenceView }): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: evidence.id,
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      className={isDragging ? styles.evidenceChipDragging : styles.evidenceChip}
      // El transform sigue al puntero y al teclado; sin él dnd-kit desplaza la
      // página para mantener visible una evidencia que nunca se mueve.
      style={
        transform === null
          ? undefined
          : { transform: `translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0)` }
      }
      data-drag-evidence={evidence.id}
      {...listeners}
      {...attributes}
    >
      {evidence.name}
    </button>
  );
}

/** Declaración canónica registrada: único destino válido de un arrastre. */
function DroppableStatement({
  statement,
  author,
  isDragging,
}: {
  statement: StatementDef;
  author: string;
  isDragging: boolean;
}): React.JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: statement.id });

  const className = [
    styles.statementCard,
    isDragging ? styles.statementCardAvailable : null,
    isOver ? styles.statementCardOver : null,
  ]
    .filter((token) => token !== null)
    .join(' ');

  return (
    <li ref={setNodeRef} className={className} data-statement={statement.id} data-over={isOver}>
      <span className={styles.statementAuthor}>{author}</span>
      <span className={styles.statementText}>{statement.canonicalText}</span>
    </li>
  );
}

/**
 * Los cuatro resultados se distinguen por texto, color y `data-feedback`. La
 * explicación solo la aporta el store; la UI nunca la redacta.
 */
function Feedback({
  feedback,
  onDismiss,
}: {
  feedback: ContradictionFeedbackState;
  onDismiss: () => void;
}): React.JSX.Element {
  return (
    <div
      className={styles.feedback}
      data-feedback={feedback.type}
      role="status"
      aria-live="polite"
    >
      <p className={styles.feedbackMessage}>{FEEDBACK_MESSAGES[feedback.type]}</p>
      {feedback.explanation === undefined ? null : (
        <p className={styles.feedbackExplanation}>{feedback.explanation}</p>
      )}
      <button type="button" className={styles.feedbackDismiss} onClick={onDismiss}>
        Cerrar aviso
      </button>
    </div>
  );
}

function Portrait({ suspect }: { suspect: SuspectProfileView }): React.JSX.Element {
  if (suspect.portrait === null) {
    return (
      <span
        className={styles.portraitPlaceholder}
        role="img"
        aria-label={`Retrato no disponible de ${suspect.name}`}
      >
        <span aria-hidden="true">SIN RETRATO</span>
      </span>
    );
  }

  return <img className={styles.portrait} src={suspect.portrait} alt={suspect.name} />;
}

function Pressure({ suspectId, value }: { suspectId: SuspectId; value: number }): React.JSX.Element {
  return (
    <span className={styles.pressure} data-pressure={suspectId}>
      Presión: {value}%
      <progress
        className={styles.pressureBar}
        max={100}
        value={value}
        aria-label={`Presión acumulada: ${String(value)} por ciento`}
      />
    </span>
  );
}
