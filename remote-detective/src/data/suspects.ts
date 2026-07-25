import type { SuspectDef } from '@/data/types';

/** Los cuatro perfiles aprobados del caso, en orden de presentación. */
export const SUSPECTS = [
  {
    id: 'daniel',
    name: 'Daniel Rivas',
    age: 48,
    role: 'socio financiero',
    portrait: null,
    description: 'Daniel Rivas, 48 años, socio financiero',
    relationship: 'Socio desde la fundación de Linares & Asociados (15 años)',
    personality: 'Calculador, evasivo, tiende a minimizar y deflectar culpa',
    alibi:
      'Afirma que llegó por primera vez al edificio a las 20:50 junto con Roberto. Miente: su primera entrada fue a las 19:30.',
    apparentMotive:
      'Marcos iba a reestructurar la sociedad y Daniel perdería participación',
    initialPressure: 0,
    _internal: {
      truths: ['Tenía acceso a la oficina de Marcos con su tarjeta corporativa'],
      lies: ['Afirma que no entró a la oficina de Marcos antes de la reunión'],
      secrets: [
        'Cometió un desfalco de 2 millones de los fondos de la consultora',
      ],
      knows: [
        'La existencia de la reunión, su propio acceso previo, la ubicación de la botella, el veneno que compró',
      ],
      doesNotKnow: [
        'Que Sofía lo vio salir a las 19:40; que Roberto ayudó a Marcos con la auditoría',
      ],
    },
  },
  {
    id: 'elena',
    name: 'Elena Vargas',
    age: 45,
    role: 'socia de operaciones',
    portrait: null,
    description: 'Elena Vargas, 45 años, socia de operaciones',
    relationship: 'Exesposa, divorciada hace un año',
    personality: 'Directa, emocional, defensiva cuando se la presiona',
    alibi: 'Llegó al edificio a las 20:45, registrado por tarjeta de acceso',
    apparentMotive: 'Rencor por el divorcio y disputa económica',
    initialPressure: 0,
    _internal: {
      truths: [
        'Discutió con Marcos el jueves por el reparto de acciones en el divorcio',
      ],
      lies: [
        'Dice que llegó después de las nueve, cuando Marcos ya se sentía mal. Miente: llegó a las 20:45 antes de que Marcos bebiera.',
      ],
      secrets: [
        'Llegó temprano para confrontar a Marcos por el acuerdo de divorcio en privado, pero ocultó esa reunión previa',
      ],
      knows: ['Los términos del divorcio, la disputa por acciones, la reunión urgente'],
      doesNotKnow: [
        'El desfalco de Daniel, la compra de cianuro, lo que ocurrió antes de las 20:45',
      ],
    },
  },
  {
    id: 'roberto',
    name: 'Roberto Mendoza',
    age: 50,
    role: 'socio de tecnología',
    portrait: null,
    description: 'Roberto Mendoza, 50 años, socio de tecnología',
    relationship: 'Amigo cercano desde la universidad, socio desde la fundación',
    personality: 'Nervioso, colaborador, tiende a dar demasiada información',
    alibi: 'Llegó al edificio a las 20:50. Confirmado por el registro de acceso.',
    apparentMotive:
      'Podría haber querido proteger a Daniel si estaba involucrado en el desfalco',
    initialPressure: 0,
    _internal: {
      truths: [
        'Ayudó a Marcos a revisar los movimientos financieros y confirmar las irregularidades de Daniel',
      ],
      lies: [
        'Dice que no sabía nada sobre el desfalco. Miente: colaboró activamente en la auditoría.',
      ],
      secrets: [
        'No le contó a nadie que ayudó a Marcos con la investigación, por miedo a represalias de Daniel',
      ],
      knows: [
        'El desfalco de Daniel, los movimientos financieros sospechosos, la intención de Marcos de denunciar',
      ],
      doesNotKnow: [
        'La compra de cianuro, el acceso previo de Daniel a la oficina, lo que ocurrió antes de las 20:50',
      ],
    },
  },
  {
    id: 'sofia',
    name: 'Sofía Castillo',
    age: 38,
    role: 'socia comercial',
    portrait: null,
    description: 'Sofía Castillo, 38 años, socia comercial',
    relationship: 'La más reciente en unirse a la firma (2 años)',
    personality: 'Profesional, fría, medida en sus respuestas',
    alibi:
      'Llegó al edificio a las 20:55 para la reunión. Confirmado por el registro de acceso.',
    apparentMotive: 'Se beneficiaría si la firma se disolviera',
    initialPressure: 0,
    _internal: {
      truths: [
        'Vio a Daniel salir de la oficina de Marcos a las 19:40 cuando ella estaba en el pasillo recogiendo su laptop',
      ],
      lies: [
        'Dice que no vio a nadie en el edificio antes de la reunión. Miente: vio a Daniel pero no quiso involucrarse.',
      ],
      secrets: [
        'Está negociando con un competidor para irse de la firma y llevarse clientes',
      ],
      knows: ['Que Daniel estuvo en el pasillo a las 19:40, la reunión urgente'],
      doesNotKnow: [
        'El desfalco, la compra de cianuro, qué hacía Daniel en la oficina de Marcos',
      ],
    },
  },
] as const satisfies readonly SuspectDef[];
