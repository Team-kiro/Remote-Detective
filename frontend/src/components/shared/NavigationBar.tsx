/**
 * Navegación lateral de la partida activa.
 *
 * Ofrece accesos diferenciados al expediente, las evidencias, el sistema de
 * llamadas y la acusación final, además del retorno al escritorio virtual desde
 * cualquier vista. El componente no navega por sí mismo: informa del destino
 * elegido y `GameScreen` invoca la acción pública del store correspondiente.
 *
 * Requisitos: 3.1, 3.3, 4.3, 5.5, 13.2-13.6
 */

import styles from '@/components/shared/NavigationBar.module.css';
import type { ActiveView } from '@/data/types';

/** Etiquetas y descripciones accesibles de cada destino navegable. */
const NAVIGATION_ITEMS: readonly { view: ActiveView; icon: string; label: string }[] = [
  { view: 'desktop', icon: '🗄️', label: 'Escritorio' },
  { view: 'casefile', icon: '📁', label: 'Expediente' },
  { view: 'evidence', icon: '🔍', label: 'Evidencias' },
  { view: 'call', icon: '📞', label: 'Llamar' },
  { view: 'accusation', icon: '⚖️', label: 'Acusar' },
];

export interface NavigationBarProps {
  /** Sección visible actualmente en el área principal. */
  currentSection: ActiveView;
  /** Solicita abrir una sección de la partida activa. */
  onNavigate: (target: ActiveView) => void;
}

export function NavigationBar({
  currentSection,
  onNavigate,
}: NavigationBarProps): React.JSX.Element {
  return (
    <nav className={styles.nav} aria-label="Navegación de la partida">
      <ul className={styles.list}>
        {NAVIGATION_ITEMS.map((item) => {
          const isActive = item.view === currentSection;

          return (
            <li key={item.view}>
              <button
                type="button"
                className={isActive ? styles.itemActive : styles.item}
                aria-current={isActive ? 'page' : undefined}
                data-view={item.view}
                onClick={() => {
                  onNavigate(item.view);
                }}
              >
                <span className={styles.icon} aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
