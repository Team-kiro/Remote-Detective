# Documento de Diseño — Remote Detective

## Overview

Remote Detective es una aplicación web de investigación criminal con estética noir construida con React, TypeScript y Vite. El juego simula un escritorio virtual de detective donde el jugador interroga sospechosos, analiza evidencias, detecta contradicciones mediante drag-and-drop, y realiza una acusación final para resolver un asesinato.

La arquitectura sigue un modelo de aplicación de página única (SPA) con toda la lógica de juego ejecutándose localmente en el navegador. El backend (Lambda + API Gateway + Bedrock) es un canal opcional para generar respuestas dinámicas de sospechosos, pero nunca controla el estado del juego.

### Decisiones de Diseño Clave

- **Zustand** como gestor de estado global por su API mínima y tipado fuerte con TypeScript.
- **@dnd-kit/core** para drag-and-drop, accesible por defecto, compatible con pointer y keyboard.
- **Separación estricta datos/lógica/UI**: módulos puros TypeScript sin dependencias de React.
- **Motor de respuestas dual**: respuestas locales obligatorias, Bedrock opcional con fallback automático.
- **Lógica determinista local**: puntuación, presión, contradicciones, confesión, acusación y condiciones de victoria/derrota evaluadas exclusivamente con datos y funciones locales.
- **Un único store (gameStore)**: todo el estado de la partida en un solo store de Zustand.
- **Persistencia opcional**: sessionStorage como requisito importante pero no bloquea el MVP.
- **Sin desbloqueo progresivo**: todas las declaraciones son obtenibles desde el inicio mediante preguntas razonables.
- **Confesión interna**: evaluada automáticamente dentro de `presentEvidence` tras actualizar presión con valores nuevos. No existe acción pública para forzarla.
- **Acusación interna**: `submitAccusation` recibe solo `AccusationInput` y evalúa internamente.
- **Interrogación interna**: `askQuestion` recibe solo el texto de la pregunta. La UI nunca entrega `ChatMessage`, `statementId`, `requestId` ni `callSessionId`.
- **Puntuación final calculada una sola vez** al terminar la partida mediante `finalizeGame`, reemplazando el score del store.
- **Protección de solicitudes asíncronas** mediante `callSessionId` y `requestId` internos.
- **Descarte completo de Bedrock**: cualquier respuesta inválida se descarta íntegramente (texto incluido) y se usa la respuesta local completa.

---

## Diseño Narrativo Definitivo

### Caso: El asesinato de Marcos Linares

| Campo | Valor |
|---|---|
| **Víctima** | Marcos Linares, 52 años, socio fundador de la consultora Linares & Asociados |
| **Lugar del crimen** | Oficina privada de Marcos en el piso 12 del edificio corporativo |
| **Hora aproximada** | Entre las 21:00 y 21:30 del viernes 14 de marzo |
| **Causa de muerte** | Envenenamiento por cianuro disuelto en whisky |
| **Método** | El culpable vertió cianuro en la botella personal de whisky de Marcos antes de la reunión nocturna |
| **Motivo real** | Daniel Rivas descubrió que Marcos planeaba expulsarlo de la sociedad y denunciarlo por un desfalco de 2 millones que Daniel había cometido. Daniel lo envenenó para silenciarlo. |
| **Culpable** | Daniel Rivas |

### Cronología Oficial

| Hora | Evento |
|---|---|
| 18:00 | Marcos envía correo convocando reunión urgente para las 21:00 con los 4 socios |
| 19:30 | Daniel entra al piso 12 y accede a la oficina de Marcos (registrado por tarjeta de acceso) |
| 19:35 | Daniel coloca el cianuro en la botella de whisky de Marcos |
| 19:38 | Sofía regresa brevemente al edificio para recoger su laptop |
| 19:40 | Daniel sale de la oficina sin la bolsa. Sofía lo ve en el pasillo. |
| 19:44 | Sofía vuelve a salir del edificio |
| 20:45 | Elena llega al edificio para la reunión |
| 20:50 | Roberto llega al edificio para la reunión |
| 20:55 | Sofía regresa al edificio para la reunión |
| 20:58 | Daniel regresa al edificio |
| 21:00 | Comienza la reunión. Marcos sirve whisky de su botella personal y bebe. Los demás no beben de esa botella. |
| 21:10 | Marcos se desploma. Los socios llaman a emergencias. |
| 21:25 | Paramédicos declaran la muerte |
| 21:30 | Policía precinta la escena |

### Sospechosos — Perfiles Completos

#### Daniel Rivas (ID: `daniel`)

| Campo | Valor |
|---|---|
| **Identidad** | Daniel Rivas, 48 años, socio financiero |
| **Relación con Marcos** | Socio desde la fundación de Linares & Asociados (15 años) |
| **Personalidad** | Calculador, evasivo, tiende a minimizar y deflectar culpa |
| **Coartada** | Afirma que llegó por primera vez al edificio a las 20:50 junto con Roberto. Miente: su primera entrada fue a las 19:30. |
| **Verdad** | Tenía acceso a la oficina de Marcos con su tarjeta corporativa |
| **Mentira principal** | Afirma que no entró a la oficina de Marcos antes de la reunión |
| **Secreto** | Cometió un desfalco de 2 millones de los fondos de la consultora |
| **Conoce** | La existencia de la reunión, su propio acceso previo, la ubicación de la botella, el veneno que compró |
| **Desconoce** | Que Sofía lo vio salir a las 19:40; que Roberto ayudó a Marcos con la auditoría |
| **Motivo aparente** | Marcos iba a reestructurar la sociedad y Daniel perdería participación |

#### Elena Vargas (ID: `elena`)

| Campo | Valor |
|---|---|
| **Identidad** | Elena Vargas, 45 años, socia de operaciones |
| **Relación con Marcos** | Exesposa, divorciada hace un año |
| **Personalidad** | Directa, emocional, defensiva cuando se la presiona |
| **Coartada** | Llegó al edificio a las 20:45, registrado por tarjeta de acceso |
| **Verdad** | Discutió con Marcos el jueves por el reparto de acciones en el divorcio |
| **Mentira principal** | Dice que llegó después de las nueve, cuando Marcos ya se sentía mal. Miente: llegó a las 20:45 antes de que Marcos bebiera. |
| **Secreto** | Llegó temprano para confrontar a Marcos por el acuerdo de divorcio en privado, pero ocultó esa reunión previa |
| **Conoce** | Los términos del divorcio, la disputa por acciones, la reunión urgente |
| **Desconoce** | El desfalco de Daniel, la compra de cianuro, lo que ocurrió antes de las 20:45 |
| **Motivo aparente** | Rencor por el divorcio y disputa económica |

#### Roberto Mendoza (ID: `roberto`)

| Campo | Valor |
|---|---|
| **Identidad** | Roberto Mendoza, 50 años, socio de tecnología |
| **Relación con Marcos** | Amigo cercano desde la universidad, socio desde la fundación |
| **Personalidad** | Nervioso, colaborador, tiende a dar demasiada información |
| **Coartada** | Llegó al edificio a las 20:50. Confirmado por el registro de acceso. |
| **Verdad** | Ayudó a Marcos a revisar los movimientos financieros y confirmar las irregularidades de Daniel |
| **Mentira principal** | Dice que no sabía nada sobre el desfalco. Miente: colaboró activamente en la auditoría. |
| **Secreto** | No le contó a nadie que ayudó a Marcos con la investigación, por miedo a represalias de Daniel |
| **Conoce** | El desfalco de Daniel, los movimientos financieros sospechosos, la intención de Marcos de denunciar |
| **Desconoce** | La compra de cianuro, el acceso previo de Daniel a la oficina, lo que ocurrió antes de las 20:50 |
| **Motivo aparente** | Podría haber querido proteger a Daniel si estaba involucrado en el desfalco |

#### Sofía Castillo (ID: `sofia`)

| Campo | Valor |
|---|---|
| **Identidad** | Sofía Castillo, 38 años, socia comercial |
| **Relación con Marcos** | La más reciente en unirse a la firma (2 años) |
| **Personalidad** | Profesional, fría, medida en sus respuestas |
| **Coartada** | Llegó al edificio a las 20:55 para la reunión. Confirmado por el registro de acceso. |
| **Verdad** | Vio a Daniel salir de la oficina de Marcos a las 19:40 cuando ella estaba en el pasillo recogiendo su laptop |
| **Mentira principal** | Dice que no vio a nadie en el edificio antes de la reunión. Miente: vio a Daniel pero no quiso involucrarse. |
| **Secreto** | Está negociando con un competidor para irse de la firma y llevarse clientes |
| **Conoce** | Que Daniel estuvo en el pasillo a las 19:40, la reunión urgente |
| **Desconoce** | El desfalco, la compra de cianuro, qué hacía Daniel en la oficina de Marcos |
| **Motivo aparente** | Se beneficiaría si la firma se disolviera |

