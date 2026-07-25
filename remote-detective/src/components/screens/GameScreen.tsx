/**
 * Contenedor de la partida activa (`phase === 'active'`).
 *
 * Compone el HUD persistente (temporizador `mm:ss` y puntuación), la navegación
 * lateral diferenciada y el área principal, que cambia según `activeView`:
 * escritorio, expediente y evidencias quedan implementados aquí, mientras que
 * las áreas de llamada y de acusación quedan conectadas para las tareas 4.3-4.5.
 *
 * El componente solo invoca acciones públicas del store (`openCaseFile`,
 * `openEvidence`, `openAccusation`, `returnToDesktop`) y no duplica estado
 * global: la vista `call` únicamente puede abrirse mediante `startCall`, que
 * pertenece al panel de llamadas de la tarea 4.4.
 *
 * Requisitos: 3.1-3.3, 4.1-4.3, 5.1-5.5, 10.1-10.2, 13.2-13.6
 */

import { useCallback, useState } from 'react';
import { CaseFile } from '@/components/desktop/CaseFile';
import { Desktop } from '@/components/desktop/Desktop';
import { EvidencePanel } from '@/components/desktop/EvidencePanel';
import styles from '@/components/screens/GameScreen.module.css';
import { GameHeader } from '@/components/shared/GameHeader';
import { NavigationBar } from '@/components/shared/NavigationBar';
import type { ActiveView } from '@/data/types';
import {
  CASE_FILE_VIEW,
  CASE_SUMMARY_VIEW,
  EVIDENCE_VIEWS,
} from '@/data/viewModels';
import { useGameStore } from '@/store/gameStore';

export function GameScreen(): React.JSX.Element {
  const activeView = useGameStore((state) => state.activeView);
  const openCaseFile = useGameStore((state) => state.openCaseFile);
  const openEvidence = useGameStore((state) => state.openEvidence);
  const openAccusation = useGameStore((state) => state.openAccusation);
  const returnToDesktop = useGameStore((state) => state.returnToDesktop);

  // El sistema de llamadas se abre desde la navegación, pero la vista `call`
  // del store exige `startCall(suspectId)`. Hasta que la tarea 4.4 monte el
  // selector de sospechosos, esta bandera local solo indica que el área de
  // llamadas está visible sobre el escritorio.
  const [isCallAreaOpen, setIsCallAreaOpen] = useState(false);

  const handleNavigate = useCallback(
    (target: ActiveView): void => {
      if (target === 'call') {
        setIsCallAreaOpen(true);
        if (activeView !== 'call') {
          returnToDesktop();
        }
        return;
      }

      setIsCallAreaOpen(false);
      if (target === 'casefile') {
        openCaseFile();
        return;
      }
      if (target === 'evidence') {
        openEvidence();
        return;
      }
      if (target === 'accusation') {
        openAccusation();
        return;
      }

      returnToDesktop();
    },
    [activeView, openAccusation, openCaseFile, openEvidence, returnToDesktop],
  );

  const handleReturnToDesktop = useCallback((): void => {
    setIsCallAreaOpen(false);
    returnToDesktop();
  }, [returnToDesktop]);

  const isCallSection = activeView === 'call' || (activeView === 'desktop' && isCallAreaOpen);
  const currentSection: ActiveView = isCallSection ? 'call' : activeView;

  let panel: React.JSX.Element;
  if (isCallSection) {
    // Área conectada para la tarea 4.4 (panel de llamadas e interrogatorio).
    panel = (
      <section className={styles.pending} aria-labelledby="call-heading">
        <h2 id="call-heading" className={styles.pendingTitle}>
          Sistema de llamadas
        </h2>
        <p className={styles.pendingText}>
          El selector de sospechosos y el interrogatorio se habilitan en la siguiente entrega.
        </p>
      </section>
    );
  } else if (activeView === 'casefile') {
    panel = <CaseFile caseFile={CASE_FILE_VIEW} />;
  } else if (activeView === 'evidence') {
    panel = <EvidencePanel evidence={EVIDENCE_VIEWS} />;
  } else if (activeView === 'accusation') {
    // Área conectada para la tarea 4.3 (formulario y confirmación).
    panel = (
      <section className={styles.pending} aria-labelledby="accusation-heading">
        <h2 id="accusation-heading" className={styles.pendingTitle}>
          Acusación final
        </h2>
        <p className={styles.pendingText}>
          El formulario de acusación se habilita en la siguiente entrega. Volver al escritorio no
          consume el intento.
        </p>
      </section>
    );
  } else {
    panel = <Desktop summary={CASE_SUMMARY_VIEW} />;
  }

  return (
    <div className={styles.screen}>
      <GameHeader />
      <div className={styles.body}>
        <NavigationBar currentSection={currentSection} onNavigate={handleNavigate} />
        <main className={styles.panel} aria-label="Panel activo de la partida">
          {currentSection === 'desktop' ? null : (
            <button type="button" className={styles.backAction} onClick={handleReturnToDesktop}>
              Volver al escritorio
            </button>
          )}
          {panel}
        </main>
      </div>
    </div>
  );
}
