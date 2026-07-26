import accessLogImage from '@/assets/evidence/access-log.webp';
import bottleImage from '@/assets/evidence/bottle.webp';
import emailImage from '@/assets/evidence/email.webp';
import receiptImage from '@/assets/evidence/receipt.webp';
import cameraImage from '@/assets/evidence/security-camera.webp';
import toxicologyImage from '@/assets/evidence/toxicology-report.webp';
import type { EvidenceDef } from '@/data/types';

/** Las seis evidencias, todas disponibles desde el inicio de la partida. */
export const EVIDENCE = [
  {
    id: 'ev_access_log',
    name: 'Registro de acceso',
    category: 'digital',
    description: 'Listado de entradas al piso 12 por tarjeta corporativa',
    observableInfo:
      'Muestra que la tarjeta de D. Rivas registró acceso a las 19:30 y a las 20:58. La tarjeta de E. Vargas registró acceso a las 20:45. Las tarjetas de R. Mendoza y S. Castillo registran accesos a las 20:50 y 20:55 respectivamente. También hay un registro de S. Castillo a las 19:38.',
    image: accessLogImage,
    _internal: {
      relevance:
        'Muestra que la tarjeta de D. Rivas registró acceso a las 19:30 y a las 20:58. La tarjeta de E. Vargas registró acceso a las 20:45. Las tarjetas de R. Mendoza y S. Castillo registran accesos a las 20:50 y 20:55 respectivamente. También hay un registro de S. Castillo a las 19:38.',
      relatedSuspects: ['daniel', 'elena', 'roberto', 'sofia'],
    },
  },
  {
    id: 'ev_toxicology',
    name: 'Informe toxicológico',
    category: 'document',
    description: 'Análisis post-mortem de la víctima',
    observableInfo:
      'Cianuro de potasio encontrado en sangre. Concentración indica ingestión entre 5 y 30 minutos antes del deceso. Compatible con ingesta alrededor de las 21:00.',
    image: toxicologyImage,
    _internal: {
      relevance:
        'Cianuro de potasio encontrado en sangre. Concentración indica ingestión entre 5 y 30 minutos antes del deceso. Compatible con ingesta alrededor de las 21:00.',
      relatedSuspects: [],
    },
  },
  {
    id: 'ev_bottle',
    name: 'Botella de whisky',
    category: 'physical',
    description: 'Botella personal de Marcos encontrada en su oficina',
    observableInfo:
      'Residuos de cianuro detectados en el líquido restante. Solamente Marcos bebió de esta botella durante la reunión. Sin huellas claras por la superficie texturizada.',
    image: bottleImage,
    _internal: {
      relevance:
        'Residuos de cianuro detectados en el líquido restante. Solamente Marcos bebió de esta botella durante la reunión. Sin huellas claras por la superficie texturizada.',
      relatedSuspects: ['daniel'],
    },
  },
  {
    id: 'ev_email',
    name: 'Correo de Marcos',
    category: 'digital',
    description: 'Email enviado por Marcos a su abogado el jueves 13 de marzo',
    observableInfo:
      '"He confirmado el desfalco con ayuda de Roberto. Son 2 millones. Daniel no sabe que lo sé. Roberto revisó los movimientos conmigo. El lunes presento la denuncia y saco a Daniel de la sociedad."',
    image: emailImage,
    _internal: {
      relevance:
        '"He confirmado el desfalco con ayuda de Roberto. Son 2 millones. Daniel no sabe que lo sé. Roberto revisó los movimientos conmigo. El lunes presento la denuncia y saco a Daniel de la sociedad."',
      relatedSuspects: ['daniel', 'roberto'],
    },
  },
  {
    id: 'ev_camera',
    name: 'Grabación del pasillo',
    category: 'digital',
    description: 'Video de seguridad del pasillo del piso 12, cámara norte',
    observableInfo:
      'Muestra a Daniel caminando hacia la oficina de Marcos a las 19:30 llevando una bolsa pequeña. A las 19:40 Daniel sale de la oficina sin la bolsa. Se observa a Sofía en el pasillo en ese momento, quien claramente ve a Daniel. No se registra a nadie más hasta las 20:45.',
    image: cameraImage,
    _internal: {
      relevance:
        'Muestra a Daniel caminando hacia la oficina de Marcos a las 19:30 llevando una bolsa pequeña. A las 19:40 Daniel sale de la oficina sin la bolsa. Se observa a Sofía en el pasillo en ese momento, quien claramente ve a Daniel. No se registra a nadie más hasta las 20:45.',
      relatedSuspects: ['daniel', 'sofia'],
    },
  },
  {
    id: 'ev_receipt',
    name: 'Recibo de compra',
    category: 'physical',
    description: 'Recibo de una tienda de suministros químicos',
    observableInfo:
      'Compra de "reactivo KCN 50g" a nombre de "D. Rivas Consultores" el 10 de marzo. Pagado con tarjeta corporativa terminada en 4471.',
    image: receiptImage,
    _internal: {
      relevance:
        'Compra de "reactivo KCN 50g" a nombre de "D. Rivas Consultores" el 10 de marzo. Pagado con tarjeta corporativa terminada en 4471.',
      relatedSuspects: ['daniel'],
    },
  },
] as const satisfies readonly EvidenceDef[];