### Evidencias

| ID | Nombre | Categoría | Descripción | Información observable |
|---|---|---|---|---|
| `ev_access_log` | Registro de acceso | digital | Listado de entradas al piso 12 por tarjeta corporativa | Muestra que la tarjeta de D. Rivas registró acceso a las 19:30 y a las 20:58. La tarjeta de E. Vargas registró acceso a las 20:45. Las tarjetas de R. Mendoza y S. Castillo registran accesos a las 20:50 y 20:55 respectivamente. También hay un registro de S. Castillo a las 19:38. |
| `ev_toxicology` | Informe toxicológico | document | Análisis post-mortem de la víctima | Cianuro de potasio encontrado en sangre. Concentración indica ingestión entre 5 y 30 minutos antes del deceso. Compatible con ingesta alrededor de las 21:00. |
| `ev_bottle` | Botella de whisky | physical | Botella personal de Marcos encontrada en su oficina | Residuos de cianuro detectados en el líquido restante. Solamente Marcos bebió de esta botella durante la reunión. Sin huellas claras por la superficie texturizada. |
| `ev_email` | Correo de Marcos | digital | Email enviado por Marcos a su abogado el jueves 13 de marzo | "He confirmado el desfalco con ayuda de Roberto. Son 2 millones. Daniel no sabe que lo sé. Roberto revisó los movimientos conmigo. El lunes presento la denuncia y saco a Daniel de la sociedad." |
| `ev_camera` | Grabación del pasillo | digital | Video de seguridad del pasillo del piso 12, cámara norte | Muestra a Daniel caminando hacia la oficina de Marcos a las 19:30 llevando una bolsa pequeña. A las 19:40 Daniel sale de la oficina sin la bolsa. Se observa a Sofía en el pasillo en ese momento, quien claramente ve a Daniel. No se registra a nadie más hasta las 20:45. |
| `ev_receipt` | Recibo de compra | physical | Recibo de una tienda de suministros químicos | Compra de "reactivo KCN 50g" a nombre de "D. Rivas Consultores" el 10 de marzo. Pagado con tarjeta corporativa terminada en 4471. |

### Declaraciones Canónicas

| statementId | suspectId | Texto canónico | Respuestas que la registran |
|---|---|---|---|
| `stmt_daniel_arrival` | daniel | "Llegué al edificio a las 20:50, vine con Roberto desde el estacionamiento." | `resp_daniel_arrival` |
| `stmt_daniel_office` | daniel | "No entré a la oficina de Marcos antes de la reunión. No tenía motivo para hacerlo." | `resp_daniel_office` |
| `stmt_daniel_substance` | daniel | "No tengo idea de dónde salió ese veneno. Yo no manejo sustancias químicas." | `resp_daniel_substance` |
| `stmt_elena_arrival` | elena | "Llegué después de las nueve, cuando Marcos ya había comenzado a sentirse mal." | `resp_elena_arrival` |
| `stmt_roberto_knowledge` | roberto | "Yo no sabía nada de un desfalco. Es la primera vez que escucho sobre eso." | `resp_roberto_knowledge` |
| `stmt_sofia_witness` | sofia | "Regresé brevemente antes de la reunión, pero no vi a nadie en el edificio. Luego volví a las 20:55." | `resp_sofia_witness` |

Solo estas seis declaraciones pueden utilizarse para contradicciones. Bedrock no puede crear nuevas declaraciones utilizables.

### Tabla Central de Contradicciones

| contradictionId | suspectId | Texto declaración | evidenceId | Info observable contradictoria | Explicación canónica | Presión | Puntos | unlocksStatement |
|---|---|---|---|---|---|---|---|---|
| `contra_daniel_access` | daniel | "Llegué al edificio a las 20:50..." | `ev_access_log` | Tarjeta de D. Rivas: 19:30 y 20:58 | El registro muestra su tarjeta a las 19:30, pero Daniel afirma que llegó a las 20:50. La evidencia demuestra que mintió sobre su hora de llegada. | +30 | 150 | null |
| `contra_daniel_camera` | daniel | "No entré a la oficina de Marcos..." | `ev_camera` | Daniel entra 19:30 con bolsa, sale 19:40 sin bolsa | El video lo muestra entrando a la oficina de Marcos a las 19:30 con una bolsa y saliendo a las 19:40 sin ella. Mintió al negar haber entrado. | +30 | 150 | null |
| `contra_daniel_receipt` | daniel | "No manejo sustancias químicas..." | `ev_receipt` | KCN 50g a nombre "D. Rivas Consultores" | El recibo muestra que compró cianuro de potasio a su nombre días antes del asesinato. Mintió al negar manejar sustancias químicas. | +40 | 200 | null |
| `contra_elena_arrival` | elena | "Llegué después de las nueve..." | `ev_access_log` | Tarjeta de E. Vargas: 20:45 | El registro muestra que Elena accedió a las 20:45, antes de las 21:00 cuando Marcos bebió. Mintió sobre su hora de llegada. | +20 | 100 | null |
| `contra_roberto_info` | roberto | "No sabía nada de un desfalco..." | `ev_email` | "He confirmado el desfalco con ayuda de Roberto..." | El correo dice explícitamente que Roberto ayudó a Marcos a confirmar el desfalco. Roberto miente al decir que no sabía nada. | +20 | 100 | null |
| `contra_sofia_witness` | sofia | "No vi a nadie en el edificio..." | `ev_camera` | Sofía en pasillo a las 19:40 observando a Daniel | La cámara muestra claramente a Sofía en el pasillo a las 19:40 observando a Daniel salir de la oficina. Mintió al afirmar que no vio a nadie. | +20 | 100 | null |

La partida es completamente resoluble con esta tabla sin Bedrock.

### Contradicciones Obligatorias para Confesión

- `contra_daniel_access`
- `contra_daniel_camera`
- `contra_daniel_receipt`

### Solución Narrativa

```typescript
const SOLUTION: NarrativeSolution = {
  culpritId: 'daniel',
  motiveId: 'motive_silence',
  methodId: 'method_poison',
  requiredEvidenceIds: ['ev_email', 'ev_camera', 'ev_receipt', 'ev_bottle'],
  confessionPressureThreshold: 80,
  mandatoryContradictionIds: ['contra_daniel_access', 'contra_daniel_camera', 'contra_daniel_receipt']
};
```

### Opciones de Acusación

| ID | Texto | | ID | Texto |
|---|---|---|---|---|
| `motive_silence` | Silenciar a Marcos para ocultar el desfalco | | `method_poison` | Envenenamiento con cianuro en el whisky |
| `motive_greed` | Mayor participación en la sociedad | | `method_assault` | Agresión física directa |
| `motive_revenge` | Venganza personal | | `method_hired` | Contratación de un tercero |
| `motive_divorce` | Beneficiarse del conflicto del divorcio | | `method_accident` | Simulación de accidente |

### Secuencia Lógica de Resolución

1. `ev_access_log` contradice `stmt_daniel_arrival`: su tarjeta entró a las 19:30, no a las 20:50.
2. `ev_camera` contradice `stmt_daniel_office`: se le ve entrando con una bolsa y saliendo sin ella.
3. `ev_receipt` contradice `stmt_daniel_substance`: compró cianuro a su nombre.
4. `ev_email` revela el motivo: Daniel iba a ser denunciado por el desfalco.
5. `ev_bottle` confirma el método: cianuro en la bebida que solo Marcos consumió.
6. **Conclusión**: Las evidencias obligatorias (`ev_email`, `ev_camera`, `ev_receipt`, `ev_bottle`) respaldan culpable, motivo y método.

---

### Catálogo de Respuestas Locales

#### Daniel Rivas (5 + genérica)

