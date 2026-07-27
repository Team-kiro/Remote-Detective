# Remote Detective

Juego web de investigación criminal con estética noir. El jugador asume el papel de un detective remoto que debe resolver un asesinato antes de que se agote un temporizador de 12 minutos. El caso siempre es solucionable con lógica y evidencias locales; Amazon Bedrock es una capa opcional que nunca bloquea la partida.

> **Guía para agentes de IA:** Leer [`AGENTS.md`](AGENTS.md) y los archivos de instrucciones en [`.github/instructions/`](.github/instructions/). Contienen las reglas de contribución, estándares de código y restricciones de arquitectura. Este README está dirigido a desarrolladores humanos.

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Instalación local](#2-instalación-local)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Comandos del frontend](#4-comandos-del-frontend)
5. [Comandos del backend](#5-comandos-del-backend)
6. [Arquitectura](#6-arquitectura)
7. [Despliegue](#7-despliegue)
8. [Pruebas](#8-pruebas)
9. [Spec-Driven Development con Kiro](#9-spec-driven-development-con-kiro)
10. [Estructura narrativa](#10-estructura-narrativa)
11. [Alcance del proyecto](#11-alcance-del-proyecto)

---

## 1. Requisitos previos

| Herramienta | Versión mínima | Uso |
|---|---|---|
| Node.js | LTS actual | Frontend |
| npm | Incluido con Node.js | Frontend |
| AWS SAM CLI | 1.x | Backend (opcional) |
| AWS CLI | 2.x | Despliegue (opcional) |

El frontend puede instalarse y ejecutarse sin ninguna dependencia de AWS.

---

## 2. Instalación local

```bash
# Clonar el repositorio
git clone https://github.com/Team-kiro/Remote-Detective.git
cd Remote-Detective

# Instalar dependencias de ambos paquetes (frontend y backend)
npm run install:all

# O solo el frontend, que basta para jugar y desarrollar
npm --prefix frontend ci
```

La raíz del repositorio es un **enrutador de scripts**: su `package.json` no tiene dependencias y reenvía cada comando a `frontend/` o `backend/`, que se instalan y versionan por separado.

No se requiere ninguna variable de entorno para ejecutar el juego en modo local. El motor de respuestas locales está activo por defecto.

---

## 3. Variables de entorno

El frontend lee variables de entorno con el prefijo `VITE_`. Todas son opcionales: sin ellas el juego funciona en modo local completo.

| Variable | Tipo | Descripción |
|---|---|---|
| `VITE_API_URL` | URL | URL del endpoint `/interrogate` desplegado en API Gateway. Si está vacía o ausente, el modo Bedrock queda desactivado. |
| `VITE_INTERROGATION_MODE` | `bedrock` \| *(vacío)* | Solo tiene efecto si `VITE_API_URL` también está definida. Cualquier otro valor o ausencia activa el modo local. |

**Modo predeterminado:** local. El motor de respuestas deterministas (`frontend/src/logic/localResponseEngine.ts`) se usa siempre como mecanismo principal y como fallback obligatorio ante cualquier fallo de Bedrock.

Para el desarrollo local crear un archivo `frontend/.env.local` (no se versiona):

```env
# Ejemplo con backend desplegado
VITE_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/prod
VITE_INTERROGATION_MODE=bedrock
```

El backend requiere las siguientes variables de entorno en tiempo de ejecución (Lambda / SAM local):

| Variable | Fuente | Descripción |
|---|---|---|
| `ALLOWED_ORIGINS` | Parámetro SAM | Lista de orígenes CORS separados por coma |
| `BEDROCK_MODEL_ID` | Parámetro SAM | ID del modelo a invocar (por defecto `anthropic.claude-3-haiku-20240307-v1:0`) |
| `AWS_REGION` | Inyectado por Lambda | Región de AWS; no declarar en `template.yaml` |

---

## 4. Comandos del frontend

Todos los comandos se ejecutan desde la raíz del repositorio y se reenvían a `frontend/`. También funcionan dentro de `frontend/`.

| Comando | Descripción |
|---|---|
| `npm run install:all` | `npm ci` en `frontend/` y en `backend/` |
| `npm run dev` | Servidor de desarrollo Vite con hot-reload |
| `npm run build` | Type-check (`tsc -b`) y bundle de producción en `frontend/dist/` |
| `npm run preview` | Servidor local del bundle de producción |
| `npm run typecheck` | Type-check sin emitir archivos |
| `npm run lint` | ESLint con `--max-warnings 0` |
| `npm run test` | Suite Vitest completa, modo no interactivo |
| `npm run test:e2e` | Suite Playwright (Chromium); construye y sirve automáticamente |
| `npm run test:e2e:install` | Descarga el binario de Chromium para Playwright (una vez por máquina) |

---

## 5. Comandos del backend

Desde la raíz hay dos atajos: `npm run backend:build` y `npm run backend:test`. El resto de los comandos se ejecutan desde el directorio `backend/`.

```bash
cd backend

# Compilar TypeScript
npm run build

# Ejecutar pruebas Jest
npm test

# Type-check sin emitir
npm run typecheck

# Empaquetar la Lambda (compila con esbuild; obligatorio antes de cualquier despliegue)
sam build

# Iniciar la función Lambda de forma local con SAM (requiere AWS SAM CLI)
sam local start-api \
  --parameter-overrides \
    AllowedOrigins=http://localhost:5173 \
    BedrockModelId=us.anthropic.claude-haiku-4-5-20251001-v1:0

# Desplegar en AWS (primera vez)
sam deploy --guided

# Desplegar con parámetros ya guardados en samconfig.toml
sam deploy
```

> **Nota:** El juego funciona completamente sin el backend. `sam local start-api` requiere credenciales de AWS con permisos `bedrock:InvokeModel` para que Bedrock responda.
>
> **`sam build` antes de cada `sam deploy`.** `sam deploy` por sí solo comprime `CodeUri` aplicando `.gitignore`, deja fuera `dist/` y `node_modules/` y la Lambda arranca con `Runtime.ImportModuleError`.

---

## 6. Arquitectura

Ver [`docs/architecture.md`](docs/architecture.md) para el diagrama completo y la descripción detallada de capas.

### Resumen de capas

El principio rector es que **una partida completa debe ser ganable y perdible con lógica local determinista únicamente**.

| Capa | Ruta | Regla |
|---|---|---|
| Datos narrativos | `frontend/src/data/` | Constantes congeladas y tipos. Sin imports de React, store ni lógica. |
| Motores lógicos | `frontend/src/logic/` | Funciones puras deterministas. Sin React, Zustand ni red. |
| Estado | `frontend/src/store/` | Único store Zustand. Único lugar donde las reglas del juego mutan el estado. |
| UI | `frontend/src/components/` | Renderiza estado y llama acciones públicas. No puede fabricar resultados. |
| E2E | `frontend/e2e-tests/` | Specs Playwright sobre el bundle de producción. Verifican flujos, no aritmética. |

### Stack tecnológico

- **Frontend:** React 19 + TypeScript + Vite
- **Estado global:** Zustand
- **Drag-and-drop:** @dnd-kit/core
- **Persistencia de sesión:** sessionStorage (importante para la presentación; no bloquea el build ni el MVP)
- **Backend (opcional):** AWS Lambda (TypeScript) + Amazon API Gateway + Amazon Bedrock
- **Despliegue frontend:** AWS Amplify
- **CI/CD:** GitHub Actions (`.github/workflows/run-tests.yml`)

---

## 7. Despliegue

Ver [`docs/deployment.md`](docs/deployment.md) para la guía completa de Amplify y SAM.

### Frontend en AWS Amplify

1. Conectar el repositorio en la consola de Amplify.
2. El build está versionado en [`amplify.yml`](amplify.yml) en la raíz del repositorio: Amplify lo detecta solo y no hay que configurar nada en la consola. Dejar la raíz de la app sin cambiar (el repositorio completo), porque las rutas del archivo (`frontend/dist`, `npm --prefix frontend ci`) son relativas a esa raíz.
3. Configurar las variables de entorno `VITE_API_URL` y `VITE_INTERROGATION_MODE` en la consola de Amplify si se quiere habilitar Bedrock. Sin ellas el frontend publicado funciona en modo local.

### Backend con AWS SAM

```bash
cd backend
sam build
sam deploy --guided
```

El despliegue crea: una función Lambda, un API Gateway REST con CORS y los permisos IAM mínimos para invocar Bedrock. La URL de API Gateway resultante (output `InterrogateApi`) es el valor a asignar a `VITE_API_URL`. Los orígenes de `AllowedOrigins` se comparan de forma exacta: sin barra final.

El frontend y el backend son **completamente independientes**. El frontend puede desplegarse antes, después o sin el backend.

---

## 8. Pruebas

### Suite frontend (Vitest)

```bash
npm run test
```

Siete grupos de pruebas deterministas que cubren las 31 Propiedades de Corrección definidas en `design.md`. Los archivos de test están en `frontend/src/**/*.test.{ts,tsx}`.

### Suite E2E (Playwright)

```bash
npm run test:e2e
```

Especificaciones en `frontend/e2e-tests/`. Verifican flujos visibles del jugador (navegación, interrogatorio, drag-and-drop, acusación) contra el bundle de producción.

### Suite backend (Jest)

```bash
cd backend && npm test
```

Pruebas unitarias del handler Lambda, validador, constructor de prompts y cliente Bedrock.

### CI automático

GitHub Actions ejecuta lint, type-check, pruebas unitarias y E2E del frontend, más un job independiente que construye el backend, corre su suite Jest y comprueba con `sam validate --lint` y `sam build` que el paquete desplegable de la Lambda se genera. Todo en paralelo en cada PR a `main` y en cada push a `main`. Ver `.github/workflows/run-tests.yml`.

---

## 9. Spec-Driven Development con Kiro

Ver [`docs/kiro-sdd.md`](docs/kiro-sdd.md) para la descripción detallada del proceso, las decisiones tomadas con Kiro y la trazabilidad completa.

### Documentos spec

| Archivo | Contenido |
|---|---|
| `.kiro/specs/remote-detective/requirements.md` | Requisitos numerados en formato EARS (21 requisitos, ~80 criterios de aceptación) |
| `.kiro/specs/remote-detective/design.md` | Datos narrativos congelados, firmas de motores, superficie del store y 31 Propiedades de Corrección |
| `.kiro/specs/remote-detective/tasks.md` | Plan de implementación incremental con dependencias entre tareas |

Los archivos `openspec/specs/` son copias espejo de los tres documentos anteriores para las herramientas OpenSpec. Ambos conjuntos deben mantenerse sincronizados.

### Trazabilidad

Cada tarea del plan (`tasks.md`) incluye una anotación `_Requirements: X.Y-X.Z_` que señala los criterios de aceptación que cubre. Cada módulo de código incluye el mismo trailer de requisitos en su cabecera de documentación.

---

## 10. Estructura narrativa

Ver [`docs/narrative-structure.md`](docs/narrative-structure.md) para la descripción completa de los módulos de datos del caso.

### Resumen del caso

| Campo | Valor |
|---|---|
| Víctima | Marcos Linares, socio fundador de Linares & Asociados |
| Lugar | Oficina privada, piso 12 del edificio corporativo |
| Causa | Envenenamiento por cianuro disuelto en whisky |
| Culpable | Daniel Rivas |
| Sospechosos | 4 (Daniel Rivas, Elena Vargas, Roberto Mendoza, Sofía Castillo) |
| Evidencias | 6 (disponibles desde el inicio de la partida) |
| Contradicciones | 6 (3 de Daniel, 1 por cada otro sospechoso) |

### Módulos de datos (`frontend/src/data/`)

| Archivo | Contenido |
|---|---|
| `types.ts` | Interfaces TypeScript de toda la capa de datos |
| `suspects.ts` | Los cuatro sospechosos con sus perfiles completos |
| `evidence.ts` | Las seis evidencias con nombre, categoría y descripción observable |
| `statements.ts` | Las declaraciones predefinidas que participan en contradicciones |
| `contradictions.ts` | Las seis contradicciones: par (evidencia, declaración), puntos y presión |
| `solution.ts` | La solución narrativa: culpable, motivo, método y evidencias requeridas |
| `case.ts` | Información pública del caso (víctima, lugar, sospechosos) |
| `accusationOptions.ts` | Opciones disponibles para la acusación final |
| `localResponses.ts` | Banco de respuestas locales por sospechoso con palabras clave |
| `scoringRules.ts` | Puntos por acción y multiplicadores del sistema de puntuación |
| `viewModels.ts` | Adaptadores que convierten datos internos a objetos seguros para la UI |

Los `_internal` fields (relevancia narrativa, sospechosos relacionados, contradicción que resuelve) son `Metadatos_Internos`: nunca se exponen en la UI y solo los usan los motores lógicos.

---

## 11. Alcance del proyecto

Remote Detective es un MVP de hackathon dimensionado para **tres integrantes durante tres días**:

- **Día 1:** datos narrativos, motores lógicos, store y shell UI.
- **Día 2:** flujo local completo, drag-and-drop, interrogación con fallback, pruebas.
- **Día 3:** backend SAM (no bloqueante), Amplify, documentación, validación final.

### Fuera de alcance (MVP)

Autenticación, bases de datos, S3, multijugador, múltiples casos, selección de dificultad, editor de casos, clasificación global, pagos, chat, aplicación móvil nativa, evidencias ocultas y drag-and-drop táctil avanzado.
