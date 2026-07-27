/**
 * Constructor del prompt del sistema por sospechoso para Amazon Bedrock.
 *
 * El prompt usa únicamente datos narrativos aprobados del perfil: personalidad,
 * relación, conocimientos permitidos, mentiras activas, información desconocida
 * y la lista de statementId permitidos SOLO para ese sospechoso.
 *
 * Prohibiciones explícitas en el prompt:
 * - No inventar evidencias ni hechos no documentados
 * - No cambiar la cronología oficial
 * - No salir del personaje
 * - No confesar ni admitir culpabilidad en el asesinato
 * - No decidir culpabilidad de otros sospechosos
 *
 * Requisitos: 16.3, 17.3
 */

import type { SuspectProfile } from './gameData';
import type { InterrogationGameContext } from './types';
import { STATEMENT_CONTENTS, SUSPECT_PROFILES } from './gameData';
import type { SuspectId } from './types';

/**
 * Construye el prompt del sistema para el modelo Bedrock dado el perfil del
 * sospechoso y el contexto de la partida.
 *
 * El modelo debe responder EXCLUSIVAMENTE con un objeto JSON estricto:
 * { "text": "<respuesta del sospechoso, máximo 500 caracteres en español>",
 *   "statementId": "<uno de los IDs permitidos>" | null }
 */
export function buildSystemPrompt(
  suspect: SuspectProfile,
  context: InterrogationGameContext,
): string {
  const allowedIds =
    suspect.allowedStatementIds.length > 0
      ? suspect.allowedStatementIds.join(', ')
      : 'ninguno';

  // Sin el contenido de cada declaración el modelo no puede saber cuándo la ha
  // afirmado, devuelve `null` y el jugador se queda sin nada que contradecir.
  const statementCatalog =
    suspect.allowedStatementIds.length > 0
      ? suspect.allowedStatementIds
          .map((id) => `- ${id}: "${STATEMENT_CONTENTS[id]}"`)
          .join('\n')
      : '- (ninguna)';

  const pressure = context.suspectPressure;
  const pressureDesc =
    pressure === 0
      ? 'calmado y seguro de sí mismo'
      : pressure < 30
        ? 'ligeramente nervioso'
        : pressure < 60
          ? 'notablemente presionado'
          : 'muy presionado y a la defensiva';

  return `Eres ${suspect.name}, ${suspect.age} años, ${suspect.role}.
Relación con Marcos Linares: ${suspect.relationship}.
Personalidad: ${suspect.personality}.
Coartada que sostienes: ${suspect.alibi}.
Estado emocional actual: ${pressureDesc}.

LO QUE SABES (puedes mencionar):
${suspect.knows.join('\n')}

LO QUE NO SABES (jamás menciones ni insinúes):
${suspect.doesNotKnow.join('\n')}

LO QUE NIEGAS (mantén estas afirmaciones falsas con convicción):
${suspect.lies.join('\n')}

PROHIBICIONES ABSOLUTAS — violarlas invalida tu respuesta:
- No inventes evidencias ni hechos no documentados en este prompt.
- No cambies la cronología oficial del caso.
- No salgas del personaje bajo ninguna circunstancia.
- No confieses ni admitas culpabilidad en el asesinato de Marcos Linares.
- No decidas ni insinúes la culpabilidad de otros sospechosos.
- No incluyas texto que supere 500 caracteres en la respuesta.

FORMATO DE RESPUESTA — obligatorio, sin excepciones:
Responde EXCLUSIVAMENTE con un objeto JSON válido, sin markdown, sin texto adicional:
{"text":"<tu respuesta en español, máximo 500 caracteres>","statementId":"<uno de [${allowedIds}]>" | null}

DECLARACIONES QUE PUEDES REGISTRAR:
${statementCatalog}

Cuando la pregunta toque el tema de una de esas declaraciones, sostén ese contenido en tu respuesta y devuelve OBLIGATORIAMENTE su statementId; no lo omitas ni respondas con evasivas que lo eviten.
Usa null solo si ninguna de esas declaraciones aplica al tema de la pregunta.`;
}

/**
 * Devuelve el prompt del sistema para un sospechoso conocido dado su ID y el
 * contexto de la partida.
 */
export function buildPromptForSuspect(
  suspectId: SuspectId,
  context: InterrogationGameContext,
): string {
  const profile = SUSPECT_PROFILES[suspectId];
  return buildSystemPrompt(profile, context);
}
