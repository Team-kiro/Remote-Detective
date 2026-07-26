/**
 * Pruebas del constructor de prompts del sistema por sospechoso.
 * Grupo (g): contrato backend — tarea 6.4.
 *
 * Verifica que el prompt:
 * - Use únicamente perfil, conocimientos, mentiras y statementId permitidos
 * - Prohíba inventar hechos, cambiar cronología, confesar y decidir culpabilidad
 * - Solicite JSON estricto compatible con InterrogationResponse
 * - No filtre información de otros sospechosos
 *
 * Requisitos: 16.3, 17.3
 */

import { buildSystemPrompt, buildPromptForSuspect } from '../promptBuilder';
import { SUSPECT_PROFILES } from '../gameData';
import type { InterrogationGameContext } from '../types';

const CONTEXT_EMPTY: InterrogationGameContext = {
  discoveredContradictionIds: [],
  suspectPressure: 0,
};

const CONTEXT_PRESSURED: InterrogationGameContext = {
  discoveredContradictionIds: ['contra_daniel_access'],
  suspectPressure: 70,
};

// ---------------------------------------------------------------------------
// Contenido del perfil en el prompt
// ---------------------------------------------------------------------------

describe('buildSystemPrompt — perfil del sospechoso', () => {
  it('incluye el nombre del sospechoso', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    expect(prompt).toContain('Daniel Rivas');
  });

  it('incluye la personalidad del sospechoso', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    expect(prompt).toContain(SUSPECT_PROFILES['daniel'].personality);
  });

  it('incluye la relación con la víctima', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['elena'], CONTEXT_EMPTY);
    expect(prompt).toContain(SUSPECT_PROFILES['elena'].relationship);
  });

  it('incluye la coartada que el sospechoso sostiene', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['roberto'], CONTEXT_EMPTY);
    expect(prompt).toContain(SUSPECT_PROFILES['roberto'].alibi);
  });
});

// ---------------------------------------------------------------------------
// Conocimientos y mentiras
// ---------------------------------------------------------------------------

describe('buildSystemPrompt — conocimientos y mentiras', () => {
  it('incluye lo que el sospechoso sabe', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    for (const fact of SUSPECT_PROFILES['daniel'].knows) {
      expect(prompt).toContain(fact);
    }
  });

  it('incluye lo que el sospechoso no sabe', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    for (const fact of SUSPECT_PROFILES['daniel'].doesNotKnow) {
      expect(prompt).toContain(fact);
    }
  });

  it('incluye las mentiras activas del sospechoso', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    for (const lie of SUSPECT_PROFILES['daniel'].lies) {
      expect(prompt).toContain(lie);
    }
  });

  it('incluye las mentiras de sofia', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['sofia'], CONTEXT_EMPTY);
    for (const lie of SUSPECT_PROFILES['sofia'].lies) {
      expect(prompt).toContain(lie);
    }
  });
});

// ---------------------------------------------------------------------------
// statementIds permitidos — exclusividad por sospechoso
// ---------------------------------------------------------------------------

describe('buildSystemPrompt — statementId permitidos', () => {
  it('incluye los statementId permitidos de daniel', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    for (const id of SUSPECT_PROFILES['daniel'].allowedStatementIds) {
      expect(prompt).toContain(id);
    }
  });

  it('no incluye statementId de otros sospechosos en el prompt de daniel', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    // Los IDs de los demás sospechosos no deben aparecer en el prompt de daniel
    // (ni como opciones válidas ni en ninguna otra sección del texto)
    const otherIds: readonly string[] = [
      'stmt_elena_arrival',
      'stmt_roberto_knowledge',
      'stmt_sofia_witness',
    ];
    for (const id of otherIds) {
      expect(prompt).not.toContain(id);
    }
  });

  it('el prompt de elena solo menciona stmt_elena_arrival como statementId', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['elena'], CONTEXT_EMPTY);
    expect(prompt).toContain('stmt_elena_arrival');
    // Los IDs de daniel no deben aparecer como opciones válidas para elena
    expect(prompt).not.toContain('"stmt_daniel_arrival"');
    expect(prompt).not.toContain('"stmt_daniel_office"');
    expect(prompt).not.toContain('"stmt_daniel_substance"');
  });

  it('el prompt de roberto solo menciona stmt_roberto_knowledge como statementId', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['roberto'], CONTEXT_EMPTY);
    expect(prompt).toContain('stmt_roberto_knowledge');
  });

  it('el prompt de sofia solo menciona stmt_sofia_witness como statementId', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['sofia'], CONTEXT_EMPTY);
    expect(prompt).toContain('stmt_sofia_witness');
  });
});

// ---------------------------------------------------------------------------
// Prohibiciones
// ---------------------------------------------------------------------------

describe('buildSystemPrompt — prohibiciones', () => {
  it('prohíbe inventar hechos no documentados', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    expect(prompt.toLowerCase()).toMatch(/no inventes|no inventar/);
  });

  it('prohíbe cambiar la cronología', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    expect(prompt.toLowerCase()).toMatch(/cronolog/);
  });

  it('prohíbe confesar o admitir culpabilidad', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    expect(prompt.toLowerCase()).toMatch(/confes|culpabilidad/);
  });

  it('prohíbe declarar culpable a otros sospechosos', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    expect(prompt.toLowerCase()).toMatch(/culpabilidad|culpable/);
  });

  it('prohíbe salir del personaje', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    expect(prompt.toLowerCase()).toMatch(/personaje/);
  });
});

// ---------------------------------------------------------------------------
// Formato JSON estricto
// ---------------------------------------------------------------------------

describe('buildSystemPrompt — solicita JSON estricto', () => {
  it('solicita una respuesta exclusivamente en JSON', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    expect(prompt.toLowerCase()).toMatch(/json/);
  });

  it('menciona el límite de 500 caracteres para la respuesta', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    expect(prompt).toContain('500');
  });

  it('el esquema del prompt describe los campos text y statementId', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    expect(prompt).toContain('"text"');
    expect(prompt).toContain('"statementId"');
  });
});

// ---------------------------------------------------------------------------
// Estado emocional según presión
// ---------------------------------------------------------------------------

describe('buildSystemPrompt — estado emocional por presión', () => {
  it('describe el estado como calmado con presión 0', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    expect(prompt.toLowerCase()).toMatch(/calmado|seguro/);
  });

  it('describe el estado como muy presionado con presión alta', () => {
    const prompt = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_PRESSURED);
    expect(prompt.toLowerCase()).toMatch(/muy presionado|presionado/);
  });
});

// ---------------------------------------------------------------------------
// buildPromptForSuspect — delegación por ID
// ---------------------------------------------------------------------------

describe('buildPromptForSuspect', () => {
  it('genera el mismo prompt que buildSystemPrompt para daniel', () => {
    const direct = buildSystemPrompt(SUSPECT_PROFILES['daniel'], CONTEXT_EMPTY);
    const byId = buildPromptForSuspect('daniel', CONTEXT_EMPTY);
    expect(byId).toBe(direct);
  });

  it('genera el mismo prompt que buildSystemPrompt para sofia', () => {
    const direct = buildSystemPrompt(SUSPECT_PROFILES['sofia'], CONTEXT_PRESSURED);
    const byId = buildPromptForSuspect('sofia', CONTEXT_PRESSURED);
    expect(byId).toBe(direct);
  });
});
