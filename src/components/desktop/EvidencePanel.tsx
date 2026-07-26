/**
 * Panel de evidencias: lista completa y detalle de la evidencia seleccionada.
 *
 * Las seis evidencias están disponibles desde el inicio. El detalle muestra
 * únicamente nombre, imagen o placeholder accesible, categoría, descripción e
 * información observable: la relevancia narrativa, los sospechosos relacionados
 * y la contradicción que resuelve una evidencia son metadatos internos que el
 * view model ya omite.
 *
 * Requisitos: 5.1-5.4
 */

import { useState } from 'react';
import styles from '@/components/desktop/EvidencePanel.module.css';
import type { EvidenceId, EvidenceView } from '@/data/types';
import { EVIDENCE_CATEGORY_LABELS } from '@/data/viewModels';

export interface EvidencePanelProps {
  /** Las seis evidencias visibles, ya proyectadas sin metadatos internos. */
  evidence: readonly EvidenceView[];
}

export function EvidencePanel({ evidence }: EvidencePanelProps): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<EvidenceId | null>(null);
  const selected = evidence.find((item) => item.id === selectedId) ?? null;

  return (
    <section className={styles.panel} aria-labelledby="evidence-heading">
      <h2 id="evidence-heading" className={styles.title}>
        Evidencias
      </h2>

      <div className={styles.layout}>
        <div>
          <h3 id="evidence-list-heading" className={styles.subtitle}>
            Listado
          </h3>
          <ul className={styles.list} aria-labelledby="evidence-list-heading">
            {evidence.map((item) => {
              const isSelected = item.id === selectedId;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={isSelected ? styles.itemSelected : styles.item}
                    aria-pressed={isSelected}
                    data-evidence={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                    }}
                  >
                    <span className={styles.itemName}>{item.name}</span>
                    <span className={styles.itemCategory}>
                      {EVIDENCE_CATEGORY_LABELS[item.category]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <section className={styles.detail} aria-labelledby="evidence-detail-heading">
          <h3 id="evidence-detail-heading" className={styles.subtitle}>
            Detalle
          </h3>
          {selected === null ? (
            <p className={styles.empty}>Selecciona una evidencia para inspeccionarla.</p>
          ) : (
            <article className={styles.detailCard} data-selected-evidence={selected.id}>
              {selected.image === null ? (
                <div
                  className={styles.imagePlaceholder}
                  role="img"
                  aria-label={`Imagen no disponible de ${selected.name}`}
                >
                  <span aria-hidden="true">SIN IMAGEN</span>
                </div>
              ) : (
                <img
                  className={styles.image}
                  src={selected.image}
                  alt={selected.name}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <h4 className={styles.detailName}>{selected.name}</h4>
              <dl className={styles.detailData}>
                <div className={styles.row}>
                  <dt>Categoría</dt>
                  <dd>{EVIDENCE_CATEGORY_LABELS[selected.category]}</dd>
                </div>
                <div className={styles.row}>
                  <dt>Descripción</dt>
                  <dd>{selected.description}</dd>
                </div>
                <div className={styles.row}>
                  <dt>Información observable</dt>
                  <dd>{selected.observableInfo}</dd>
                </div>
              </dl>
            </article>
          )}
        </section>
      </div>
    </section>
  );
}
