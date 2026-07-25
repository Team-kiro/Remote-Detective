/**
 * Escritorio virtual: vista inicial de la partida activa.
 *
 * Presenta el resumen del caso con los datos visibles del expediente y recuerda
 * las herramientas disponibles en la navegación lateral. Recibe el resumen ya
 * proyectado por los view models, de modo que ningún metadato interno
 * (culpable, motivo real, relevancia) llega al DOM.
 *
 * Requisitos: 3.1-3.3
 */

import styles from '@/components/desktop/Desktop.module.css';
import type { CaseSummaryView } from '@/data/viewModels';

export interface DesktopProps {
  /** Resumen visible del caso. */
  summary: CaseSummaryView;
}

export function Desktop({ summary }: DesktopProps): React.JSX.Element {
  return (
    <section className={styles.desktop} aria-labelledby="desktop-heading">
      <h2 id="desktop-heading" className={styles.title}>
        Escritorio
      </h2>
      <p className={styles.caseTitle}>{summary.title}</p>

      <dl className={styles.summary}>
        <div className={styles.row}>
          <dt>Víctima</dt>
          <dd>
            {summary.victimName}, {summary.victimAge} años, {summary.victimRole}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>Lugar del crimen</dt>
          <dd>{summary.crimeScene}</dd>
        </div>
        <div className={styles.row}>
          <dt>Hora aproximada</dt>
          <dd>{summary.approximateTime}</dd>
        </div>
        <div className={styles.row}>
          <dt>Causa de muerte</dt>
          <dd>{summary.causeOfDeath}</dd>
        </div>
        <div className={styles.row}>
          <dt>Sospechosos</dt>
          <dd>{summary.suspectCount}</dd>
        </div>
        <div className={styles.row}>
          <dt>Evidencias disponibles</dt>
          <dd>{summary.evidenceCount}</dd>
        </div>
      </dl>

      <p className={styles.hint}>
        Usa la navegación lateral para revisar el expediente, inspeccionar las evidencias, llamar a
        los sospechosos o presentar la acusación final.
      </p>
    </section>
  );
}
