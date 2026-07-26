/**
 * Contenedor de la partida activa (`phase === 'active'`).
 *
 * Compone el HUD persistente (temporizador `mm:ss` y puntuación), la navegación
 * lateral diferenciada y el área principal, que cambia según `activeView`:
 * escritorio, expediente, evidencias, llamadas y acusación.
 *
 * El componente solo invoca acciones públicas del store (`openCaseFile`,
 * `openEvidence`, `openAccusation`, `submitAccusation`, `returnToDesktop`) y no
 * duplica estado global. La navegación lateral solo hace *visible* la sección
 * de llamadas sobre el escritorio; la llamada activa (`activeView === 'call'`)
 * únicamente puede establecerla `startCall` desde el selector de sospechosos.
 *
 * Requisitos: 3.1-3.3, 4.1-4.3, 5.1-5.5, 10.1-10.2, 12.1-12.9, 13.2-13.6, 20.4-20.6
 */

import { useCallback, useState } from 'react';
import { CallPanel } from '@/components/call/CallPanel';
import { AccusationPanel } from '@/components/desktop/AccusationPanel';
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
  SUSPECT_PROFILE_VIEWS,
} from '@/data/viewModels';
import { useGameStore } from '@/store/gameStore';

export function GameScreen(): React.JSX.Element {
  const activeView = useGameStore((state) => state.activeView);
  const openCaseFile = useGameStore((state) => state.openCaseFile);
  const openEvidence = useGameStore((state) => state.openEvidence);
  const openAccusation = useGameStore((state) => state.openAccusation);
  const returnToDesktop = useGameStore((state) => state.returnToDesktop);
  const submitAccusation = useGameStore((state) => state.submitAccusation);
  const accusationUsed = useGameStore((state) => state.accusationUsed);

  // La vista `call` del store exige `startCall(suspectId)`, pero la navegación
  // abre el área de llamadas antes de que haya sospechoso elegido: esta bandera
  // local solo indica que el selector está visible sobre el escritorio.
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
    panel = <CallPanel suspects={SUSPECT_PROFILE_VIEWS} evidence={EVIDENCE_VIEWS} />;
  } else if (activeView === 'casefile') {
    panel = <CaseFile caseFile={CASE_FILE_VIEW} />;
  } else if (activeView === 'evidence') {
    panel = <EvidencePanel evidence={EVIDENCE_VIEWS} />;
  } else if (activeView === 'accusation') {
    panel = (
      <AccusationPanel
        suspects={SUSPECT_PROFILE_VIEWS}
        evidence={EVIDENCE_VIEWS}
        accusationUsed={accusationUsed}
        onSubmit={submitAccusation}
        onCancel={handleReturnToDesktop}
      />
    );
  } else {
    panel = <Desktop summary={CASE_SUMMARY_VIEW} />;
  }

  return (
    <div className={styles.screen}>
      <GameHeader />
      <p className={styles.desktopNotice} data-testid="desktop-recommendation">
        Esta investigación está pensada para pantallas de 1024 px o más. En pantallas menores el
        contenido se apila y arrastrar evidencias sobre las declaraciones puede fallar: te
        recomendamos jugar desde una computadora.
      </p>
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
