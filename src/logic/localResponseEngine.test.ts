import { afterEach, describe, expect, it, vi } from 'vitest';
import { LOCAL_RESPONSES } from '@/data/localResponses';
import { SOLUTION } from '@/data/solution';
import { CONTRADICTIONS } from '@/data/contradictions';
import { STATEMENTS } from '@/data/statements';
import {
  STATEMENT_IDS,
  SUSPECT_IDS,
  type LocalResponseDef,
  type StatementId,
  type SuspectId,
} from '@/data/types';
import {
  findBestResponse,
  getLocalResponse,
  normalizeInput,
} from '@/logic/localResponseEngine';

const FIXTURE: readonly LocalResponseDef[] = [
  {
    id: 'fx_broad',
    suspectId: 'daniel',
    intent: 'Grupo amplio',
    keywordGroups: [['oficina']],
    text: 'Respuesta amplia.',
    statementId: null,
    priority: 20,
    isGeneric: false,
  },
  {
    id: 'fx_specific',
    suspectId: 'daniel',
    intent: 'Grupo específico',
    keywordGroups: [['oficina', 'marcos']],
    text: 'Respuesta específica.',
    statementId: 'stmt_daniel_office',
    priority: 1,
    isGeneric: false,
  },
  {
    id: 'fx_low_priority',
    suspectId: 'daniel',
    intent: 'Empate por prioridad baja',
    keywordGroups: [['veneno']],
    text: 'Prioridad baja.',
    statementId: null,
    priority: 2,
    isGeneric: false,
  },
  {
    id: 'fx_high_priority',
    suspectId: 'daniel',
    intent: 'Empate por prioridad alta',
    keywordGroups: [['veneno']],
    text: 'Prioridad alta.',
    statementId: 'stmt_daniel_substance',
    priority: 9,
    isGeneric: false,
  },
  {
    id: 'fx_other_suspect',
    suspectId: 'elena',
    intent: 'Otro sospechoso',
    keywordGroups: [['oficina']],
    text: 'De otro sospechoso.',
    statementId: null,
    priority: 99,
    isGeneric: false,
  },
  {
    id: 'fx_daniel_generic',
    suspectId: 'daniel',
    intent: 'Genérica',
    keywordGroups: [],
    text: 'Genérica de Daniel.',
    statementId: null,
    priority: 0,
    isGeneric: true,
  },
];

describe('normalizeInput', () => {
  it('pasa a minúsculas, quita acentos y puntuación y colapsa espacios', () => {
    expect(normalizeInput('  ¿A qué HORA   llegaste, Daniel?  ')).toBe(
      'a que hora llegaste daniel',
    );
  });

  it('devuelve cadena vacía para entradas vacías o de solo espacios', () => {
    expect(normalizeInput('')).toBe('');
    expect(normalizeInput('    ')).toBe('');
  });

  it('devuelve cadena vacía para entradas de más de 300 caracteres', () => {
    expect(normalizeInput('a'.repeat(300))).toBe('a'.repeat(300));
    expect(normalizeInput('a'.repeat(301))).toBe('');
  });
});

describe('findBestResponse', () => {
  it('exige todos los términos del grupo', () => {
    expect(findBestResponse('daniel', 'entraste a la oficina', FIXTURE)?.id).toBe(
      'fx_broad',
    );
    expect(
      findBestResponse('daniel', 'entraste a la oficina de marcos', FIXTURE)?.id,
    ).toBe('fx_specific');
  });

  it('desempata por mayor prioridad cuando la especificidad es igual', () => {
    expect(findBestResponse('daniel', 'hablemos del veneno', FIXTURE)?.id).toBe(
      'fx_high_priority',
    );
  });

  it('ignora respuestas genéricas y de otros sospechosos', () => {
    expect(findBestResponse('roberto', 'oficina de marcos', FIXTURE)).toBeNull();
  });

  it('devuelve null sin coincidencia o con entrada normalizada vacía', () => {
    expect(findBestResponse('daniel', 'hablemos del clima', FIXTURE)).toBeNull();
    expect(findBestResponse('daniel', '', FIXTURE)).toBeNull();
  });
});

describe('getLocalResponse', () => {
  it('resuelve coincidencias conocidas del catálogo congelado', () => {
    const response = getLocalResponse('daniel', '¿A qué hora llegaste al edificio?');

    expect(response.id).toBe('resp_daniel_arrival');
    expect(response.statementId).toBe('stmt_daniel_arrival');
  });

  it('devuelve la genérica estable ante entrada desconocida, vacía o larga', () => {
    for (const input of ['hablemos del clima marciano', '', 'x'.repeat(301)]) {
      const response = getLocalResponse('sofia', input);
      expect(response.id).toBe('resp_sofia_generic');
      expect(response.isGeneric).toBe(true);
    }
  });

  it('siempre devuelve un LocalResponseDef con texto no vacío', () => {
    const suspectIds = ['daniel', 'elena', 'roberto', 'sofia'] as const;

    for (const suspectId of suspectIds) {
      for (const input of ['¿Cuál es tu motivo?', '???', 'nada relevante aquí']) {
        const response = getLocalResponse(suspectId, input);
        expect(response.suspectId).toBe(suspectId);
        expect(response.text.length).toBeGreaterThan(0);
        expect(LOCAL_RESPONSES.map((item) => item.id)).toContain(response.id);
      }
    }
  });

  it('no muta el catálogo recibido', () => {
    const snapshot = JSON.stringify(LOCAL_RESPONSES);
    getLocalResponse('elena', '¿Por qué discutiste el jueves?');
    expect(JSON.stringify(LOCAL_RESPONSES)).toBe(snapshot);
  });
});

