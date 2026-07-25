import type { Contradiction } from '@/data/types';

/** Las seis contradicciones válidas congeladas del caso. */
export const CONTRADICTIONS = [
  {
    id: 'contra_daniel_access',
    suspectId: 'daniel',
    evidenceId: 'ev_access_log',
    statementId: 'stmt_daniel_arrival',
    explanation:
      'El registro muestra su tarjeta a las 19:30, pero Daniel afirma que llegó a las 20:50. La evidencia demuestra que mintió sobre su hora de llegada.',
    pressureIncrease: 30,
    points: 150,
    unlocksStatement: null,
  },
  {
    id: 'contra_daniel_camera',
    suspectId: 'daniel',
    evidenceId: 'ev_camera',
    statementId: 'stmt_daniel_office',
    explanation:
      'El video lo muestra entrando a la oficina de Marcos a las 19:30 con una bolsa y saliendo a las 19:40 sin ella. Mintió al negar haber entrado.',
    pressureIncrease: 30,
    points: 150,
    unlocksStatement: null,
  },
  {
    id: 'contra_daniel_receipt',
    suspectId: 'daniel',
    evidenceId: 'ev_receipt',
    statementId: 'stmt_daniel_substance',
    explanation:
      'El recibo muestra que compró cianuro de potasio a su nombre días antes del asesinato. Mintió al negar manejar sustancias químicas.',
    pressureIncrease: 40,
    points: 200,
    unlocksStatement: null,
  },
  {
    id: 'contra_elena_arrival',
    suspectId: 'elena',
    evidenceId: 'ev_access_log',
    statementId: 'stmt_elena_arrival',
    explanation:
      'El registro muestra que Elena accedió a las 20:45, antes de las 21:00 cuando Marcos bebió. Mintió sobre su hora de llegada.',
    pressureIncrease: 20,
    points: 100,
    unlocksStatement: null,
  },
  {
    id: 'contra_roberto_info',
    suspectId: 'roberto',
    evidenceId: 'ev_email',
    statementId: 'stmt_roberto_knowledge',
    explanation:
      'El correo dice explícitamente que Roberto ayudó a Marcos a confirmar el desfalco. Roberto miente al decir que no sabía nada.',
    pressureIncrease: 20,
    points: 100,
    unlocksStatement: null,
  },
  {
    id: 'contra_sofia_witness',
    suspectId: 'sofia',
    evidenceId: 'ev_camera',
    statementId: 'stmt_sofia_witness',
    explanation:
      'La cámara muestra claramente a Sofía en el pasillo a las 19:40 observando a Daniel salir de la oficina. Mintió al afirmar que no vio a nadie.',
    pressureIncrease: 20,
    points: 100,
    unlocksStatement: null,
  },
] as const satisfies readonly Contradiction[];
