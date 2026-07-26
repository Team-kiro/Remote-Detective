# Spec-Driven Development con Kiro — Remote Detective

_Requirements: 21.2, 21.3_

Este documento describe cómo se utilizó Kiro y la metodología Spec-Driven Development (SDD) para diseñar, planificar e implementar Remote Detective. Sirve como evidencia del proceso durante la presentación de la hackathon.

---

## ¿Qué es Spec-Driven Development?

Spec-Driven Development es un proceso en el que la funcionalidad se define completamente en documentos de especificación antes de escribir código. La secuencia es:

```
Requisitos (requirements.md)
        ↓
Diseño (design.md)
        ↓
Plan de tareas (tasks.md)
        ↓
Implementación (código)
        ↓
Pruebas (test files)
```

Kiro es el asistente de IA que ayuda a generar, refinar y mantener coherentes los tres documentos de especificación, y luego implementa las tareas del plan.

---

## Documentos de especificación

### `requirements.md` — Requisitos

Ubicación: `.kiro/specs/remote-detective/requirements.md`

Define los requisitos del sistema en formato EARS (Easy Approach to Requirements Syntax). Cada requisito tiene:

- **Historia de usuario:** qué necesita el jugador o desarrollador.
- **Criterios de aceptación:** condiciones verificables con la sintaxis `WHEN ... THE ... SHALL ...`.

El documento contiene **21 requisitos** con aproximadamente 80 criterios de aceptación individuales que cubren:

| Rango | Área |
|---|---|
| 1 | Caso narrativo coherente y solucionable |
| 2–3 | Pantalla inicial y escritorio virtual |
| 4–5 | Expediente y evidencias |
| 6–7 | Sistema de llamadas y respuestas locales |
| 8 | Sistema de contradicciones |
| 9–10 | Presión, confesión y acusación final |
| 11 | Temporizador |
| 12 | Sistema de puntuación |
| 13–14 | Victoria y derrota |
| 15 | Motor de respuestas Bedrock (opcional) |
| 16–17 | Contrato y validación del backend Lambda |
| 18 | Persistencia con sessionStorage |
| 19 | Despliegue en AWS |
| 20 | Pruebas |
| 21 | Documentación |

### `design.md` — Diseño técnico

Ubicación: `.kiro/specs/remote-detective/design.md`

Define la arquitectura y los datos del sistema:

- **Diseño narrativo definitivo:** perfiles completos de los cuatro sospechosos, las seis evidencias, las seis contradicciones, la solución canónica y la cronología del caso.
- **Firmas de los motores lógicos:** tipos de entrada y salida de cada función pura.
- **Superficie pública del store:** acciones expuestas a la UI y sus invariantes.
- **31 Propiedades de Corrección:** afirmaciones verificables sobre el comportamiento del juego que los tests deben mantener.
- **Decisiones de diseño clave:** justificación de Zustand, @dnd-kit, separación datos/lógica/UI, motor dual local/Bedrock, etc.

### `tasks.md` — Plan de implementación

Ubicación: `.kiro/specs/remote-detective/tasks.md`

Descompone el diseño en tareas concretas con:

- Pasos de implementación específicos.
- Anotación `_Requirements: X.Y-X.Z_` que traza cada tarea a los criterios de aceptación que cubre.
- Grafo de dependencias entre tareas.
- Distribución recomendada por días e integrantes.

Las tareas completadas se marcan con `[x]`; las pendientes con `[ ]`.

---

## Trazabilidad

La trazabilidad garantiza que cada línea de código tiene un requisito que la justifica y un test que la verifica.

### De requisito a código

Cada módulo de código incluye una anotación de requisitos en su cabecera, por ejemplo:

```typescript
/**
 * Motor de contradicciones.
 * Requisitos: 8.2-8.9
 */
```

### De tarea a código

Cada tarea en `tasks.md` lista los archivos que crea o modifica. Al completarla, el checkbox se marca en ambas copias:
- `.kiro/specs/remote-detective/tasks.md`
- `openspec/specs/tasks.md`