/** Dos formulaciones razonables distintas por declaración canónica necesaria. */
const PHRASINGS: Record<StatementId, readonly [string, string]> = {
  stmt_daniel_arrival: [
    '¿A qué hora llegaste al edificio?',
    '¿Cuándo entraste al edificio esa noche?',
  ],
  stmt_daniel_office: [
    '¿Entraste a la oficina de Marcos?',
    '¿Estuviste antes en la oficina?',
  ],
  stmt_daniel_substance: [
    '¿De dónde salió el veneno?',
    '¿Compraste cianuro alguna vez?',
  ],
  stmt_elena_arrival: [
    '¿A qué hora llegaste?',
    '¿Cuándo llegaste esa noche?',
  ],
  stmt_roberto_knowledge: [
    '¿Sabías algo del desfalco?',
    '¿Hubo una auditoría en la firma?',
  ],
  stmt_sofia_witness: [
    '¿Viste a alguien en el edificio?',
    '¿Había alguien en el pasillo?',
  ],
};

describe('acceso local a las declaraciones canónicas', () => {
  it('permite obtener cada declaración necesaria con dos formulaciones distintas', () => {
    for (const statementId of STATEMENT_IDS) {
      const statement = STATEMENTS[statementId];
      const [first, second] = PHRASINGS[statementId];

      expect(first).not.toBe(second);

      for (const phrasing of [first, second]) {
        const response = getLocalResponse(statement.suspectId, phrasing);
        expect(response.statementId).toBe(statementId);
        expect(response.suspectId).toBe(statement.suspectId);
        expect(response.text).toBe(statement.canonicalText);
        expect(response.isGeneric).toBe(false);
      }
    }
  });

  it('alcanza las seis declaraciones aprobadas, incluidas las obligatorias de la confesión', () => {
    const reachable = new Set<StatementId>();

    for (const statementId of STATEMENT_IDS) {
      const statement = STATEMENTS[statementId];
      for (const phrasing of PHRASINGS[statementId]) {
        const response = getLocalResponse(statement.suspectId, phrasing);
        if (response.statementId !== null) {
          reachable.add(response.statementId);
        }
      }
    }

    expect(reachable.size).toBe(6);
    for (const statementId of STATEMENT_IDS) {
      expect(reachable.has(statementId)).toBe(true);
    }

    const mandatoryIds = new Set<string>(SOLUTION.mandatoryContradictionIds);
    const mandatoryStatements = CONTRADICTIONS.filter((contradiction) =>
      mandatoryIds.has(contradiction.id),
    ).map(({ statementId }) => statementId);

    expect(mandatoryStatements).toHaveLength(3);
    for (const statementId of mandatoryStatements) {
      expect(reachable.has(statementId)).toBe(true);
    }
  });

  it('solo asocia identificadores de declaración aprobados y del mismo sospechoso', () => {
    for (const response of LOCAL_RESPONSES) {
      if (response.statementId === null) {
        continue;
      }
      expect(STATEMENT_IDS).toContain(response.statementId);
      expect(STATEMENTS[response.statementId].suspectId).toBe(response.suspectId);
    }
  });
});

describe('respuestas locales sin dependencia de red', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resuelve la respuesta sin realizar ninguna petición HTTP', () => {
    const fetchSpy = vi.fn(() => {
      throw new Error('El motor local no debe usar la red.');
    });
    vi.stubGlobal('fetch', fetchSpy);

    for (const suspectId of SUSPECT_IDS) {
      const response = getLocalResponse(suspectId, '¿Cuál es tu relación con Marcos?');
      expect(response.suspectId).toBe(suspectId);
      expect(response.text.length).toBeGreaterThan(0);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('devuelve exactamente una genérica estable por sospechoso ante temas desconocidos', () => {
    const genericIds = new Set<string>();

    for (const suspectId of SUSPECT_IDS) {
      const first = getLocalResponse(suspectId, 'hablemos de futbol interplanetario');
      const second = getLocalResponse(suspectId, '   ');

      expect(first.isGeneric).toBe(true);
      expect(second.id).toBe(first.id);
      expect(
        LOCAL_RESPONSES.filter(
          (response) => response.suspectId === suspectId && response.isGeneric,
        ),
      ).toHaveLength(1);

      genericIds.add(first.id);
    }

    expect(genericIds.size).toBe(SUSPECT_IDS.length);
  });
});

describe('normalización adicional de entradas', () => {
  it('trata acentos, mayúsculas, puntuación y espacios múltiples como equivalentes', () => {
    const variants = [
      '¿A qué hora llegaste?',
      'A QUE HORA LLEGASTE',
      '  a    qué   hora,,, llegaste!!!  ',
      'a\tque\nhora  llegaste',
    ];

    const normalized = variants.map((variant) => normalizeInput(variant));
    expect(new Set(normalized).size).toBe(1);

    const suspectId: SuspectId = 'elena';
    const ids = variants.map((variant) => getLocalResponse(suspectId, variant).id);
    expect(new Set(ids)).toEqual(new Set(['resp_elena_arrival']));
  });

  it('no produce coincidencia con entrada vacía ni con más de 300 caracteres', () => {
    const longQuestion = `¿A qué hora llegaste? ${'x'.repeat(300)}`;

    expect(normalizeInput(longQuestion)).toBe('');
    expect(getLocalResponse('elena', longQuestion).isGeneric).toBe(true);
    expect(getLocalResponse('elena', '').isGeneric).toBe(true);
  });
});