| ID | Intent | keywordGroups | Texto | statementId | priority | isGeneric |
|---|---|---|---|---|---|---|
| `resp_daniel_arrival` | Hora de llegada | `[['hora','llegaste']],[['cuando','edificio']],[['hora','llegada']]` | "Llegué al edificio a las 20:50, vine con Roberto desde el estacionamiento." | `stmt_daniel_arrival` | 10 | false |
| `resp_daniel_office` | Oficina de Marcos | `[['oficina','marcos']],[['entraste','oficina']],[['oficina','antes']]` | "No entré a la oficina de Marcos antes de la reunión. No tenía motivo para hacerlo." | `stmt_daniel_office` | 10 | false |
| `resp_daniel_substance` | Veneno/sustancias | `[['veneno']],[['sustancia','quimica']],[['cianuro']],[['quimicos']]` | "No tengo idea de dónde salió ese veneno. Yo no manejo sustancias químicas." | `stmt_daniel_substance` | 10 | false |
| `resp_daniel_relation` | Relación con Marcos | `[['relacion','marcos']],[['marcos','socio']],[['conocias','marcos']]` | "Marcos y yo éramos socios desde hace años. Relación estrictamente profesional." | null | 5 | false |
| `resp_daniel_motive` | Motivo | `[['motivo']],[['razon','matar']],[['por','que','harias']]` | "No tengo ningún motivo. La reestructuración me afectaba, pero no es para matar." | null | 5 | false |
| `resp_daniel_generic` | Genérica | `[]` | "No sé qué quieres que te diga con eso. Pregúntame por la hora a la que llegué, por la oficina de Marcos o por el veneno, y te contesto." | null | 0 | true |

#### Elena Vargas (5 + genérica)

| ID | Intent | keywordGroups | Texto | statementId | priority | isGeneric |
|---|---|---|---|---|---|---|
| `resp_elena_arrival` | Hora de llegada | `[['hora','llegaste']],[['cuando','llegaste']],[['hora','edificio']]` | "Llegué después de las nueve, cuando Marcos ya había comenzado a sentirse mal." | `stmt_elena_arrival` | 10 | false |
| `resp_elena_relation` | Relación con Marcos | `[['relacion','marcos']],[['divorcio']],[['exesposa']]` | "Marcos y yo nos divorciamos hace un año. No fue fácil, pero no le deseaba ningún mal." | null | 5 | false |
| `resp_elena_motive` | Motivo económico | `[['dinero']],[['acciones']],[['economico']],[['herencia']]` | "El divorcio fue complicado económicamente, pero estaba resolviendo eso por vía legal." | null | 5 | false |
| `resp_elena_thursday` | Discusión del jueves | `[['jueves']],[['discusion']],[['pelea','marcos']]` | "Sí, discutí con Marcos el jueves por las acciones. Pero no tiene que ver con su muerte." | null | 5 | false |
| `resp_elena_reunion` | Reunión previa | `[['confrontar']],[['antes','reunion']],[['temprano']]` | "Llegué a la hora que dije. No tengo nada más que agregar sobre eso." | null | 5 | false |
| `resp_elena_generic` | Genérica | `[]` | "Esa pregunta no lleva a ninguna parte. Si quieres, hablamos de mi llegada, de mi relación con Marcos o del dinero del divorcio." | null | 0 | true |

#### Roberto Mendoza (5 + genérica)

| ID | Intent | keywordGroups | Texto | statementId | priority | isGeneric |
|---|---|---|---|---|---|---|
| `resp_roberto_knowledge` | Desfalco | `[['desfalco']],[['irregularidades']],[['dinero','falta']],[['auditoria']]` | "Yo no sabía nada de un desfalco. Es la primera vez que escucho sobre eso." | `stmt_roberto_knowledge` | 10 | false |
| `resp_roberto_relation` | Relación con Marcos | `[['relacion','marcos']],[['amigo','marcos']],[['conocias','marcos']]` | "Marcos era mi mejor amigo en la firma. Nos conocíamos desde la universidad." | null | 5 | false |
| `resp_roberto_daniel` | Opinión de Daniel | `[['daniel']],[['rivas']],[['socio','financiero']]` | "Daniel siempre fue reservado con los números. Yo no me metía en su área." | null | 5 | false |
| `resp_roberto_arrival` | Hora de llegada | `[['hora','llegaste']],[['cuando','llegaste']]` | "Llegué solo a las 20:50. Vi a Daniel entrar unos minutos después, poco antes de que comenzara la reunión." | null | 5 | false |
| `resp_roberto_fear` | Miedo | `[['miedo']],[['asustado']],[['nervioso']],[['ocultas']]` | "Estoy nervioso porque mataron a mi amigo. Cualquiera lo estaría." | null | 5 | false |
| `resp_roberto_generic` | Genérica | `[]` | "Lo siento, no sé qué responder a eso. Pregúntame por el desfalco, por la hora en que llegué o por Marcos, y hago lo que pueda." | null | 0 | true |

#### Sofía Castillo (5 + genérica)

| ID | Intent | keywordGroups | Texto | statementId | priority | isGeneric |
|---|---|---|---|---|---|---|
| `resp_sofia_witness` | Testigo/vio algo | `[['viste','alguien']],[['viste','algo']],[['antes','reunion']],[['pasillo']]` | "Regresé brevemente antes de la reunión, pero no vi a nadie en el edificio. Luego volví a las 20:55." | `stmt_sofia_witness` | 10 | false |
| `resp_sofia_relation` | Relación con Marcos | `[['relacion','marcos']],[['marcos','jefe']],[['conocias','marcos']]` | "Marcos me trajo a la firma hace dos años. Relación profesional correcta." | null | 5 | false |
| `resp_sofia_laptop` | Laptop/regreso | `[['laptop']],[['computadora']],[['19','38']],[['regresaste']]` | "Regresé brevemente a recoger mi laptop de mi oficina antes de la reunión. Fue algo rápido. No vi a nadie." | null | 5 | false |
| `resp_sofia_motive` | Motivo | `[['motivo']],[['beneficio']],[['competencia']]` | "No tengo motivos. La firma funciona bien para mí tal como está." | null | 5 | false |
| `resp_sofia_arrival` | Hora de llegada | `[['hora','llegaste']],[['cuando','llegaste']]` | "Llegué a las 20:55 para la reunión." | null | 5 | false |
| `resp_sofia_generic` | Genérica | `[]` | "No tengo información sobre eso. Pregúntame por lo que vi en el edificio, por mi laptop o por la hora en que llegué." | null | 0 | true |

## Architecture

### Estructura de Carpetas

```
remote-detective/
├── public/assets/{portraits,evidence,backgrounds,audio}/
├── src/
│   ├── main.tsx, App.tsx, config.ts
│   ├── data/{types,suspects,evidence,statements,contradictions,solution,localResponses,scoringRules,accusationOptions}.ts
│   ├── logic/{contradictionEngine,scoringEngine,confessionEngine,accusationEngine,timerEngine,localResponseEngine}.ts
│   ├── store/{gameStore,persistence,types}.ts
│   ├── services/bedrockService.ts
│   ├── components/screens/{TitleScreen,InstructionsScreen,GameScreen,EndScreen}.tsx
│   ├── components/desktop/{Desktop,CaseFile,EvidencePanel,AccusationPanel}.tsx
│   ├── components/call/{CallPanel,ChatHistory,QuestionInput,EvidenceTray}.tsx
│   ├── components/contradiction/{DraggableEvidence,DroppableStatement,ContradictionFeedback}.tsx
│   ├── components/shared/{Timer,ScoreDisplay,NavigationBar,LoadingIndicator}.tsx
│   ├── hooks/{useTimer,useResponseEngine}.ts
│   └── styles/
├── backend/{src/{handler,bedrockClient,promptBuilder,validation}.ts,template.yaml,package.json,tsconfig.json}
├── tests/{contradictionEngine,scoringEngine,confessionEngine,accusationEngine,timerEngine,localResponseEngine,responseFallback,gameReset,persistence}.test.ts
├── docs/{architecture,local-setup,aws-deployment,kiro-usage,narrative-structure}.md
├── README.md, amplify.yml, package.json, tsconfig.json, vite.config.ts, vitest.config.ts
```

---

## Components and Interfaces

### Identificadores Estables (`src/data/types.ts`)

