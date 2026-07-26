import type { CaseFileDef, CaseTimelineEntry } from '@/data/types';

/** Cronología oficial inmutable del asesinato de Marcos Linares. */
export const OFFICIAL_TIMELINE = [
  {
    time: '18:00',
    event:
      'Marcos envía correo convocando reunión urgente para las 21:00 con los 4 socios',
  },
  {
    time: '19:30',
    event:
      'Daniel entra al piso 12 y accede a la oficina de Marcos (registrado por tarjeta de acceso)',
  },
  {
    time: '19:35',
    event: 'Daniel coloca el cianuro en la botella de whisky de Marcos',
  },
  {
    time: '19:38',
    event: 'Sofía regresa brevemente al edificio para recoger su laptop',
  },
  {
    time: '19:40',
    event:
      'Daniel sale de la oficina sin la bolsa. Sofía lo ve en el pasillo.',
  },
  {
    time: '19:44',
    event: 'Sofía vuelve a salir del edificio',
  },
  {
    time: '20:45',
    event: 'Elena llega al edificio para la reunión',
  },
  {
    time: '20:50',
    event: 'Roberto llega al edificio para la reunión',
  },
  {
    time: '20:55',
    event: 'Sofía regresa al edificio para la reunión',
  },
  {
    time: '20:58',
    event: 'Daniel regresa al edificio',
  },
  {
    time: '21:00',
    event:
      'Comienza la reunión. Marcos sirve whisky de su botella personal y bebe. Los demás no beben de esa botella.',
  },
  {
    time: '21:10',
    event: 'Marcos se desploma. Los socios llaman a emergencias.',
  },
  {
    time: '21:25',
    event: 'Paramédicos declaran la muerte',
  },
  {
    time: '21:30',
    event: 'Policía precinta la escena',
  },
] as const satisfies readonly CaseTimelineEntry[];

/** Expediente oficial del caso; culpable y motivo real son metadatos internos. */
export const CASE_FILE = {
  title: 'El asesinato de Marcos Linares',
  victimName: 'Marcos Linares',
  victimAge: 52,
  victimRole: 'socio fundador de la consultora Linares & Asociados',
  crimeScene: 'Oficina privada de Marcos en el piso 12 del edificio corporativo',
  approximateTime: 'Entre las 21:00 y 21:30 del viernes 14 de marzo',
  causeOfDeath: 'Envenenamiento por cianuro disuelto en whisky',
  method:
    'El culpable vertió cianuro en la botella personal de whisky de Marcos antes de la reunión nocturna',
  timeline: OFFICIAL_TIMELINE,
  _internal: {
    culpritId: 'daniel',
    realMotive:
      'Daniel Rivas descubrió que Marcos planeaba expulsarlo de la sociedad y denunciarlo por un desfalco de 2 millones que Daniel había cometido. Daniel lo envenenó para silenciarlo.',
  },
} as const satisfies CaseFileDef;
