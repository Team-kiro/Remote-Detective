/**
 * Datos narrativos congelados del caso necesarios para construir prompts y
 * validar respuestas. Duplicados del frontend de forma intencionada: el backend
 * es un paquete independiente sin acceso al código React/Vite.
 *
 * Requisitos: 17.2-17.4
 */

import type { StatementId, SuspectId } from './types';

/**
 * Perfil mínimo del sospechoso necesario para construir el prompt de Bedrock.
 * Solo contiene datos aprobados: nunca incluye metadatos internos (`_internal`).
 */
export interface SuspectProfile {
  id: SuspectId;
  name: string;
  age: number;
  role: string;
  personality: string;
  relationship: string;
  alibi: string;
  /** Información que el sospechoso puede mencionar sin restricción. */
  knows: readonly string[];
  /** Información que el sospechoso desconoce y no puede mencionar. */
  doesNotKnow: readonly string[];
  /** Afirmaciones falsas que el sospechoso sostiene activamente. */
  lies: readonly string[];
  /** Identificadores de declaración que el sospechoso puede devolver. */
  allowedStatementIds: readonly StatementId[];
}

/** Perfiles aprobados de los cuatro sospechosos. */
export const SUSPECT_PROFILES: Record<SuspectId, SuspectProfile> = {
  daniel: {
    id: 'daniel',
    name: 'Daniel Rivas',
    age: 48,
    role: 'socio financiero',
    personality: 'Calculador, evasivo, tiende a minimizar y deflectar culpa',
    relationship: 'Socio desde la fundación de Linares & Asociados (15 años)',
    alibi: 'Afirma que llegó por primera vez al edificio a las 20:50 junto con Roberto.',
    knows: [
      'La existencia de la reunión, su propio acceso previo, la ubicación de la botella, el veneno que compró',
    ],
    doesNotKnow: [
      'Que Sofía lo vio salir a las 19:40; que Roberto ayudó a Marcos con la auditoría',
    ],
    lies: ['Afirma que no entró a la oficina de Marcos antes de la reunión'],
    allowedStatementIds: ['stmt_daniel_arrival', 'stmt_daniel_office', 'stmt_daniel_substance'],
  },
  elena: {
    id: 'elena',
    name: 'Elena Vargas',
    age: 45,
    role: 'socia de operaciones',
    personality: 'Directa, emocional, defensiva cuando se la presiona',
    relationship: 'Exesposa de Marcos, divorciada hace un año',
    alibi: 'Llegó al edificio a las 20:45, registrado por tarjeta de acceso.',
    knows: ['Los términos del divorcio, la disputa por acciones, la reunión urgente'],
    doesNotKnow: [
      'El desfalco de Daniel, la compra de cianuro, lo que ocurrió antes de las 20:45',
    ],
    lies: [
      'Dice que llegó después de las nueve, cuando Marcos ya se sentía mal. Miente: llegó a las 20:45 antes de que Marcos bebiera.',
    ],
    allowedStatementIds: ['stmt_elena_arrival'],
  },
  roberto: {
    id: 'roberto',
    name: 'Roberto Mendoza',
    age: 50,
    role: 'socio de tecnología',
    personality: 'Nervioso, colaborador, tiende a dar demasiada información',
    relationship: 'Amigo cercano desde la universidad, socio desde la fundación',
    alibi: 'Llegó al edificio a las 20:50. Confirmado por el registro de acceso.',
    knows: [
      'El desfalco de Daniel, los movimientos financieros sospechosos, la intención de Marcos de denunciar',
    ],
    doesNotKnow: [
      'La compra de cianuro, el acceso previo de Daniel a la oficina, lo que ocurrió antes de las 20:50',
    ],
    lies: [
      'Dice que no sabía nada sobre el desfalco. Miente: colaboró activamente en la auditoría.',
    ],
    allowedStatementIds: ['stmt_roberto_knowledge'],
  },
  sofia: {
    id: 'sofia',
    name: 'Sofía Castillo',
    age: 38,
    role: 'socia comercial',
    personality: 'Profesional, fría, medida en sus respuestas',
    relationship: 'La más reciente en unirse a la firma (2 años)',
    alibi:
      'Llegó al edificio a las 20:55 para la reunión. Confirmado por el registro de acceso.',
    knows: ['Que Daniel estuvo en el pasillo a las 19:40, la reunión urgente'],
    doesNotKnow: ['El desfalco, la compra de cianuro, qué hacía Daniel en la oficina de Marcos'],
    lies: [
      'Dice que no vio a nadie en el edificio antes de la reunión. Miente: vio a Daniel pero no quiso involucrarse.',
    ],
    allowedStatementIds: ['stmt_sofia_witness'],
  },
};