```typescript
export type SuspectId = 'daniel' | 'elena' | 'roberto' | 'sofia';
export type EvidenceId = 'ev_access_log' | 'ev_toxicology' | 'ev_bottle' | 'ev_email' | 'ev_camera' | 'ev_receipt';
export type StatementId = 'stmt_daniel_arrival' | 'stmt_daniel_office' | 'stmt_daniel_substance' | 'stmt_elena_arrival' | 'stmt_roberto_knowledge' | 'stmt_sofia_witness';
export type ContradictionId = 'contra_daniel_access' | 'contra_daniel_camera' | 'contra_daniel_receipt' | 'contra_elena_arrival' | 'contra_roberto_info' | 'contra_sofia_witness';
export type MotiveId = 'motive_silence' | 'motive_greed' | 'motive_revenge' | 'motive_divorce';
export type MethodId = 'method_poison' | 'method_assault' | 'method_hired' | 'method_accident';
```

### Modelos de Datos

```typescript
export interface SuspectDef { id: SuspectId; name: string; portrait: string; relationship: string; personality: string; alibi: string; apparentMotive: string; }
export interface EvidenceDef { id: EvidenceId; name: string; category: 'physical'|'document'|'digital'; description: string; observableInfo: string; image: string|null; _internal: { relevance: string; relatedSuspects: SuspectId[] }; }
export interface StatementDef { id: StatementId; suspectId: SuspectId; canonicalText: string; }
export interface Contradiction { id: ContradictionId; suspectId: SuspectId; evidenceId: EvidenceId; statementId: StatementId; explanation: string; pressureIncrease: number; points: number; unlocksStatement: null; }
export interface NarrativeSolution { culpritId: SuspectId; motiveId: MotiveId; methodId: MethodId; requiredEvidenceIds: EvidenceId[]; confessionPressureThreshold: number; mandatoryContradictionIds: ContradictionId[]; }
export interface LocalResponseDef { id: string; suspectId: SuspectId; intent: string; keywordGroups: string[][]; text: string; statementId: StatementId|null; priority: number; isGeneric: boolean; }
export interface ScoringRules { incorrectCombinationPenalty: number; confessionBonus: number; correctAccusationBonus: number; partialSuspectBonus: number; timeRemainingFactor: number; minimumScore: 0; }
export interface AccusationInput { suspectId: SuspectId; motiveId: MotiveId; methodId: MethodId; evidenceIds: EvidenceId[]; }
export type AccusationResult = 'victory' | 'defeat';
export type GamePhase = 'title'|'instructions'|'active'|'victory_accusation'|'victory_confession'|'defeat_time'|'defeat_accusation';
export type ActiveView = 'desktop'|'casefile'|'evidence'|'call'|'accusation';
export interface ChatMessage { role: 'player'|'suspect'; text: string; timestamp: number; statementId?: StatementId; }
export type ContradictionResult = { type: 'valid'; contradiction: Contradiction } | { type: 'already_discovered' } | { type: 'incorrect' };
export interface ContradictionFeedbackState { type: 'valid'|'already_discovered'|'incorrect'; explanation?: string; }
export interface InterrogationResponse { text: string; statementId: StatementId|null; }
```

### Reglas Numéricas

```typescript
export const SCORING_RULES: ScoringRules = { incorrectCombinationPenalty: 50, confessionBonus: 500, correctAccusationBonus: 300, partialSuspectBonus: 100, timeRemainingFactor: 1, minimumScore: 0 };
```

---

### Lógica (`src/logic/`)

```typescript
// contradictionEngine.ts
export function evaluateContradiction(evidenceId: EvidenceId, statementId: StatementId, discoveredContradictions: Set<ContradictionId>, contradictions: Contradiction[]): ContradictionResult;

// confessionEngine.ts
export function shouldTriggerConfession(calledSuspectId: SuspectId, isCallActive: boolean, isGameActive: boolean, isTimerActive: boolean, currentPressure: number, discoveredContradictions: Set<ContradictionId>, solution: NarrativeSolution): boolean;
// true SOLO si ALL: isGameActive, isCallActive, isTimerActive, calledSuspectId===culpritId, pressure>=threshold, all mandatory discovered

// accusationEngine.ts
export function evaluateAccusation(accusation: AccusationInput, solution: NarrativeSolution): AccusationResult;
export function partialAccusationPoints(accusation: AccusationInput, solution: NarrativeSolution, rules?: ScoringRules): number;

// scoringEngine.ts
export function calculateFinalScore(state: { discoveredContradictions: Set<ContradictionId>; contradictionsData: Contradiction[]; incorrectAttempts: number; victoryType: 'accusation'|'confession'|null; timeRemainingMs: number; rules: ScoringRules; }): number;
// baseScore = sum(discovered.points) - (incorrectAttempts * penalty), min 0
// finalScore = baseScore + victoryBonus + floor(timeRemainingMs/1000) * factor. Once only.

// localResponseEngine.ts
export function normalizeInput(input: string): string;
// minúsculas, NFD+strip diacritics, elimina puntuación, colapsa espacios, trim. Rechaza vacío/>300→''

export function findBestResponse(suspectId: SuspectId, normalizedInput: string, responses: LocalResponseDef[]): LocalResponseDef|null;
// Filtra suspectId+isGeneric===false. Todos términos del grupo deben coincidir. Un grupo basta.
// Varias coincidencias: grupo más específico (más términos), luego mayor priority.

export function getLocalResponse(suspectId: SuspectId, rawInput: string, responses: LocalResponseDef[]): LocalResponseDef;
// Normaliza → findBestResponse. Si null → busca isGeneric===true del suspectId. Siempre retorna LocalResponseDef.

// timerEngine.ts
export function calculateTimeRemaining(endTimestamp: number): number; // ms, Math.max(0,...)
export function isTimeExpired(endTimestamp: number): boolean;
export function timeRemainingSeconds(endTimestamp: number): number; // floor(ms/1000)
```

---

### Zustand Store (`src/store/gameStore.ts`)

```typescript
export interface GameState {
  phase: GamePhase;
  activeView: ActiveView;
  score: number;
  incorrectAttempts: number;
  timerEndTimestamp: number | null;
  discoveredContradictions: Set<ContradictionId>;
  suspectPressure: Record<SuspectId, number>;
  accusationUsed: boolean;
  activeCallSuspect: SuspectId | null;
  callSessionId: string | null;
  currentRequestId: string | null;
  callHistory: Record<SuspectId, ChatMessage[]>;
  registeredStatements: Set<StatementId>;
  lastContradictionFeedback: ContradictionFeedbackState | null;
  isInterrogationLoading: boolean;

  // Acciones públicas — superficie mínima para la UI
  startGame: () => void;
  resetGame: () => void;
  openCaseFile: () => void;        // → activeView='casefile'
  openEvidence: () => void;        // → activeView='evidence'
  openAccusation: () => void;      // → activeView='accusation' (NO cambia accusationUsed)
  returnToDesktop: () => void;     // → activeView='desktop' (cancelar acusación no consume intento)
  startCall: (suspect: SuspectId) => void;  // genera callSessionId, activeView='call'
  endCall: () => void;             // limpia llamada, activeView='desktop'
  askQuestion: (question: string) => Promise<void>;  // UI solo entrega texto
  presentEvidence: (evidenceId: EvidenceId, statementId: StatementId) => void;
  submitAccusation: (accusation: AccusationInput) => void;
  triggerTimeDefeat: () => void;
  clearFeedback: () => void;
}
// NO existe: triggerConfession, registerStatement, processResponse, setActiveView('call')
```

**La vista `call` solo se abre mediante `startCall(suspectId)`.** No existe forma de establecer `activeView='call'` sin generar un `callSessionId`.

#### `askQuestion(question)` — flujo completo interno

