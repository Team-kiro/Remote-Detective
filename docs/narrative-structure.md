# Estructura Narrativa — Remote Detective

_Requirements: 21.4_

Este documento describe la organización de los módulos de datos del caso y la secuencia lógica de resolución. Los datos narrativos son **constantes congeladas** definidas en la especificación (`design.md`) antes de la implementación; ningún motor ni componente los modifica en tiempo de ejecución.

---

## El caso: El asesinato de Marcos Linares

| Campo | Valor |
|---|---|
| Víctima | Marcos Linares, 52 años, socio fundador de Linares & Asociados |
| Lugar | Oficina privada, piso 12 del edificio corporativo |
| Hora | Entre las 21:00 y 21:30 del viernes 14 de marzo |
| Causa de muerte | Envenenamiento por cianuro disuelto en whisky |
| Método | El culpable vertió cianuro en la botella personal de Marcos antes de la reunión nocturna |
| Culpable | **Daniel Rivas** |
| Motivo real | Daniel descubrió que Marcos planeaba expulsarlo de la sociedad y denunciarlo por un desfalco de 2 millones. Lo envenenó para silenciarlo. |

---

## Sospechosos (`src/data/suspects.ts`)

Cuatro sospechosos, cada uno con un perfil completo que incluye coartada, hechos verdaderos, mentira principal, secreto, conocimientos y desconocimientos.

| ID | Nombre | Rol | Coartada |
|---|---|---|---|
| `daniel` | Daniel Rivas | Socio financiero, 48 años | Afirma llegar a las 20:50 con Roberto. **Miente:** su tarjeta de acceso registra entrada a las 19:30. |
| `elena` | Elena Vargas | Socia de operaciones, 45 años, exesposa | Afirma llegar después de las 21:00. **Miente:** su tarjeta registra entrada a las 20:45. |
| `roberto` | Roberto Mendoza | Socio de tecnología, 50 años, amigo cercano de Marcos | Llegó a las 20:50. Coartada verificada por el registro. |
| `sofia` | Sofía Castro | Socia de marketing, 38 años | Estuvo en el edificio a las 19:38 y 20:55. Dice no haber visto a nadie a las 19:40. **Miente:** la cámara la muestra observando a Daniel. |

> Los campos `_internal` del tipo `SuspectDef` (relevancia narrativa, sospechosos relacionados) son **Metadatos_Internos** que nunca se exponen en la UI.

---

## Evidencias (`src/data/evidence.ts`)

Seis evidencias disponibles desde el inicio de la partida. La UI muestra: nombre, imagen/placeholder, categoría, descripción e información observable. Los metadatos internos (`_internal`) solo los leen los motores.

| ID | Nombre | Categoría | Información observable clave |
|---|---|---|---|
| `ev_access_log` | Registro de accesos | `document` | Tarjeta de D. Rivas: 19:30 y 20:58. Tarjeta de E. Vargas: 20:45. |
| `ev_toxicology` | Informe toxicológico | `document` | Causa de muerte: cianuro de potasio (KCN). Dosis letal en 8 minutos. |
| `ev_bottle` | Botella de whisky | `physical` | Cianuro en el whisky de la botella personal de Marcos; los demás no bebieron de ella. |
| `ev_email` | Correo electrónico | `document` | "He confirmado el desfalco con ayuda de Roberto. Mañana lo expongo todo." |
| `ev_camera` | Grabación de cámara | `digital` | Daniel entrando a la oficina de Marcos a las 19:30 con una bolsa, saliendo a las 19:40 sin ella. Sofía observando en el pasillo. |
| `ev_receipt` | Recibo de compra | `document` | KCN 50g a nombre de "D. Rivas Consultores", comprado días antes del asesinato. |

---

## Declaraciones (`src/data/statements.ts`)

Declaraciones predefinidas con identificadores únicos. Solo las declaraciones con un `statementId` válido participan en el sistema de contradicciones. Cada sospechoso tiene al menos las declaraciones necesarias para descubrir sus contradicciones.

| ID | Sospechoso | Texto resumido |
|---|---|---|
| `stmt_daniel_arrival` | daniel | "Llegué al edificio a las 20:50…" |
| `stmt_daniel_office` | daniel | "No entré a la oficina de Marcos antes de la reunión…" |
| `stmt_daniel_substance` | daniel | "No manejo sustancias químicas…" |
| `stmt_elena_arrival` | elena | "Llegué después de las nueve…" |
| `stmt_roberto_info` | roberto | "No sabía nada de un desfalco…" |
| `stmt_sofia_witness` | sofia | "No vi a nadie en el edificio…" |

---

## Contradicciones (`src/data/contradictions.ts`)

Seis contradicciones predefinidas. Tres pertenecen a Daniel Rivas; una a cada uno de los otros sospechosos. La UI permite arrastrar una evidencia sobre una declaración; el `contradictionEngine` evalúa el par.

