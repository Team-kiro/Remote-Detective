/**
 * Tablero de caso de la acusación final y su paso de confirmación.
 *
 * El jugador arma la acusación con las mismas piezas que ya tocó durante la
 * partida —los retratos de los sospechosos y las evidencias del expediente— en
 * lugar de reconstruir su teoría de memoria dentro de desplegables. Reúne
 * sospechoso, motivo, método y al menos una de las seis evidencias (todas
 * seleccionables, se hayan inspeccionado o no) y entrega un `AccusationInput`
 * al store. El componente nunca evalúa la acusación: victoria o derrota las
 * decide `submitAccusation`. Abrir el panel o cancelar la confirmación no
 * consume el único intento de la partida.
 *
 * Requisitos: 12.1-12.9, 13.6, 14.4
 */

import { useEffect, useRef, useState } from 'react';
import styles from '@/components/desktop/AccusationPanel.module.css';
import { METHOD_OPTIONS, MOTIVE_OPTIONS } from '@/data/accusationOptions';
import type {
  AccusationInput,
  EvidenceId,
  EvidenceView,
  MethodId,
  MotiveId,
  SuspectId,
  SuspectProfileView,
} from '@/data/types';

export interface AccusationPanelProps {
  /** Los cuatro sospechosos, ya proyectados sin metadatos internos. */
  suspects: readonly SuspectProfileView[];
  /** Las seis evidencias, todas seleccionables desde el inicio. */
  evidence: readonly EvidenceView[];
  /** El intento único ya se consumió: no se admiten nuevos envíos. */
  accusationUsed: boolean;
  /** Entrega la acusación confirmada al store. */
  onSubmit: (accusation: AccusationInput) => void;
  /** Cancelar la confirmación devuelve al escritorio sin consumir el intento. */
  onCancel: () => void;
}

/** Hueco en el resumen mientras una pieza del caso sigue sin elegirse. */
const PENDING = '⸺';