```
1. // Guardas conjuntas previas: ninguna solicitud, requestId, pregunta ni historial se crea antes de superarlas
   const initial = get()
   if (initial.phase !== 'active') → return
   if (initial.timerEndTimestamp === null) → finalizeGame('defeat_time'); return
   if (isTimeExpired(initial.timerEndTimestamp)) → finalizeGame('defeat_time'); return
   if (initial.activeView !== 'call' || initial.activeCallSuspect === null || initial.callSessionId === null) → return
   if (question.trim().length < 1 || question.length > 300) → return
2. // Las guardas permiten estrechar tipos y capturar valores no nulos para TypeScript
   const suspect: SuspectId = initial.activeCallSuspect
   const sessionId: string = initial.callSessionId
   const reqId = crypto.randomUUID()
3. // Registrar la pregunta después de superar todas las guardas y generar reqId, pero antes de obtener/esperar la respuesta
   const playerMsg: ChatMessage = { role: 'player', text: question, timestamp: Date.now() }
   set(state => ({
     currentRequestId: reqId,
     isInterrogationLoading: true,
     callHistory: { ...state.callHistory,
       [suspect]: [...state.callHistory[suspect], playerMsg] }
   }))
4. Obtener una vez la respuesta local candidata completa:
   const localResp = getLocalResponse(suspect, question, LOCAL_RESPONSES)
   const localCandidate: unknown = { text: localResp.text, statementId: localResp.statementId }
5. const isValidResponse = (value: unknown): value is InterrogationResponse =>
     typeof value === 'object'
     && value !== null
     && Object.keys(value).length === 2
     && Object.hasOwn(value, 'text')
     && Object.hasOwn(value, 'statementId')
     && typeof value.text === 'string'
     && value.text.trim().length > 0
     && value.text.length <= 500
     && (value.statementId === null
       || (value.statementId existe en STATEMENTS
         && STATEMENTS[value.statementId].suspectId === suspect))
6. let finalResponse: unknown
   if config.interrogationMode === 'bedrock' && config.apiUrl !== null:
     try:
       const bedrockResp: unknown = await fetchBedrock(request, config)  // AbortController con timeout
       // Primer nivel: Bedrock solo puede convertirse en finalResponse si cumple el contrato completo.
       finalResponse = isValidResponse(bedrockResp) ? bedrockResp : localCandidate
     catch:
       // Error o timeout descarta Bedrock íntegramente y conserva la respuesta local candidata completa.
       finalResponse = localCandidate
   else:
     finalResponse = localCandidate
7. // Orden obligatorio tras await; no comprobar requestId antes del temporizador
   const current = get()
   if (current.phase !== 'active') → return
   if (current.timerEndTimestamp === null) → finalizeGame('defeat_time'); return
   if (isTimeExpired(current.timerEndTimestamp)) → finalizeGame('defeat_time'); return
   if (current.activeCallSuspect !== suspect) → return
   if (current.callSessionId !== sessionId) → return
   if (current.currentRequestId !== reqId) → return
   // finalizeGame conserva la guarda phase==='active' y limpia loading explícitamente. Si el timer sigue válido,
   // una respuesta con sospechoso, sesión o request obsoletos se ignora sin tocar loading.
8. // Segundo nivel: revalidar defensivamente finalResponse justo antes de volver a tocar historial/declaraciones en el commit final
   if (!isValidResponse(finalResponse)):
     // Descartar íntegramente texto e ID; nunca conservar texto asociado a un statementId inválido.
     const generic: LocalResponseDef | undefined = LOCAL_RESPONSES.find(
       r => r.suspectId === suspect && r.isGeneric === true)
     const genericResponse: unknown = generic
       ? { text: generic.text, statementId: generic.statementId }
       : null
     // La única genérica local se somete exactamente al mismo type guard defensivo.
     if (!isValidResponse(genericResponse)):
       // Catálogo corrupto sin genérica válida: la solicitud vigente termina loading sin alterar historial/declaraciones.
       set(state => state.currentRequestId === reqId
         ? { currentRequestId: null, isInterrogationLoading: false }
         : state)
       return
     finalResponse = genericResponse
   const acceptedResponse: InterrogationResponse = finalResponse
9. // Único commit final atómico: usar el estado más reciente y no volver a agregar la pregunta
   set(state => {
     if (state.currentRequestId !== reqId) return state
     const suspectMsg: ChatMessage = {
       role: 'suspect', text: acceptedResponse.text, timestamp: Date.now(),
       statementId: acceptedResponse.statementId ?? undefined
     }
     const nextCallHistory = { ...state.callHistory,
       [suspect]: [...state.callHistory[suspect], suspectMsg] }
     const nextRegisteredStatements = new Set(state.registeredStatements)
     if (acceptedResponse.statementId !== null):
       nextRegisteredStatements.add(acceptedResponse.statementId) // ID ya validado; la tarjeta usa StatementDef.canonicalText
     return { callHistory: nextCallHistory, registeredStatements: nextRegisteredStatements,
              currentRequestId: null, isInterrogationLoading: false }
   })
```

La UI nunca puede entregar: `ChatMessage`, `statementId`, `requestId`, `callSessionId`, puntos ni presión. `askQuestion` es la única entrada pública de interrogación; `processResponse` y `registerStatement` no existen como acciones públicas. La pregunta se registra una sola vez antes de obtener/esperar la respuesta; una solicitud vigente que falla usa el fallback local, o la genérica válida del mismo sospechoso si la respuesta local candidata está corrupta, y termina `isInterrogationLoading`. Con timer válido, las solicitudes viejas nunca limpian ni pisan el loading de una solicitud nueva; un timestamp nulo o expirado tras `await` finaliza globalmente la partida y `finalizeGame` limpia loading aunque lo detecte una ejecución antigua.

#### `presentEvidence(evidenceId, statementId)` — flujo atómico

```
1. if phase !== 'active' → return
2. if statementId not in registeredStatements → return
3. if timerEndTimestamp === null → triggerTimeDefeat(); return
4. if isTimeExpired(timerEndTimestamp) → triggerTimeDefeat(); return
5. result = evaluateContradiction(evidenceId, statementId, discoveredContradictions, CONTRADICTIONS)
6. if result.type === 'valid':
     const c = result.contradiction
     nextDiscovered = new Set([...discoveredContradictions, c.id])
     nextPressure = { ...suspectPressure, [c.suspectId]: suspectPressure[c.suspectId] + c.pressureIncrease }
     nextScore = score + c.points
     set({ discoveredContradictions: nextDiscovered, suspectPressure: nextPressure, score: nextScore,
           lastContradictionFeedback: { type:'valid', explanation: c.explanation } })
     if (activeCallSuspect !== null):
       const confess = shouldTriggerConfession(activeCallSuspect, true, true,
         !isTimeExpired(timerEndTimestamp), nextPressure[activeCallSuspect], nextDiscovered, SOLUTION)
       if (confess) → finalizeGame('victory_confession')
7. if result.type === 'already_discovered':
     set({ lastContradictionFeedback: { type:'already_discovered' } })
8. if result.type === 'incorrect':
     nextScore = Math.max(0, score - SCORING_RULES.incorrectCombinationPenalty)
     set({ score: nextScore, incorrectAttempts: incorrectAttempts+1, lastContradictionFeedback: { type:'incorrect' } })
```

#### `submitAccusation(accusation)` — flujo interno

```
1. if phase !== 'active' → return
2. if accusationUsed → return
3. if timerEndTimestamp === null → triggerTimeDefeat(); return
4. if isTimeExpired(timerEndTimestamp) → triggerTimeDefeat(); return
5. set({ accusationUsed: true })
6. result = evaluateAccusation(accusation, SOLUTION); crédito parcial = partialAccusationPoints(accusation, SOLUTION)
7. if victory → finalizeGame('victory_accusation')
8. if defeat → finalizeGame('defeat_accusation')
```

#### `finalizeGame(endPhase)` — flujo interno

```
1. if get().phase !== 'active' → return
2. const state = get()
3. const victoryType = endPhase==='victory_confession'?'confession' : endPhase==='victory_accusation'?'accusation' : null
4. const endTs = state.timerEndTimestamp
5. const remainingMs = endTs === null ? 0 : Math.max(0, calculateTimeRemaining(endTs))
6. const finalScore = calculateFinalScore({ discoveredContradictions: state.discoveredContradictions,
     contradictionsData: CONTRADICTIONS, incorrectAttempts: state.incorrectAttempts,
     victoryType, timeRemainingMs: remainingMs, rules: SCORING_RULES })
7. set({ score: finalScore, phase: endPhase, activeCallSuspect: null, callSessionId: null,
         currentRequestId: null, lastContradictionFeedback: null, isInterrogationLoading: false })
8. Cancelar AbortController pendiente
9. Eliminar sessionStorage
```

#### `startCall` / `endCall`

- `startCall(suspect)`: genera `callSessionId=UUID`, `currentRequestId=null`, `activeCallSuspect=suspect`, `activeView='call'`, `isInterrogationLoading=false`. Cancela AbortController anterior y conserva los demás cambios existentes de inicio de llamada.
- `endCall()`: `activeCallSuspect=null`, `callSessionId=null`, `currentRequestId=null`, `activeView='desktop'`, `isInterrogationLoading=false`. Cancela AbortController y conserva los demás cambios existentes de cierre de llamada.
- `resetGame()`: además de restaurar todo el estado inicial y eliminar sessionStorage, establece explícitamente `isInterrogationLoading=false`, anula `currentRequestId` y cancela cualquier AbortController pendiente.
- `finalizeGame(endPhase)`: conserva su guarda `phase === 'active'` y establece explícitamente `isInterrogationLoading=false` junto con la limpieza de llamada y solicitud descrita arriba.