| ID | Sospechoso | Evidencia | Declaración | Presión | Puntos |
|---|---|---|---|---|---|
| `contra_daniel_access` | daniel | `ev_access_log` | `stmt_daniel_arrival` | +30 | 150 |
| `contra_daniel_camera` | daniel | `ev_camera` | `stmt_daniel_office` | +30 | 150 |
| `contra_daniel_receipt` | daniel | `ev_receipt` | `stmt_daniel_substance` | +40 | 200 |
| `contra_elena_arrival` | elena | `ev_access_log` | `stmt_elena_arrival` | +20 | 100 |
| `contra_roberto_info` | roberto | `ev_email` | `stmt_roberto_info` | +20 | 100 |
| `contra_sofia_witness` | sofia | `ev_camera` | `stmt_sofia_witness` | +20 | 100 |

---

## Solución narrativa (`src/data/solution.ts`)

```typescript
const SOLUTION = {
  culpritId: 'daniel',
  motiveId: 'motive_silence',
  methodId: 'method_poison',
  requiredEvidenceIds: ['ev_email', 'ev_camera', 'ev_receipt', 'ev_bottle'],
  confessionPressureThreshold: 80,
  mandatoryContradictionIds: [
    'contra_daniel_access',
    'contra_daniel_camera',
    'contra_daniel_receipt'
  ]
};
```

La presión de Daniel debe alcanzar 80 puntos y las tres contradicciones obligatorias deben estar descubiertas para que se active la confesión.

---

## Secuencia lógica de resolución

El caso es solucionable en al menos 6 pasos lógicos sin adivinar ni depender de Bedrock:

| Paso | Acción | Evidencia | Conclusión |
|---|---|---|---|
| 1 | Comparar tarjetas de acceso con coartadas | `ev_access_log` + `stmt_daniel_arrival` | Daniel mintió sobre su hora de llegada → contradice su coartada |
| 2 | Revisar la grabación de cámara | `ev_camera` + `stmt_daniel_office` | Daniel entró a la oficina con una bolsa y salió sin ella → contradice su negativa |
| 3 | Examinar el recibo de compra | `ev_receipt` + `stmt_daniel_substance` | Daniel compró cianuro a su nombre → contradice su negación de manejar sustancias |
| 4 | Leer el correo electrónico | `ev_email` | Marcos iba a denunciar el desfalco de Daniel → motivo real confirmado |
| 5 | Examinar la botella de whisky | `ev_bottle` + `ev_toxicology` | El cianuro estaba en la botella personal de Marcos → método confirmado |
| 6 | Acusación final | Daniel / silenciar desfalco / envenenamiento / [ev_email, ev_camera, ev_receipt, ev_bottle] | Victoria por acusación correcta |

Alternativamente, al descubrir las tres contradicciones obligatorias de Daniel con presión ≥ 80, se activa la confesión y la partida termina con victoria por confesión.

---

## Módulo de respuestas locales (`src/data/localResponses.ts`)

Banco de respuestas deterministas por sospechoso. Cada respuesta incluye:

- `keywordGroups`: grupos de palabras clave para reconocer la intención del jugador.
- `text`: respuesta del sospechoso en primera persona.
- `statementId`: identificador de la declaración, si la respuesta es relevante para contradicciones.
- `priority`: orden de evaluación (mayor prioridad primero).
- `isGeneric`: si es la respuesta de fallback cuando ninguna clave coincide.

El `localResponseEngine` normaliza la pregunta del jugador (minúsculas, sin acentos, espacios colapsados) y evalúa los grupos de palabras clave en orden de prioridad.

Cada sospechoso tiene al menos 5 respuestas principales + 1 respuesta genérica de fallback que cubre la personalidad del personaje.

---

## Reglas de puntuación (`src/data/scoringRules.ts`)

| Evento | Puntos |
|---|---|
| Contradicción válida descubierta | Según `contradiction.points` (100–200) |
| Acusación correcta | Bonus por tiempo restante |
| Intento incorrecto de contradicción | Sin descuento, pero se registra para el score final |
| Confesión activa | Bonus aplicado en `finalizeGame` |

---

## Restricción de Metadatos_Internos

Los siguientes campos **nunca se muestran en la UI**:

| Entidad | Campo interno | Uso exclusivo |
|---|---|---|
| `EvidenceDef` | `_internal.relevance` | Motor de respuestas Bedrock (contexto del prompt) |
| `EvidenceDef` | `_internal.relatedSuspects` | Motor de respuestas (filtrado de sospechosos) |
| `Contradiction` | *(tabla interna completa)* | `contradictionEngine` y `confessionEngine` |
| `NarrativeSolution` | `culpritId`, `motiveId`, etc. | `accusationEngine` y `confessionEngine` |

La UI accede a los datos de evidencias y sospechosos exclusivamente a través de `src/data/viewModels.ts`, que expone solo los campos visibles.