### De código a test

Cada motor lógico tiene su archivo de test co-localizado:

| Motor | Test |
|---|---|
| `src/logic/contradictionEngine.ts` | `src/logic/contradictionEngine.test.ts` |
| `src/logic/scoringEngine.ts` | `src/logic/scoringEngine.test.ts` |
| `src/logic/confessionEngine.ts` | `src/logic/confessionEngine.test.ts` |
| `src/logic/accusationEngine.ts` | `src/logic/accusationEngine.test.ts` |
| `src/logic/localResponseEngine.ts` | `src/logic/localResponseEngine.test.ts` |
| `src/logic/timerEngine.ts` | `src/logic/timerEngine.test.ts` |
| `src/data/` | `src/data/narrativeData.test.ts` |

---

## Decisiones tomadas con Kiro

### 1. Datos narrativos congelados

**Decisión:** los cuatro sospechosos, seis evidencias, seis contradicciones y el culpable (Daniel Rivas) se definieron en `design.md` antes de escribir código y no se modifican durante la implementación.

**Razón:** garantiza que el caso siempre sea solucionable por lógica, independientemente del estado de Bedrock. Los tests verifican invariantes sobre los datos congelados.

### 2. Motor de respuestas dual con fallback obligatorio

**Decisión:** el motor local (`localResponseEngine`) es el mecanismo principal. Bedrock es opcional y cualquier respuesta inválida se descarta íntegramente para usar la respuesta local completa.

**Razón:** el requisito 7 exige que el juego sea completamente jugable sin Bedrock. El fallback automático protege la experiencia del jugador ante fallos de red, timeouts o respuestas malformadas.

### 3. Un único store Zustand

**Decisión:** todo el estado del juego en un solo store (`gameStore.ts`) con superficie pública mínima.

**Razón:** la auditabilidad del juego requiere un único punto de mutación. La UI no puede fabricar resultados llamando directamente a los motores.

### 4. Lógica local determinista para todos los resultados del juego

**Decisión:** victoria, derrota, puntuación, presión, confesión y evaluación de la acusación se calculan exclusivamente con funciones locales.

**Razón:** los requisitos exigen que Bedrock no controle ninguna regla del juego. Un jugador que desconecte Bedrock debe obtener exactamente el mismo resultado de juego.

### 5. 31 Propiedades de Corrección en `design.md`

**Decisión:** antes de implementar los motores, se documentaron 31 afirmaciones verificables sobre su comportamiento esperado.

**Razón:** las propiedades sirven como especificación ejecutable de los tests. Los siete grupos de pruebas Vitest cubren íntegramente las 31 propiedades con casos concretos y valores deterministas.

### 6. Separación frontend/backend como proyectos independientes

**Decisión:** el backend tiene su propio `package.json`, `tsconfig.json` y suite de tests Jest, separados del frontend.

**Razón:** el frontend puede desplegarse antes del backend, sin el backend, o con un backend futuro diferente. La independencia es un requisito del MVP para el hackathon de tres días.

---

## Guía para agentes de IA

La guía de contribución para agentes está en [`AGENTS.md`](../AGENTS.md) y en los archivos de instrucciones de `.github/instructions/`. Este documento no la duplica; los agentes deben leer esos archivos directamente.

---

## Flujo de trabajo en la hackathon

```
Día 1
  Kiro genera requirements.md ───────────────────────────┐
  Kiro genera design.md (con datos narrativos congelados) │
  Kiro genera tasks.md (plan por días e integrantes)      │
  Equipo revisa y aprueba los tres documentos ────────────┘
        │
        ▼
Día 1-2 (implementación)
  Integrante A: datos narrativos, motores, store
  Integrante B: shell UI, pantallas, persistencia
  Integrante C: drag-and-drop, interrogatorio, pruebas
        │
        ▼
Día 3 (integración y entrega)
  Backend SAM (no bloqueante)
  Amplify + variables de entorno
  Documentación (este archivo y README.md)
  Validación final: npm run test && npm run test:e2e && npm run lint
```