---

### Persistencia (`src/store/persistence.ts`)

```typescript
export interface PersistedGameState {
  version: 1;
  phase: GamePhase;
  activeView: ActiveView;
  score: number;
  incorrectAttempts: number;
  timerEndTimestamp: number;
  discoveredContradictions: ContradictionId[];
  suspectPressure: Record<SuspectId, number>;
  registeredStatements: StatementId[];
  callHistory: Record<SuspectId, ChatMessage[]>;
  accusationUsed: boolean;
  activeCallSuspect: SuspectId | null;
}
// NO persiste: callSessionId, currentRequestId, lastContradictionFeedback, isInterrogationLoading, AbortController

export interface HydratedGameData {
  phase: GamePhase; activeView: ActiveView; score: number; incorrectAttempts: number;
  timerEndTimestamp: number; discoveredContradictions: Set<ContradictionId>;
  suspectPressure: Record<SuspectId, number>; registeredStatements: Set<StatementId>;
  callHistory: Record<SuspectId, ChatMessage[]>; accusationUsed: boolean;
  activeCallSuspect: SuspectId | null;
}

export function serializeState(state: GameState): PersistedGameState;
export function deserializeState(raw: unknown): HydratedGameData | null;
```

**Reglas de persistencia:**
- `Set<T>` → `T[]` al guardar. `T[]` → `Set<T>` al restaurar.
- `deserializeState` devuelve `HydratedGameData | null` (no `GameState` con acciones).
- Zustand combina datos hidratados con acciones del store mediante merge personalizado.
- Valida que todos los IDs existan en datos narrativos. Corruptos → null → nueva partida.
- Solo guarda partidas con `phase === 'active'`. Guarda al iniciar + acciones significativas.
- `timerEndTimestamp` en ms. Duración inicial: 720,000 ms.
- Si `Date.now() >= timerEndTimestamp` → `defeat_time`.
- Si `activeView === 'call'` y `activeCallSuspect` válido → genera `callSessionId` nuevo durante hidratación. `currentRequestId = null`. No reanuda solicitudes.
- Si `activeView === 'call'` y `activeCallSuspect === null` → corrige a `desktop`.
- Si `activeView !== 'call'` y `activeCallSuspect !== null` → corrige a `activeCallSuspect = null`.
- Si sospechoso no existe → corrige a `desktop`.
- Si timer expiró → `defeat_time` (no genera nueva sesión de llamada).
- Elimina sessionStorage al reiniciar o terminar.
- No persiste estados de carga, feedback, requestId, callSessionId, AbortController.

---

### Configuración (`src/config.ts`)

```typescript
export interface AppConfig {
  apiUrl: string | null;
  interrogationMode: 'bedrock' | 'local';
  timerDurationMs: number;
  requestTimeoutMs: number;
}
export const config: AppConfig = {
  apiUrl: import.meta.env.VITE_API_URL || null,
  interrogationMode: (import.meta.env.VITE_INTERROGATION_MODE as 'bedrock'|'local') || 'local',
  timerDurationMs: 720_000,
  requestTimeoutMs: 12_000,
};
```

| Variable | Entorno | Descripción |
|---|---|---|
| `VITE_API_URL` | Frontend | URL endpoint. Vacía → modo local. |
| `VITE_INTERROGATION_MODE` | Frontend | `bedrock` o `local`. |
| `ALLOWED_ORIGINS` | Backend | Orígenes CORS por coma. Configurable. |
| `AWS_REGION` | Backend | Región Bedrock. |
| `BEDROCK_MODEL_ID` | Backend | Modelo. |

No se colocan dominios fijos en el código.

---

### Servicios y Contrato del Backend

**Contrato:**
```
POST /interrogate
Request: { suspectId: SuspectId, question: string (1-300), gameContext: { discoveredContradictionIds: ContradictionId[], suspectPressure: number } }
Response 200: { text: string (1-500 chars, no vacío), statementId: StatementId|null }
Errors: 400, 504, 502
```

**Validación backend:**
- `suspectId` conocido.
- `question` entre 1 y 300 caracteres.
- `discoveredContradictionIds` array de IDs conocidos.
- `suspectPressure` número finito ≥ 0.
- Tamaño máximo del cuerpo.
- Respuesta con texto no vacío ≤ 500 chars.
- `statementId` null o permitido para el sospechoso solicitado.
- Prompt solicita JSON estricto compatible con `InterrogationResponse`.
- Respuesta incompatible con contrato → fallback local completo en frontend.

**Descarte completo**: Si Bedrock devuelve CUALQUIERA de: texto>500, texto vacío, JSON inválido, campos extra incompatibles, tipos incorrectos, statementId desconocido, statementId de otro sospechoso, error, timeout → descartar TODA la respuesta (texto incluido). Usar local.

---

### Prompt Builder (`backend/src/promptBuilder.ts`)

System prompt por sospechoso incluye: personalidad, relación, conocimientos permitidos, mentiras activas, información desconocida, prohibiciones (no inventar evidencias, no cambiar cronología, no salir de personaje, no confesar, no declarar culpable), límite 500 chars en español, lista de statementId permitidos SOLO para ese sospechoso.

Confesión local y predefinida. Bedrock no la activa.

---

## Transiciones de Vistas

| Desde | Hacia | Acción | Notas |
|---|---|---|---|
| desktop | casefile | `openCaseFile()` | |
| casefile | desktop | `returnToDesktop()` | |
| desktop | evidence | `openEvidence()` | |
| evidence | desktop | `returnToDesktop()` | |
| desktop | call | `startCall(suspectId)` | Genera callSessionId |
| call | desktop | `endCall()` | Cancela AbortController |
| desktop | accusation | `openAccusation()` | NO cambia accusationUsed |
| accusation | desktop | `returnToDesktop()` | NO consume intento |
| accusation | — | `submitAccusation(input)` | Única que establece accusationUsed=true |
| cualquier | defeat_time | Timer=0 | Limpia llamada y solicitudes |
| call(Daniel) | victory_confession | `presentEvidence` | Tras tercera contradicción |

La vista `call` SOLO se abre mediante `startCall`. `openAccusation` y `returnToDesktop` no afectan `accusationUsed`. Timer continúa en todas las vistas.

---

## Diseño de Interfaz

### Layout del Escritorio (≥1024px)

```
┌──────────────────────────────────────────────────────────┐
│  [REMOTE DETECTIVE]     ⏱ 08:42     ★ 350 pts          │  Header fijo
├────────────────────┬─────────────────────────────────────┤
│                    │                                     │
│   📁 Expediente   │        ÁREA PRINCIPAL               │
│                    │   (cambia según activeView)         │
│   🔍 Evidencias   │                                     │
│                    │   - desktop: resumen del caso       │
│   📞 Llamar       │   - casefile: datos del caso        │
│                    │   - evidence: grid de evidencias    │
│   ⚖️ Acusar       │   - call: interrogatorio            │
│                    │   - accusation: formulario          │
│                    │                                     │
├────────────────────┴─────────────────────────────────────┤
│  [Declaraciones registradas — zonas de drop]            │  Panel inferior
└──────────────────────────────────────────────────────────┘
```

**Componentes:**
- **Header**: Siempre visible. Timer (mm:ss, rojo <2min), puntuación, título REMOTE DETECTIVE.
- **Sidebar**: Navegación. Siempre visible durante partida activa. Botones para expediente, evidencias, llamar, acusar.
- **Área principal**: Contenido según `activeView`.
- **Panel inferior**: Tarjetas de declaraciones canónicas registradas. Zonas de drop para evidencias (drag-and-drop).

### CallPanel (Vista de Llamada)

Muestra simultáneamente:
- Historial de chat (preguntas y respuestas).
- Campo de pregunta (max 300 chars) + botón enviar + estado de carga (`isInterrogationLoading`).
- Nombre, retrato y nivel de presión del sospechoso.
- Bandeja compacta de las 6 evidencias (desplegable o lateral). Todas disponibles desde el inicio.
- Panel de declaraciones registradas como zonas de drop.
- Botón "Terminar llamada".

