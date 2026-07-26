/**
 * Modelos de presentación derivados de los datos narrativos congelados.
 *
 * Módulo puro: no importa React, Zustand ni servicios. Su única
 * responsabilidad es proyectar los catálogos congelados a las vistas que la UI
 * puede renderizar, omitiendo siempre `_internal`: relevancia narrativa,
 * sospechosos relacionados, contradicción que resuelve una evidencia, culpable
 * y motivo real nunca salen de la lógica del juego.
 *
 * Requisitos: 4.1-4.2, 5.1-5.4, 14.2
 */

import { CASE_FILE } from '@/data/case';
import { EVIDENCE } from '@/data/evidence';
import { LOCAL_RESPONSES } from '@/data/localResponses';
import { SUSPECTS } from '@/data/suspects';
import type {
  CaseFileView,
  EvidenceCategory,
  EvidenceDef,
  EvidenceView,
  LocalResponseDef,
  SuspectDef,
  SuspectId,
  SuspectProfileView,
} from '@/data/types';

/** Tema sugerido al jugador: etiqueta corta y la pregunta que la UI escribe. */
export interface SuggestedQuestionView {
  intent: string;
  prompt: string;
}

/** Resumen del caso mostrado en el escritorio virtual. */
export interface CaseSummaryView {
  title: string;
  victimName: string;
  victimAge: number;
  victimRole: string;
  crimeScene: string;
  approximateTime: string;
  causeOfDeath: string;
  suspectCount: number;
  evidenceCount: number;
}

/** Etiquetas visibles de las categorías de evidencia. */
export const EVIDENCE_CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  physical: 'Física',
  document: 'Documento',
  digital: 'Digital',
};

/** Proyecta un sospechoso a su perfil visible, sin metadatos internos. */
export function toSuspectProfileView(suspect: SuspectDef): SuspectProfileView {
  return {
    id: suspect.id,
    name: suspect.name,
    age: suspect.age,
    role: suspect.role,
    portrait: suspect.portrait,
    description: suspect.description,
    relationship: suspect.relationship,
    apparentMotive: suspect.apparentMotive,
  };
}

/** Proyecta una evidencia a su vista inspeccionable, sin metadatos internos. */
export function toEvidenceView(evidence: EvidenceDef): EvidenceView {
  return {
    id: evidence.id,
    name: evidence.name,
    category: evidence.category,
    description: evidence.description,
    observableInfo: evidence.observableInfo,
    image: evidence.image,
  };
}

/** Los cuatro perfiles visibles, en el orden aprobado de presentación. */
export const SUSPECT_PROFILE_VIEWS: readonly SuspectProfileView[] =
  SUSPECTS.map(toSuspectProfileView);

/** Las seis evidencias visibles, disponibles desde el inicio de la partida. */
export const EVIDENCE_VIEWS: readonly EvidenceView[] = EVIDENCE.map(toEvidenceView);

/** Expediente visible: víctima, crimen y los cuatro perfiles. */
export const CASE_FILE_VIEW: CaseFileView = {
  victimName: CASE_FILE.victimName,
  victimAge: CASE_FILE.victimAge,
  victimRole: CASE_FILE.victimRole,
  crimeScene: CASE_FILE.crimeScene,
  approximateTime: CASE_FILE.approximateTime,
  causeOfDeath: CASE_FILE.causeOfDeath,
  suspects: SUSPECT_PROFILE_VIEWS,
};

/** Resumen visible del caso para el escritorio. */
export const CASE_SUMMARY_VIEW: CaseSummaryView = {
  title: CASE_FILE.title,
  victimName: CASE_FILE.victimName,
  victimAge: CASE_FILE.victimAge,
  victimRole: CASE_FILE.victimRole,
  crimeScene: CASE_FILE.crimeScene,
  approximateTime: CASE_FILE.approximateTime,
  causeOfDeath: CASE_FILE.causeOfDeath,
  suspectCount: SUSPECT_PROFILE_VIEWS.length,
  evidenceCount: EVIDENCE_VIEWS.length,
};

/**
 * Temas sugeridos para un sospechoso.
 *
 * Son atajos de escritura, no respuestas: la pregunta viaja por la misma vía
 * que cualquier texto libre y el motor decide qué contesta el sospechoso. Su
 * razón de existir es que el jugador descubra qué se puede preguntar; cuando la
 * interrogación pase por Bedrock y admita lenguaje natural abierto, el andamio
 * puede retirarse sin tocar el motor.
 */
export function getSuggestedQuestions(suspectId: SuspectId): readonly SuggestedQuestionView[] {
  // El `as const` del catálogo hace que `prompt` no exista en las entradas sin
  // sugerencia; se lee por la interfaz común para poder consultarlo.
  const responses: readonly LocalResponseDef[] = LOCAL_RESPONSES;

  return responses.flatMap((response) =>
    response.suspectId === suspectId && response.prompt !== undefined
      ? [{ intent: response.intent, prompt: response.prompt }]
      : [],
  );
}
