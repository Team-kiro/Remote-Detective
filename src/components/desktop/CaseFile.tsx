/**
 * Expediente del caso.
 *
 * Muestra los datos visibles de la víctima y del crimen junto con los cuatro
 * perfiles de sospechoso: nombre, descripción, relación con la víctima y motivo
 * atribuido. Recibe un `CaseFileView`, así que los metadatos internos
 * (verdades, mentiras, secretos, culpable) nunca llegan al DOM.
 *
 * Requisitos: 4.1-4.2
 */

import styles from '@/components/desktop/CaseFile.module.css';
import type { CaseFileView } from '@/data/types';

export interface CaseFileProps {
  /** Expediente visible del caso, ya proyectado sin metadatos internos. */
  caseFile: CaseFileView;
}

export function CaseFile({ caseFile }: CaseFileProps): React.JSX.Element {
  return (
    <section className={styles.casefile} aria-labelledby="casefile-heading">
      <h2 id="casefile-heading" className={styles.title}>
        Expediente del caso
      </h2>

      <dl className={styles.summary}>
        <div className={styles.row}>
          <dt>Víctima</dt>
          <dd>
            {caseFile.victimName}, {caseFile.victimAge} años, {caseFile.victimRole}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Causa de muerte</dt>
          <dd>{caseFile.causeOfDeath}</dd>
        </div>
        <div className={styles.row}>
          <dt>Lugar del crimen</dt>
          <dd>{caseFile.crimeScene}</dd>
        </div>
        <div className={styles.row}>
          <dt>Hora aproximada</dt>
          <dd>{caseFile.approximateTime}</dd>
        </div>
      </dl>

      <h3 id="casefile-suspects" className={styles.subtitle}>
        Sospechosos
      </h3>
      <ul className={styles.suspects} aria-labelledby="casefile-suspects">
        {caseFile.suspects.map((suspect) => (
          <li key={suspect.id}>
            <article className={styles.suspect} data-suspect={suspect.id}>
              {suspect.portrait === null ? (
                <div
                  className={styles.portraitPlaceholder}
                  role="img"
                  aria-label={`Retrato no disponible de ${suspect.name}`}
                >
                  <span aria-hidden="true">SIN RETRATO</span>
                </div>
              ) : (
                <img
                  className={styles.portrait}
                  src={suspect.portrait}
                  alt={`Retrato de ${suspect.name}`}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <div className={styles.suspectBody}>
                <h4 className={styles.suspectName}>{suspect.name}</h4>
                <p className={styles.suspectDescription}>{suspect.description}</p>
                <dl className={styles.suspectData}>
                  <div className={styles.row}>
                    <dt>Relación con la víctima</dt>
                    <dd>{suspect.relationship}</dd>
                  </div>
                  <div className={styles.row}>
                    <dt>Motivo atribuido</dt>
                    <dd>{suspect.apparentMotive}</dd>
                  </div>
                </dl>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