El jugador puede arrastrar evidencia sobre una declaración SIN terminar la llamada. Permite descubrir la tercera contradicción de Daniel durante la llamada activa con él, activando la confesión automáticamente.

`activeCallSuspect` se mantiene hasta `endCall()` o fin de partida.

### Declaraciones como Tarjetas

1. Cuando `askQuestion` acepta una respuesta con `statementId` válido → se registra internamente en `registeredStatements`.
2. Aparece tarjeta canónica en panel inferior con `StatementDef.canonicalText`.
3. Solo tarjetas registradas son zonas de drop válidas.
4. Texto dinámico de Bedrock aparece en historial de chat; contradicciones se evalúan contra IDs canónicos.
5. Bedrock no puede inventar declaraciones utilizables.

### Pantalla de Acusación

- Muestra las 6 evidencias disponibles para seleccionar cualquier combinación.
- Selección de sospechoso, motivo, método.
- Botón "Cancelar" regresa al escritorio sin consumir intento.
- Botón "Enviar acusación" muestra confirmación visual.
- Solo tras confirmar se llama a `submitAccusation`.

### Responsive (<1024px)

- Una columna. Sidebar → barra inferior o menú.
- Contenido legible mediante scroll.
- Mensaje: "Para la mejor experiencia, juega desde una computadora."
- Sin drag-and-drop táctil avanzado en el MVP.

---

## Correctness Properties (Invariantes de Diseño)

1. Contradicción válida otorga puntos/presión según datos predefinidos. Una sola vez por contradicción.
2. `already_discovered` no modifica score, pressure ni incorrectAttempts.
3. `incorrect` aplica UNA penalización. Score ≥ 0 siempre.
4. Confesión requiere: partida activa + llamada activa con Daniel + timer activo + presión ≥ 80 + 3 contradicciones obligatorias. Usa valores NUEVOS post-actualización.
5. Confesión no activable por acción pública, UI ni Bedrock.
6. Tercera contradicción de Daniel durante llamada activa con él → confesión automática.
7. Acusación evaluada internamente con `AccusationInput`. UI no envía resultado.
8. Timer expirado prevalece sobre acusación/confesión en curso.
9. `calculateFinalScore` se ejecuta una sola vez al finalizar, reemplaza score, incluye última contradicción.
10. `timerEndTimestamp === null` en partida activa → `defeat_time` seguro, sin error TypeScript.
11. Con timer válido, respuesta con `callSessionId`/`requestId` incorrecto → ignorar silenciosamente sin tocar loading.
12. Respuesta tardía tras fin de partida → no modifica estado; tras fin de llamada con partida activa, timestamp nulo/expirado todavía produce `defeat_time` antes de comprobar la sesión.
13. `statementId` de otro sospechoso → descarta respuesta COMPLETA de Bedrock y usa la respuesta local candidata completa.
14. `statementId` desconocido → descarta respuesta COMPLETA de Bedrock y usa la respuesta local candidata completa.
15. La UI solo entrega texto de pregunta a `askQuestion`. Nunca `ChatMessage`, `statementId`, `requestId`.
16. Reinicio restaura estado completo + borra sessionStorage.
17. Feedback solo leíble por UI, no manipulable.
18. Motor local siempre retorna un `LocalResponseDef` con texto (específico o genérico con ID estable).
19. Existen exactamente 6 declaraciones canónicas utilizables.
20. `setActiveView('call')` no existe. La vista call solo se abre via `startCall`.
21. Abrir acusación no modifica `accusationUsed`. Cancelar no consume intento.
22. `askQuestion` solo genera `requestId`, registra la pregunta e inicia loading si, conjuntamente, `phase==='active'`, timer no nulo/no expirado, `activeView==='call'`, `activeCallSuspect!==null` y `callSessionId!==null`; ninguna guarda fallida genera ID ni historial.
23. Tras `await`, el orden es estricto: fase inactiva se ignora; timestamp nulo produce `defeat_time`; timestamp expirado produce `defeat_time`; solo después se validan sospechoso, sesión y request. La finalización por timer no depende de que la solicitud siga vigente.
24. Con timer todavía válido, una respuesta obsoleta por `activeCallSuspect`, `callSessionId` o `currentRequestId` se ignora sin modificar historial, declaraciones ni loading.
25. Bedrock solo se convierte en `finalResponse` si cumple el contrato completo; Bedrock inválido, error o timeout se descarta totalmente y usa la respuesta local candidata completa. Justo antes del commit final que vuelve a escribir `callHistory`/`registeredStatements`, `finalResponse` se valida de nuevo.
26. Un `statementId` inválido descarta también su texto; jamás se conserva texto asociado a un ID inválido.
27. El commit final de una respuesta vigente agrega atómicamente solo el mensaje aceptado del sospechoso y, si aplica, la declaración canónica, y limpia loading; la pregunta ya fue registrada antes de obtener/esperar la respuesta.
28. El commit final usa el estado más reciente, vuelve a comprobar `state.currentRequestId === reqId`, crea copias nuevas de `callHistory` y `registeredStatements` y, si la solicitud dejó de ser vigente, devuelve el estado sin cambios. La finalización global por timestamp nulo/expirado limpia loading explícitamente aunque la detecte una ejecución antigua.
29. `startCall`, `endCall`, `resetGame` y `finalizeGame` limpian explícitamente `isInterrogationLoading`; las dos acciones de llamada mantienen sus cancelaciones de AbortController.
30. Una respuesta local candidata corrupta se descarta totalmente y se sustituye por la única genérica válida del mismo sospechoso; la genérica también se valida antes de aplicarse.
31. `processResponse` y `registerStatement` no son acciones públicas; `askQuestion` permanece como única entrada pública de interrogación.

---

## Error Handling

### Frontend

| Escenario | Estrategia |
|---|---|
| Bedrock: >500 chars, texto vacío, formato inválido, stmtId desconocido, stmtId otro sospechoso, campos extra, tipos incorrectos | Validar contrato completo; descartar respuesta COMPLETA (texto incluido) y usar la respuesta local candidata completa |
| Error HTTP, timeout (AbortController 12s) | Descartar Bedrock totalmente y usar la respuesta local candidata completa |
| Respuesta tardía con timer válido (requestId/callSessionId no coinciden, llamada terminada, partida terminada) | Ignorar silenciosamente; una solicitud obsoleta no modifica historial, declaraciones ni loading |
| `timerEndTimestamp === null` en partida activa antes de iniciar | `defeat_time` seguro, sin crear requestId, pregunta ni historial |
| Timestamp pasa a null o expira durante `await` | Tras comprobar primero `phase==='active'`, ejecutar siempre `finalizeGame('defeat_time')` antes de revisar sospechoso/sesión/request; limpia loading explícitamente aunque lo detecte una ejecución antigua |
| Timer=0 durante cualquier acción | Derrota inmediata |
| sessionStorage corrupto o no disponible | Descartar datos / funcionar sin persistencia |
| Endpoint no configurado o modo local | Motor local directo, sin fetch |
| Pregunta vacía, >300 chars, fuera de vista call o sin sesión/sospechoso | No inicia solicitud, no genera requestId, no registra pregunta y no modifica historial |
| Acusación incompleta | Impedir envío |
| `finalResponse` inválida/corrupta justo antes de tocar historial/declaraciones | Descartar íntegramente texto e ID y sustituir por la única genérica local válida del mismo sospechoso |
| Respuesta local candidata corrupta (si ocurriera) | La revalidación defensiva de `finalResponse` la descarta totalmente y usa la genérica del sospechoso, también validada; si tampoco es válida, la solicitud vigente termina loading sin alterar historial/declaraciones |

### Backend

| Escenario | Estrategia |
|---|---|
| Solicitud inválida (suspectId desconocido, question fuera de rango, contexto inválido, tamaño excedido) | HTTP 400 |
| `discoveredContradictionIds` con IDs desconocidos | HTTP 400 |
| `suspectPressure` no es número finito ≥ 0 | HTTP 400 |
| Bedrock timeout >10s | HTTP 504 |
| Bedrock error interno | HTTP 502 |
| Origen no permitido | Rechazar CORS |
| Respuesta de Bedrock incompatible con contrato | Fallback local en frontend |

---

## Testing Strategy

