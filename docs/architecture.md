# Arquitectura — Remote Detective

_Requirements: 21.1, 21.4_

---

## Principio rector

**Una partida completa debe ser ganable y perdible con lógica local determinista únicamente.** Amazon Bedrock, AWS Lambda y API Gateway son capas de presentación opcionales; nunca controlan el estado del juego, el build ni el despliegue del frontend.

---

## Diagrama de capas

```
┌───────────────────────────────────────────────────────────────────────┐
│                          Navegador del jugador                        │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  UI  —  frontend/src/components/                                │  │
│  │  React 19 + CSS Modules                                         │  │
│  │  Renderiza estado; llama acciones públicas del store            │  │
│  └─────────────────────────────┬───────────────────────────────────┘  │
│                                │ lee / despacha                        │
│  ┌─────────────────────────────▼───────────────────────────────────┐  │
│  │  Estado  —  frontend/src/store/gameStore.ts                     │  │
│  │  Zustand; único punto de mutación de las reglas del juego       │  │
│  │  Llama motores → actualiza estado → notifica a la UI            │  │
│  └──────────────┬──────────────────────────────────────────────────┘  │
│                 │ invoca funciones puras                               │
│  ┌──────────────▼──────────────────────────────────────────────────┐  │
│  │  Motores lógicos  —  frontend/src/logic/                        │  │
│  │  Funciones puras TypeScript; sin React, sin Zustand, sin red    │  │
│  └──────────────┬──────────────────────────────────────────────────┘  │
│                 │ lee constantes                                        │
│  ┌──────────────▼──────────────────────────────────────────────────┐  │
│  │  Datos narrativos  —  frontend/src/data/                        │  │
│  │  Constantes congeladas; sin imports de capas superiores         │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Servicio Bedrock  —  frontend/src/services/bedrockService.ts   │  │
│  │  HTTP opcional hacia API Gateway; fallback automático a local   │  │
│  └──────────────────────────────┬────────────────────────────────── │
└─────────────────────────────────│─────────────────────────────────────┘
                                  │ HTTPS (opcional)
┌─────────────────────────────────▼─────────────────────────────────────┐
│  Backend AWS (opcional)                                               │
│  API Gateway REST  →  Lambda (TypeScript)  →  Amazon Bedrock          │
│  Endpoint: POST /interrogate                                          │
│  Contrato: { text: string, statementId: string }                      │
│  Cualquier respuesta inválida se descarta íntegramente                │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Capas en detalle

### 1. Datos narrativos (`frontend/src/data/`)

Constantes TypeScript puras que definen el caso completo. **Congelados desde la especificación**; ningún motor ni componente puede modificarlos en tiempo de ejecución.

**Regla de importación:** solo puede importar de `frontend/src/data/` misma y de los tipos propios. Prohibido importar React, Zustand, lógica ni servicios.

| Módulo | Responsabilidad |
|---|---|
| `types.ts` | Interfaces y tipos de toda la capa de datos |
| `suspects.ts` | Cuatro sospechosos con perfiles completos |
| `evidence.ts` | Seis evidencias con nombre, categoría, descripción y metadatos internos |
| `statements.ts` | Declaraciones predefinidas con sus identificadores |
| `contradictions.ts` | Seis contradicciones: par (evidencia, declaración), presión, puntos y nueva declaración |
| `solution.ts` | Culpable canónico, motivo, método y evidencias mínimas requeridas |
| `case.ts` | Información pública del caso (víctima, lugar) para el expediente |
| `accusationOptions.ts` | Opciones disponibles en la acusación final |
| `localResponses.ts` | Banco de respuestas por sospechoso con grupos de palabras clave |
| `scoringRules.ts` | Puntos por acción y multiplicadores |
| `viewModels.ts` | Adaptadores que exponen solo los campos visibles para la UI |

Los campos marcados como `_internal` en los tipos (`narrativeRelevance`, `relatedSuspects`, `resolvedContradiction`) son **Metadatos_Internos**: solo los leen los motores. La UI siempre accede a los datos a través de `viewModels.ts`.

### 2. Motores lógicos (`frontend/src/logic/`)

Funciones puras sin efectos secundarios. Dado el mismo estado de entrada siempre producen el mismo resultado, lo que hace la lógica del juego completamente auditable y testeable sin mocks.

| Motor | Responsabilidad |
|---|---|
| `localResponseEngine.ts` | Normaliza la pregunta del jugador, empareja grupos de palabras clave y devuelve la respuesta local con su `statementId` |
| `contradictionEngine.ts` | Evalúa si el par (evidencia, declaración) forma una contradicción válida y calcula la mutación de estado resultante |
| `scoringEngine.ts` | Calcula incrementos de puntuación por acción y la puntuación final de la partida |
| `confessionEngine.ts` | Determina si se cumplen las condiciones de confesión del culpable |
| `accusationEngine.ts` | Evalúa si la acusación final del jugador es correcta |
| `timerEngine.ts` | Calcula el tiempo restante y determina si la partida ha terminado por tiempo |

**Regla de importación:** solo puede importar de `frontend/src/data/` y de otros motores en `frontend/src/logic/`. Prohibido importar React, Zustand ni servicios.

### 3. Estado del juego (`frontend/src/store/`)

Un único store Zustand (`gameStore.ts`) es el único punto donde las reglas del juego mutan el estado. Expone una superficie mínima y deliberada de acciones públicas.

**Acciones públicas principales:**

| Acción | Descripción |
|---|---|
| `startGame()` | Inicializa la partida y arranca el temporizador |
| `askQuestion(text)` | Recibe el texto de la pregunta; orquesta la respuesta (local o Bedrock) y actualiza el historial |
| `presentEvidence(evidenceId, statementId)` | Evalúa el par (evidencia, declaración); actualiza presión, puntos y estado de contradicción; evalúa internamente si se activa la confesión |
| `submitAccusation(input)` | Recibe solo `AccusationInput`; evalúa corrección y finaliza la partida |
| `resetGame()` | Reinicia el estado completo |
| `startCall(suspectId)` | Abre la llamada con un sospechoso |
| `endCall()` | Cierra la llamada activa y regresa al escritorio |

**Invariantes:**
- La UI nunca entrega `ChatMessage`, `statementId`, `requestId` ni `callSessionId`; el store los gestiona internamente.
- `submitAccusation` evalúa la acusación con los motores locales; Bedrock nunca influye en el resultado.
- `finalizeGame` calcula la puntuación final una sola vez al terminar la partida.

**Persistencia:** el store puede persistir en `sessionStorage` mediante el middleware de Zustand. Es un requisito importante para la presentación pero no bloquea el build ni el MVP si no está disponible.

### 4. Interfaz de usuario (`frontend/src/components/`)

Componentes React 19 organizados en cuatro grupos:

| Grupo | Ruta | Contenido |
|---|---|---|
| Pantallas | `frontend/src/components/screens/` | TitleScreen, InstructionsScreen, GameScreen, EndScreen |
| Escritorio | `frontend/src/components/desktop/` | Desktop (layout principal), CaseFile, EvidencePanel, AccusationPanel |
| Llamadas | `frontend/src/components/call/` | CallPanel y la lógica de drop de contradicciones (`contradictionDrop.ts`) |
| Compartidos | `frontend/src/components/shared/` | GameHeader, NavigationBar, Timer, ScoreDisplay |

**Reglas de la UI:**
1. Solo puede leer estado del store y llamar acciones públicas.
2. No puede derivar resultados de juego (victoria, derrota, puntuación, presión, confesión) por su cuenta.
3. Datos narrativos siempre a través de `viewModels.ts`; nunca directamente de `suspects.ts`, `evidence.ts`, etc.
4. CSS Modules con variables del design token (`var(--token)`); sin colores hex en línea.

### 5. Servicio Bedrock (`frontend/src/services/bedrockService.ts`)

Cliente HTTP que envía la pregunta al endpoint `/interrogate`. Implementa:

- **Timeout de 12 segundos** (`REQUEST_TIMEOUT_MS` en `config.ts`).
- **Validación del contrato de respuesta:** `{ text: string, statementId: string }`, texto no vacío y ≤500 caracteres, `statementId` conocido y perteneciente al sospechoso que responde.
- **Descarte completo:** cualquier respuesta inválida se descarta íntegramente (incluido el texto) y se usa la respuesta local completa.

---

## Flujo de una pregunta de interrogatorio

```
Jugador escribe pregunta
        │
        ▼