export function AccusationPanel({
  suspects,
  evidence,
  accusationUsed,
  onSubmit,
  onCancel,
}: AccusationPanelProps): React.JSX.Element {
  const [suspectId, setSuspectId] = useState<SuspectId | null>(null);
  const [motiveId, setMotiveId] = useState<MotiveId | null>(null);
  const [methodId, setMethodId] = useState<MethodId | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<readonly EvidenceId[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // `showModal` es lo que aporta el scrim, la trampa de foco y el cierre con
  // Escape: replicarlos a mano sería reescribir el diálogo nativo peor.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) {
      dialog.showModal();
    }
  }, [isConfirming]);

  // Se conserva el orden del catálogo, no el de marcado del jugador.
  const evidenceIds = evidence.map((item) => item.id).filter((id) => selectedEvidence.includes(id));

  const suspectName = suspects.find((suspect) => suspect.id === suspectId)?.name ?? null;
  const motiveText = MOTIVE_OPTIONS.find((option) => option.id === motiveId)?.text ?? null;
  const methodText = METHOD_OPTIONS.find((option) => option.id === methodId)?.text ?? null;

  const missingFields: string[] = [];
  if (suspectId === null) {
    missingFields.push('sospechoso');
  }
  if (motiveId === null) {
    missingFields.push('motivo');
  }
  if (methodId === null) {
    missingFields.push('método');
  }
  if (evidenceIds.length === 0) {
    missingFields.push('al menos una evidencia');
  }

  const isSubmittable = missingFields.length === 0 && !accusationUsed;

  let statusText: string;
  if (accusationUsed) {
    statusText = 'Ya presentaste la única acusación de esta partida.';
  } else if (missingFields.length > 0) {
    statusText = `Faltan campos por completar: ${missingFields.join(', ')}.`;
  } else {
    statusText = 'Acusación completa. Revisa la confirmación antes de enviarla.';
  }

  const evidenceCount = `${String(evidenceIds.length)} ${
    evidenceIds.length === 1 ? 'evidencia' : 'evidencias'
  }`;

  return (
    <section className={styles.panel} aria-labelledby="accusation-heading">
      <h2 id="accusation-heading" className={styles.title}>
        Acusación final
      </h2>
      <p className={styles.warning}>
        Solo dispones de un intento. Abrir esta pantalla o cancelar la confirmación no lo consume.
      </p>

      <div className={styles.board}>
        <fieldset className={styles.group} disabled={accusationUsed}>
          <legend className={styles.legend}>Sospechoso</legend>
          <div className={styles.suspectGrid}>
            {suspects.map((suspect) => (
              <label key={suspect.id} className={styles.suspectCard}>
                <input
                  className={styles.choiceInput}
                  type="radio"
                  name="accusation-suspect"
                  data-suspect-choice={suspect.id}
                  checked={suspectId === suspect.id}
                  onChange={() => {
                    setSuspectId(suspect.id);
                  }}
                />
                <Portrait suspect={suspect} />
                <span className={styles.suspectName}>{suspect.name}</span>
                <span className={styles.suspectRole}>{suspect.role}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.reasons}>
          <fieldset className={styles.group} disabled={accusationUsed}>
            <legend className={styles.legend}>Motivo</legend>
            <div className={styles.optionList}>
              {MOTIVE_OPTIONS.map((option) => (
                <label key={option.id} className={styles.optionCard}>
                  <input
                    className={styles.choiceInput}
                    type="radio"
                    name="accusation-motive"
                    data-motive-choice={option.id}
                    checked={motiveId === option.id}
                    onChange={() => {
                      setMotiveId(option.id);
                    }}
                  />
                  {option.text}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.group} disabled={accusationUsed}>
            <legend className={styles.legend}>Método</legend>
            <div className={styles.optionList}>
              {METHOD_OPTIONS.map((option) => (
                <label key={option.id} className={styles.optionCard}>
                  <input
                    className={styles.choiceInput}
                    type="radio"
                    name="accusation-method"
                    data-method-choice={option.id}
                    checked={methodId === option.id}
                    onChange={() => {
                      setMethodId(option.id);
                    }}
                  />
                  {option.text}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <fieldset className={styles.group} disabled={accusationUsed}>
        <legend className={styles.legend}>Evidencias que sustentan la acusación</legend>
        <div className={styles.evidenceGrid}>
          {evidence.map((item) => (
            <label key={item.id} className={styles.evidenceCard}>
              <input
                className={styles.choiceInput}
                type="checkbox"
                data-evidence-choice={item.id}
                checked={selectedEvidence.includes(item.id)}
                onChange={(event) => {
                  const isChecked = event.currentTarget.checked;
                  setSelectedEvidence((current) =>
                    isChecked ? [...current, item.id] : current.filter((id) => id !== item.id),
                  );
                }}
              />
              <Thumbnail item={item} />
              <span className={styles.evidenceName}>{item.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/*
        El caso se lee mientras se arma: el jugador ve la frase que va a firmar
        en lugar de reconstruirla de memoria al pulsar el botón.
      */}
      <p className={styles.summary} data-testid="accusation-summary">
        Acuso a <strong>{suspectName ?? PENDING}</strong> por{' '}
        <strong>{motiveText ?? PENDING}</strong>, mediante <strong>{methodText ?? PENDING}</strong>,
        con <strong>{evidenceCount}</strong>.
      </p>

      <p id="accusation-status" className={styles.status} role="status">
        {statusText}
      </p>

      <button
        type="button"
        className={styles.submit}
        data-testid="accusation-submit"
        disabled={!isSubmittable}
        aria-describedby="accusation-status"
        onClick={() => {
          setIsConfirming(true);
        }}
      >
        Presentar acusación
      </button>

      {isConfirming &&
      isSubmittable &&
      suspectId !== null &&
      motiveId !== null &&
      methodId !== null ? (
        <dialog
          ref={dialogRef}
          className={styles.dialog}
          aria-labelledby="accusation-confirm-heading"
          aria-describedby="accusation-confirm-description"
          data-testid="accusation-confirm"
          onClose={() => {
            setIsConfirming(false);
          }}
        >
          <h3 id="accusation-confirm-heading" className={styles.dialogTitle}>
            Confirmar acusación
          </h3>
          <p id="accusation-confirm-description" className={styles.dialogText}>
            Acusas a {suspectName ?? suspectId} por {motiveText ?? motiveId}, mediante{' '}
            {methodText ?? methodId}, con {evidenceCount}. Esta decisión es definitiva.
          </p>

          <div className={styles.dialogActions}>
            <button
              type="button"
              className={styles.submit}
              data-testid="accusation-confirm-submit"
              onClick={() => {
                setIsConfirming(false);
                onSubmit({ suspectId, motiveId, methodId, evidenceIds });
              }}
            >
              Confirmar acusación
            </button>
            <button
              type="button"
              className={styles.cancel}
              data-testid="accusation-cancel"
              onClick={() => {
                setIsConfirming(false);
                onCancel();
              }}
            >
              Cancelar y volver al escritorio
            </button>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}

/** Retrato de la ficha; el hueco mantiene la rejilla cuando falta la imagen. */
function Portrait({ suspect }: { suspect: SuspectProfileView }): React.JSX.Element {
  if (suspect.portrait === null) {
    return (
      <span className={styles.portraitPlaceholder} aria-hidden="true">
        SIN RETRATO
      </span>
    );
  }

  return (
    <img className={styles.portrait} src={suspect.portrait} alt="" loading="lazy" decoding="async" />
  );
}

/** Miniatura de la evidencia; decorativa, el nombre ya está en la etiqueta. */
function Thumbnail({ item }: { item: EvidenceView }): React.JSX.Element {
  if (item.image === null) {
    return <span className={styles.thumbnailPlaceholder} aria-hidden="true" />;
  }

  return <img className={styles.thumbnail} src={item.image} alt="" loading="lazy" decoding="async" />;
}
