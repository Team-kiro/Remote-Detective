/**
 * Formulario de acusación final y su paso de confirmación.
 *
 * Reúne sospechoso, motivo, método y al menos una de las seis evidencias
 * (todas seleccionables, se hayan inspeccionado o no) y entrega un
 * `AccusationInput` al store. El componente nunca evalúa la acusación: victoria
 * o derrota las decide `submitAccusation`. Abrir el panel o cancelar la
 * confirmación no consume el único intento de la partida.
 *
 * Requisitos: 12.1-12.9, 13.6, 14.4
 */

import { useEffect, useRef, useState } from 'react';
import styles from '@/components/desktop/AccusationPanel.module.css';
import { METHOD_OPTIONS, MOTIVE_OPTIONS } from '@/data/accusationOptions';
import {
  isMethodId,
  isMotiveId,
  isSuspectId,
  type AccusationInput,
  type EvidenceId,
  type EvidenceView,
  type MethodId,
  type MotiveId,
  type SuspectId,
  type SuspectProfileView,
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
  const evidenceIds = evidence
    .map((item) => item.id)
    .filter((id) => selectedEvidence.includes(id));

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

  return (
    <section className={styles.panel} aria-labelledby="accusation-heading">
      <h2 id="accusation-heading" className={styles.title}>
        Acusación final
      </h2>
      <p className={styles.warning}>
        Solo dispones de un intento. Abrir esta pantalla o cancelar la confirmación no lo consume.
      </p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="accusation-suspect">
          Sospechoso
        </label>
        <select
          id="accusation-suspect"
          className={styles.select}
          value={suspectId ?? ''}
          disabled={accusationUsed}
          onChange={(event) => {
            const { value } = event.currentTarget;
            setSuspectId(isSuspectId(value) ? value : null);
          }}
        >
          <option value="">Sin seleccionar</option>
          {suspects.map((suspect) => (
            <option key={suspect.id} value={suspect.id}>
              {suspect.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="accusation-motive">
          Motivo
        </label>
        <select
          id="accusation-motive"
          className={styles.select}
          value={motiveId ?? ''}
          disabled={accusationUsed}
          onChange={(event) => {
            const { value } = event.currentTarget;
            setMotiveId(isMotiveId(value) ? value : null);
          }}
        >
          <option value="">Sin seleccionar</option>
          {MOTIVE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.text}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="accusation-method">
          Método
        </label>
        <select
          id="accusation-method"
          className={styles.select}
          value={methodId ?? ''}
          disabled={accusationUsed}
          onChange={(event) => {
            const { value } = event.currentTarget;
            setMethodId(isMethodId(value) ? value : null);
          }}
        >
          <option value="">Sin seleccionar</option>
          {METHOD_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.text}
            </option>
          ))}
        </select>
      </div>

      <fieldset className={styles.fieldset} disabled={accusationUsed}>
        <legend className={styles.label}>Evidencias que sustentan la acusación</legend>
        <ul className={styles.evidenceList}>
          {evidence.map((item) => (
            <li key={item.id}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  data-evidence-choice={item.id}
                  checked={selectedEvidence.includes(item.id)}
                  onChange={(event) => {
                    const isChecked = event.currentTarget.checked;
                    setSelectedEvidence((current) =>
                      isChecked
                        ? [...current, item.id]
                        : current.filter((id) => id !== item.id),
                    );
                  }}
                />
                {item.name}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

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

      {isConfirming && isSubmittable && suspectId !== null && motiveId !== null && methodId !== null ? (
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
            Acusas a {suspects.find((suspect) => suspect.id === suspectId)?.name ?? suspectId} por{' '}
            {MOTIVE_OPTIONS.find((option) => option.id === motiveId)?.text ?? motiveId}, mediante{' '}
            {METHOD_OPTIONS.find((option) => option.id === methodId)?.text ?? methodId}, con{' '}
            {evidenceIds.length} {evidenceIds.length === 1 ? 'evidencia' : 'evidencias'}. Esta
            decisión es definitiva.
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