**Framework:** Vitest. Pruebas deterministas con valores concretos. Sin fast-check ni property-based testing.

### Archivos de Pruebas

| Archivo | Escenarios clave |
|---|---|
| `contradictionEngine.test.ts` | valid→puntos+presión correctos; already_discovered→sin cambio; incorrect→una penalización; misma repetida→sin doble |
| `scoringEngine.test.ts` | baseScore; penalizaciones; score≥0; bonus una vez; ms→s; última contradicción incluida; remainingMs negativo→0 |
| `confessionEngine.test.ts` | Todas condiciones→true; parciales→false; timer expirado→false; activeCallSuspect=null→no error; partida inactiva→false |
| `accusationEngine.test.ts` | Correcta→victoria; incorrecta→derrota; evidencias extra OK; evaluación interna; abrir≠consumir; cancelar≠consumir; tras timer→defeat_time |
| `timerEngine.test.ts` | Expirado→derrota cualquier vista; cálculo restante; conversión segundos; null→safe |
| `localResponseEngine.test.ts` | Normalización (acentos, mayúsculas, puntuación, espacios); todos términos grupo requeridos; grupo más específico gana; priority; genérica con ID estable; ≥5 por sospechoso; exactamente 1 genérica por sospechoso; getLocalResponse siempre retorna LocalResponseDef |
| `responseFallback.test.ts` | Sin endpoint→local; modo local→sin fetch; timeout→descarta Bedrock y usa local completa; >500→descarta todo Bedrock y usa local completa; texto vacío→descarta todo Bedrock y usa local completa; formato inválido→descarta todo Bedrock y usa local completa; stmtId desconocido→descarta todo Bedrock (texto incluido) y usa local completa; stmtId otro sospechoso→descarta todo Bedrock y usa local completa; llamada anterior mismo sospechoso→ignorar con timer válido; requestId incorrecto→ignorar con timer válido; respuesta tras fin partida→ignorar; UI no puede suministrar ChatMessage ni statementId; askQuestion genera requestId internamente |
| `gameReset.test.ts` | Reinicio completo; sessionStorage eliminado al reiniciar y terminar |
| `persistence.test.ts` | Set↔Array; activeCallSuspect restaurado; llamada restaurada→nuevo callSessionId; inconsistencia call/view→corrige; IDs inválidos→null; timer expirado→defeat_time; no persiste requestId/callSessionId/feedback/isLoading; solo partidas activas |

### Pruebas adicionales de flujo (integradas en archivos existentes)

- `askQuestion` con pregunta vacía o >300 → no inicia solicitud.
- `timerEndTimestamp=null` no provoca errores de TypeScript ni de ejecución.
- Partida activa sin timestamp → termina segura como defeat_time.
- Llamada restaurada genera callSessionId nuevo.
- Combinación restaurada inconsistente → regresa a desktop.
- `openAccusation` no modifica accusationUsed.
- Datos inválidos del contexto del backend son rechazados (400).
- Existen exactamente 6 declaraciones canónicas.
- `finalizeGame` utiliza estado actualizado (get() después de set()).
- La contradicción final de Daniel se incluye en puntuación final.
- `calculateFinalScore` reemplaza score y se ejecuta una sola vez.
- `activeCallSuspect` válido con `callSessionId=null` → `askQuestion` no inicia solicitud, no genera requestId y no modifica historial.
- `askQuestion` con `activeView!=='call'` → no inicia solicitud aunque existan sospechoso y otros datos válidos.
- Tras superar todas las guardas, `askQuestion` genera `reqId` y registra una sola vez la pregunta antes de obtener/esperar la respuesta; cada guarda fallida deja requestId e historial intactos.
- Tras `await`, `phase!=='active'` se ignora antes de cualquier otra comprobación.
- Si `timerEndTimestamp` pasa a `null` durante `await` → `defeat_time` y loading limpio, incluso si sospechoso, sesión o `reqId` ya son obsoletos.
- Si el timer expira durante `await` → `defeat_time` y loading limpio, incluso si sospechoso, sesión o `reqId` ya son obsoletos.
- El orden post-`await` es literalmente fase, timestamp nulo, timestamp expirado, sospechoso, sesión y request; no se consulta `currentRequestId` antes del timer.
- Con timer válido, una respuesta con sospechoso, sesión o `reqId` obsoleto se ignora sin tocar loading.
- Respuesta Bedrock con `statementId` desconocido o de otro sospechoso → no añade su texto asociado y utiliza la respuesta local candidata completa.
- Error, timeout o cualquier respuesta Bedrock que incumpla el contrato completo → descarta Bedrock íntegramente y utiliza la respuesta local candidata completa.
- La validación defensiva de `finalResponse`, tanto Bedrock como local, ocurre justo antes de añadir el mensaje del sospechoso o modificar `registeredStatements`.
- La aceptación aplica en un único `set()` atómico solo mensaje del sospechoso + declaración canónica + `isInterrogationLoading=false`; no vuelve a agregar la pregunta.
- El commit final usa el estado más reciente, comprueba de nuevo `state.currentRequestId === reqId`, crea copias nuevas y conserva preguntas/mensajes añadidos mientras esperaba; si ya no es vigente, devuelve el estado sin cambios.
- `startCall`, `endCall`, `resetGame` y `finalizeGame` establecen explícitamente `isInterrogationLoading=false`; `startCall` y `endCall` siguen cancelando la solicitud anterior.
- Error/timeout de una solicitud vigente → fallback local válido y loading finalizado; con timer válido, una solicitud vieja fallida no pisa loading.
- Respuesta local candidata corrupta → se descarta totalmente y utiliza la única genérica válida del mismo sospechoso, validada nuevamente antes de añadir mensaje/declaración.

### Validación de Entrega

```bash
npm run test    # Todas las pruebas pasan
npm run build   # Build de producción sin errores TypeScript
```

Comprobaciones independientes. Ambas deben completarse correctamente.

---

## Deployment

### Frontend (AWS Amplify)

- Build: `npm run build` (Vite → `/dist`).
- AWS Amplify conectado a rama `main`.
- Primera publicación: después de partida local completa y jugable (prioridad 7).
- Actualizaciones progresivas con cada push.
- URL pública HTTPS.

**amplify.yml:**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Backend (AWS SAM)

`backend/template.yaml` define: función Lambda (TypeScript compilado), API Gateway HTTP (POST /interrogate), variables de entorno (`ALLOWED_ORIGINS`, `AWS_REGION`, `BEDROCK_MODEL_ID`), permisos IAM para Bedrock, CORS con orígenes de `ALLOWED_ORIGINS`.

```bash
cd backend
sam build
sam deploy --guided
```

Si el backend no está desplegado, el frontend funciona completamente con `VITE_INTERROGATION_MODE=local`.

### Documentación

| Archivo | Contenido |
|---|---|
| `README.md` | Instalación, ejecución local, variables de entorno, arquitectura, pruebas, despliegue |
| `docs/architecture.md` | Diagrama, flujo de datos, decisiones técnicas |
| `docs/local-setup.md` | Dependencias, ejecución frontend y backend local |
| `docs/aws-deployment.md` | Amplify y SAM, configuración variables |
| `docs/kiro-usage.md` | Uso de Kiro: requirements.md, design.md, tasks.md, steering, decisiones |
| `docs/narrative-structure.md` | Organización de módulos de datos del caso |

---

## Resumen de Decisiones Conservadas

- React, TypeScript, Vite, Zustand (store único), CSS Modules, @dnd-kit/core
- Separación datos/lógica/UI
- 4 sospechosos, 6 evidencias, 6 declaraciones canónicas, 6 contradicciones
- Daniel Rivas como único culpable
- Respuestas locales obligatorias, Bedrock opcional con fallback
- Lambda + API Gateway como integración importante
- AWS Amplify como publicación obligatoria
- Partida de ~12 minutos (720,000 ms)
- Hackathon: 3 días, 3 integrantes
- Sin autenticación, DynamoDB, S3, multijugador, múltiples casos
- Sin desbloqueo progresivo de declaraciones
- Sin fast-check ni property-based testing
- Confesión y acusación evaluadas internamente
- Interrogación interna: UI solo entrega texto de pregunta
- Descarte completo de respuestas inválidas de Bedrock (texto incluido)
- Puntuación final calculada una sola vez al terminar
- Protección asíncrona con callSessionId/requestId internos
- Vista call solo accesible via startCall
- Respuestas genéricas con IDs estables