askQuestion(text) en gameStore
        │
        ├─── modo local ──────────────────────────────────────────────┐
        │                                                             │
        ├─── modo bedrock ────┐                                       │
        │                    ▼                                        │
        │         bedrockService.ask()                                │
        │                    │                                        │
        │         ¿Respuesta válida?                                  │
        │             No ────┴──── Sí                                 │
        │             │            │                                  │
        │             ▼            │                                  │
        │    localResponseEngine   │                                  │
        │       .getResponse()     │                                  │
        │             │            │                                  │
        └─────────────┴────────────┘                                  │
                      │                                               │
                      ▼                                               │
              { text, statementId }                                   │
                      │                                               │
                      ▼                                               │
        ¿statementId válido y del sospechoso?                         │
             No: se descarta y se re-genera en local ─────────────────┘
             Sí: se registra la declaración en el historial
                      │
                      ▼
              UI muestra la respuesta
```

---

## Separación frontend / backend

El frontend y el backend son proyectos independientes con sus propios `package.json`, `package-lock.json`, `tsconfig.json` y suites de pruebas. Se pueden instalar, construir, probar y desplegar por separado. La raíz del repositorio solo contiene un `package.json` sin dependencias que enruta scripts (`npm --prefix frontend …`).

```
Remote-Detective/
├── package.json            ← enrutador de scripts; sin dependencias
├── frontend/               ← proyecto del frontend
│   ├── package.json        ← dependencias React/Vite/Vitest/Playwright
│   ├── src/
│   ├── e2e-tests/
│   └── ...
└── backend/                ← proyecto del backend
    ├── package.json        ← dependencias Lambda/Jest
    ├── src/
    └── template.yaml       ← plantilla SAM
```

El contrato entre ambos es un único endpoint REST:

```
POST /interrogate
Content-Type: application/json

{
  "suspectId": "daniel" | "elena" | "roberto" | "sofia",
  "question": "string (≤300 caracteres)",
  "evidenceId": "string | null"
}

→ 200 { "text": "string", "statementId": "string" }
```

Cualquier error HTTP (4xx, 5xx, timeout) activa el fallback automático al motor local sin interrumpir la partida.
