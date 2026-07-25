import type { StatementDef, StatementId } from '@/data/types';

/** Las únicas seis declaraciones canónicas utilizables en contradicciones. */
export const STATEMENTS = {
  stmt_daniel_arrival: {
    id: 'stmt_daniel_arrival',
    suspectId: 'daniel',
    canonicalText:
      'Llegué al edificio a las 20:50, vine con Roberto desde el estacionamiento.',
  },
  stmt_daniel_office: {
    id: 'stmt_daniel_office',
    suspectId: 'daniel',
    canonicalText:
      'No entré a la oficina de Marcos antes de la reunión. No tenía motivo para hacerlo.',
  },
  stmt_daniel_substance: {
    id: 'stmt_daniel_substance',
    suspectId: 'daniel',
    canonicalText:
      'No tengo idea de dónde salió ese veneno. Yo no manejo sustancias químicas.',
  },
  stmt_elena_arrival: {
    id: 'stmt_elena_arrival',
    suspectId: 'elena',
    canonicalText:
      'Llegué después de las nueve, cuando Marcos ya había comenzado a sentirse mal.',
  },
  stmt_roberto_knowledge: {
    id: 'stmt_roberto_knowledge',
    suspectId: 'roberto',
    canonicalText:
      'Yo no sabía nada de un desfalco. Es la primera vez que escucho sobre eso.',
  },
  stmt_sofia_witness: {
    id: 'stmt_sofia_witness',
    suspectId: 'sofia',
    canonicalText:
      'Regresé brevemente antes de la reunión, pero no vi a nadie en el edificio. Luego volví a las 20:55.',
  },
} as const satisfies Record<StatementId, StatementDef>;
