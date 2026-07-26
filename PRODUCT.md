# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Persona principal: jugador/a que principalmente usa computadora de escritorio para resolver un caso criminal en una partida corta (10-15 minutos).
- Contexto de uso principal: demo/juego narrativo de hackathon, con foco en deduccion logica usando evidencias y contradicciones.

## Product Purpose

Remote Detective es un juego web de investigacion noir donde el jugador resuelve un asesinato antes de que termine el temporizador. El objetivo es completar una partida totalmente solucionable con logica local (sin dependencia obligatoria de IA).

## Positioning

La propuesta diferencial es una experiencia de detective remota, con caso canonico y solucion determinista: 4 sospechosos, 6 evidencias y 6 contradicciones predefinidas que permiten cerrar el caso por razonamiento, con Bedrock como capa opcional y no bloqueante.

## Operating Context

- Flujo base: pantalla inicial -> instrucciones -> escritorio virtual -> expediente/evidencias/llamadas -> contradicciones por drag-and-drop -> acusacion final.
- Interrogatorios por texto con historial por sospechoso y limite de 300 caracteres por pregunta.
- Mecanica de presion/confesion y sistema de puntuacion durante partida activa.
- Estado de partida con persistencia local de sesion (cuando se habilita en el MVP importante).

## Capabilities and Constraints

- Capacidades confirmadas:
    - Caso narrativo fijo con culpable canonico (Daniel Rivas).
    - Motor de respuestas locales como mecanismo principal del MVP.
    - Temporizador visible y puntuacion durante toda la partida activa.
    - Acusacion final unica e irreversible al confirmar envio.
- Restricciones confirmadas (anti-slop / fuera de alcance MVP):
    - Sin autenticacion, sin multijugador, sin multiples casos, sin editor de casos, sin pagos.
    - Sin requerimiento de experiencia movil completa ni drag-and-drop tactil avanzado.
    - Sin dependencia obligatoria de Bedrock para completar una partida.
- Restricciones tecnicas observadas:
    - Frontend React + TypeScript + Vite, estado global con Zustand, drag-and-drop con @dnd-kit.
    - Viewport principal objetivo >= 1024px; menores a 1024px con reorganizacion basica y recomendacion de jugar en computadora.

## Brand Commitments

- Nombre del producto: "REMOTE DETECTIVE".
- Subtitulo canonico en pantalla inicial: "Solve the case before time runs out."
- Identidad de tono y ambientacion: noir/investigacion criminal, expediente confidencial, interfaz tipo escritorio de detective.
- Paleta objetivo del MVP: base en grises/negros con hasta dos acentos.

## Evidence on Hand

- Especificacion funcional y narrativa:
    - `openspec/specs/proposal.md`
    - `openspec/specs/design.md`
    - `openspec/specs/tasks.md`
- Implementacion existente de frontend:
    - `src/App.tsx`
    - `src/components/screens/TitleScreen.tsx`
    - `src/components/screens/InstructionsScreen.tsx`
    - `src/data/*` (narrativa, sospechosos, evidencias, contradicciones, reglas)
- Ausencias relevantes:
    - No existe `README.md` en el estado actual.
    - Parte de activos visuales finales siguen definidos como placeholders en la especificacion.

## Product Principles

1. El caso siempre debe poder resolverse con evidencia y logica local, sin dependencia externa.
2. La tension de tiempo debe empujar decisiones sin romper claridad del flujo.
3. Toda mecanica clave debe ser trazable a reglas deterministas y datos narrativos versionados.
4. El MVP prioriza partida completa y coherente sobre expansion de features no esenciales.

## Accessibility & Inclusion

- Requisito confirmado: mantener legibilidad y reorganizacion basica en viewports menores a 1024px, incluyendo recomendacion de jugar en computadora cuando la interaccion se degrada.
- Decision abierta: no hay objetivo WCAG explicitado en specs; pendiente definir nivel formal (por ejemplo AA) para siguientes iteraciones.
