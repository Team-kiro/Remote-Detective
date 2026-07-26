# Plan de Implementación: Remote Detective

## Overview

Plan incremental para construir el MVP aprobado con React, TypeScript y Vite, manteniendo datos narrativos congelados, lógica local determinista, Zustand, `sessionStorage`, `@dnd-kit/core`, fallback local obligatorio ante Bedrock y entrega mediante Amplify/SAM. El plan está dimensionado para tres integrantes durante tres días: primero se completa, conecta y prueba una partida local offline; después se incorpora el backend importante pero no bloqueante; finalmente se preparan Amplify, documentación y validación de entrega.

## Tasks

- [x] 1. Preparar la base TypeScript y congelar el caso narrativo
  - [x] 1.1 Configurar el proyecto frontend y las herramientas de validación
    - Crear la estructura Vite/React/TypeScript aprobada, scripts no interactivos de desarrollo, `test` y `build`, Vitest, CSS Modules, Zustand y `@dnd-kit/core`.
    - Configurar TypeScript estricto, aliases necesarios y valores tipados de `src/config.ts`, sin usar `any` en APIs exportadas.
    - Mantener el frontend funcional en modo local cuando no existan variables o servicios de Bedrock.
    - _Requirements: 14.1, 14.3, 15.7, 15.8, 16.6, 19.1_

  - [x] 1.2 Crear los tipos e identificadores estables del dominio
    - Implementar en `src/data/types.ts` los IDs, modelos narrativos, estados de juego, entradas de acusación, mensajes, respuestas y resultados descritos en el diseño.
    - Tipar props, acciones públicas y retornos exportados; separar tipos narrativos, de store y de UI sin dependencias de React en datos o lógica.
    - Representar los cuatro resultados visuales exigidos para contradicciones, incluido “relacionada pero insuficiente”, sin alterar las seis contradicciones válidas congeladas.
    - _Requirements: 1.1-1.5, 8.6-8.9, 13.1-13.2, 14.1-14.3_

  - [x] 1.3 Implementar los datos narrativos congelados del caso
    - Crear módulos separados para los cuatro sospechosos, seis evidencias disponibles desde el inicio, seis declaraciones canónicas, seis contradicciones, solución, cronología y opciones de acusación exactamente como aparecen en `design.md`.
    - Incluir metadatos internos tipados para relevancia y relaciones, pero no exponerlos mediante modelos de presentación.
    - Conservar a Daniel Rivas, las tres contradicciones obligatorias, las cuatro evidencias requeridas y la secuencia lógica aprobada sin añadir personajes, evidencias o mecánicas.
    - _Requirements: 1.1-1.7, 5.1-5.4, 7.7-7.8, 9.1, 12.2-12.3, 14.2, 14.5_

  - [x] 1.4 Implementar respuestas locales, reglas y configuración narrativa
    - Crear el catálogo aprobado con cinco respuestas principales más una genérica por sospechoso, grupos de palabras clave, prioridades y `statementId` permitidos.
    - Crear reglas de puntuación, opciones de motivo/método, duración de 720 000 ms y configuración de endpoint/modo/timeout sin dominios fijos.
    - Mantener todos estos módulos libres de imports de componentes React.
    - _Requirements: 7.1-7.8, 10.1, 11.1-11.4, 12.2, 14.2, 16.1, 16.6_

- [x] 2. Implementar y probar los motores deterministas puros
  - [x] 2.1 Implementar el motor local de respuestas
    - Implementar normalización de mayúsculas, acentos, puntuación y espacios, validando vacío y máximo de 300 caracteres.
    - Resolver coincidencias por grupo completo, especificidad y prioridad; devolver siempre la respuesta específica o la genérica estable del sospechoso.
    - No permitir que el motor local modifique score, presión, contradicciones ni estado de partida.
    - _Requirements: 6.3-6.4, 7.1-7.8, 11.6, 14.3_

  - [x] 2.2 Implementar motores de contradicciones y puntuación
    - Evaluar evidencia/declaración exclusivamente contra datos locales y distinguir válida, ya descubierta, relacionada pero insuficiente e incorrecta.
    - Aplicar puntos y presión una sola vez, penalización única con piso cero y cálculo final único con bonus y segundos restantes.
    - Mantener funciones puras sin imports de React, Zustand o Bedrock.
    - _Requirements: 8.2-8.9, 11.1-11.6, 14.3, 15.1_

  - [x] 2.3 Implementar motores de confesión, acusación y temporizador
    - Evaluar confesión solo con partida, llamada y timer activos, Daniel, presión mínima y las tres contradicciones obligatorias.
    - Evaluar acusación por culpable, motivo, método y subconjunto de evidencias requeridas; permitir evidencias extra sin relajar las requeridas.
    - Calcular tiempo restante desde timestamp, convertir a segundos y detectar expiración con piso cero.
    - _Requirements: 9.1-9.6, 10.1-10.4, 12.7-12.9, 14.3, 15.2-15.4_

  - [x] 2.4 Grupo de pruebas (a): integridad narrativa y motor local
    - Verificar conteos, IDs únicos y referencias cruzadas; exactamente cuatro sospechosos, seis evidencias disponibles, seis declaraciones canónicas utilizables y seis contradicciones distribuidas 3/1/1/1, con solución y secuencia lógica resolubles únicamente mediante datos congelados.
    - Verificar al menos cinco respuestas principales y exactamente una genérica estable por sospechoso, además de dos formulaciones razonables para acceder a cada declaración necesaria.
    - Cubrir normalización de acentos, mayúsculas, puntuación y espacios; vacío y más de 300 caracteres; exigencia de todos los términos del grupo; desempate por mayor especificidad y luego prioridad; coincidencias conocidas y desconocidas.
    - Comprobar que `getLocalResponse` siempre devuelve un `LocalResponseDef` con texto, específico o genérico con ID estable, y que únicamente las seis declaraciones aprobadas participan en contradicciones.
    - **Propiedades cubiertas: 18 y 19; integridad narrativa aprobada.**
    - _Requirements: 1.1-1.7, 6.3-6.4, 7.2-7.8, 7.9, 15.5, 15.7_

  - [x] 2.5 Grupo de pruebas (b): contradicciones, presión, confesión y puntuación
    - Probar cada contradicción válida con sus puntos y presión de catálogo, una sola vez; repetición `already_discovered` sin modificar score, presión ni intentos; combinación incorrecta con una sola penalización y score mínimo cero para valores mayores, iguales y menores que la penalización; evidencia relacionada insuficiente sin penalización.
    - Variar individualmente fase, llamada, timer, sospechoso, presión y contradicciones obligatorias para demostrar que la confesión exige toda la conjunción, no ocurre con condiciones parciales y no puede activarse mediante acción pública, UI o Bedrock.
    - Probar que la tercera contradicción de Daniel durante una llamada activa usa la presión y el conjunto recién actualizados, activa automáticamente `victory_confession`, incluye esa contradicción en la puntuación y no duplica bonus ni cálculo final.
    - Verificar base score, penalizaciones, conversión de milisegundos a segundos, tiempo negativo tratado como cero, bonus único y reemplazo del score por `calculateFinalScore`, ejecutado exactamente una vez.
    - Comprobar que el feedback solo lo producen los motores/store y no existe acción pública para fabricarlo desde UI.
    - **Propiedades cubiertas: 1-6, 9 y 17.**
    - _Requirements: 8.2-8.9, 9.1-9.6, 11.1-11.6, 15.1-15.2_

  - [x] 2.6 Grupo de pruebas (c): acusación, temporizador y finalización
    - Probar acusación correcta, derrota por cada culpable/motivo/método incorrecto y por evidencias requeridas incompletas; aceptar evidencias extra, evaluar internamente desde `AccusationInput` y consumir el intento solo al confirmar.
    - Verificar que abrir o cancelar acusación no cambia `accusationUsed`, que una confirmación es irreversible y que la UI no puede entregar el resultado calculado.
    - Cubrir cálculo de tiempo, formato derivable, expiración desde escritorio, expediente, evidencias, llamada y acusación; timestamp nulo o expirado produce `defeat_time` seguro y prevalece sobre acusación o confesión en curso.
    - Probar que toda finalización detiene el timer, calcula y muestra score una sola vez, limpia llamada, solicitud, feedback y loading; una segunda finalización no altera el resultado.
    - Poblar todo el estado mutable y verificar que `resetGame` restaura presión, score, timer, contradicciones, historial, declaraciones, intento, navegación y estado asíncrono, además de borrar `sessionStorage`.
    - **Propiedades cubiertas: 7-10, 16 y 21.**
    - _Requirements: 9.4-9.5, 10.1-10.4, 11.4-11.5, 12.4-12.9, 13.7, 13.9-13.11, 15.3-15.4, 15.6, 18.5_

- [x] 3. Construir y probar el store Zustand, persistencia e interrogación segura
  - [x] 3.1 Implementar serialización y validación de persistencia
    - Crear `PersistedGameState`, `HydratedGameData`, conversión `Set`/array y validación estricta de versión, tipos e IDs narrativos.
    - Corregir combinaciones inconsistentes de llamada/vista, regenerar sesión de llamada válida y descartar datos corruptos sin restaurar IDs de solicitud, loading, feedback o controladores.
    - Detectar timestamps expirados durante hidratación y producir derrota por tiempo.
    - _Requirements: 10.3, 13.7, 14.1, 18.1-18.7_

  - [x] 3.2 Crear el estado inicial y las acciones de navegación del `gameStore`
    - Implementar un único store con fases, vistas, timer, score, presión, historial, declaraciones, llamadas y superficie pública mínima definida en el diseño.
    - Implementar inicio, navegación entre paneles, apertura/cierre seguro de llamadas, cancelación de acusación y timer continuo sin exponer `setActiveView('call')`.
    - Generar `callSessionId` solo mediante `startCall` y limpiar solicitud/loading al iniciar o terminar llamadas.
    - _Requirements: 2.4-2.5, 3.1-3.3, 6.1-6.2, 6.9-6.11, 10.1-10.2, 13.1-13.8_

  - [x] 3.3 Integrar contradicciones, finalización, acusación y reinicio en el store
    - Implementar `presentEvidence` atómico sobre declaraciones registradas, usando valores nuevos para presión/contradicciones antes de comprobar confesión.
    - Implementar `submitAccusation`, `triggerTimeDefeat` y `finalizeGame` internos con precedencia del timer, único intento confirmado y cálculo final exactamente una vez.
    - Implementar reinicio completo, limpieza de llamadas/solicitudes/feedback/loading y eliminación de persistencia al terminar o reiniciar.
    - _Requirements: 8.2-8.10, 9.1-9.6, 10.3-10.4, 11.1-11.6, 12.4-12.9, 13.7-13.11, 15.1-15.4, 15.6_

  - [x] 3.4 Implementar `askQuestion` y el servicio Bedrock con fallback local seguro
    - Implementar todas las guardas previas conjuntas antes de crear request ID, loading, pregunta o historial; la UI solo podrá entregar texto.
    - Registrar la pregunta una vez, obtener una candidata local completa y usar Bedrock solo en modo configurado, con `AbortController`, timeout y contexto local permitido.
    - Validar exactamente `{ text, statementId }`, máximo 500 caracteres y pertenencia del ID al sospechoso; ante cualquier incumplimiento descartar toda la respuesta Bedrock y usar la candidata local.
    - Respetar el orden post-`await`: fase, timestamp nulo, expiración, sospechoso, sesión y request; hacer el commit final atómico con estado reciente y revalidación defensiva.
    - Mantener fallos y respuestas obsoletas no intrusivos, sin permitir que Bedrock altere ninguna regla de juego; el fallback local es obligatorio y suficiente para terminar la partida.
    - _Requirements: 6.3-6.9, 7.7-7.9, 11.6, 14.4, 16.1-16.6_

  - [x] 3.5 Conectar `sessionStorage` al ciclo de vida del store
    - Guardar la partida activa al iniciarla y después de cada acción significativa: inicio y fin de llamada, respuesta aceptada, declaración canónica registrada, commit atómico de mensaje más declaración, presentación de evidencia, cambios de contradicciones, presión, score o intentos incorrectos, navegación persistida y cancelación de acusación si se persiste la vista.
    - Escribir el mensaje aceptado del sospechoso y la declaración canónica en `sessionStorage` solo después de que el commit atómico conjunto haya sido aceptado; nunca persistir un estado parcial ni una solicitud pendiente.
    - Persistir `timerEndTimestamp`, nunca el tiempo restante literal; no guardar cada segundo ni durante una solicitud pendiente.
    - No persistir `requestId`, `callSessionId`, `AbortController`, loading, feedback ni ningún estado transitorio de pending.
    - Hidratar una partida activa calculando el tiempo real transcurrido, crear una nueva sesión de llamada si corresponde y no reanudar solicitudes pendientes.
    - Degradar de forma segura si `sessionStorage` no está disponible y eliminar la sesión al finalizar o reiniciar.
    - _Requirements: 18.1-18.7, 10.3-10.4, 13.11, 14.4_

  - [x] 3.6 Grupo de pruebas (d): persistencia e hidratación
    - Probar serialización `Set`↔array, versión y validación exhaustiva de IDs/tipos; datos corruptos o incompletos devuelven `null` y permiten una partida nueva.
    - Verificar guardado de todos los eventos significativos definidos en 3.5 y ausencia de escrituras por tick, pending o estados transitorios; comprobar que solo se guardan partidas activas y que finalizar o reiniciar elimina la sesión.
    - Hidratar `activeCallSuspect` válido con un `callSessionId` nuevo; corregir llamada sin sospechoso, sospechoso sin vista call y sospechoso inexistente a escritorio; no reanudar solicitudes.
    - Confirmar que un timestamp expirado hidrata `defeat_time`, que el tiempo se recalcula con reloj real y que no se persisten request ID, call session ID, feedback, loading ni controladores.
    - Verificar navegación restaurada, cancelación de acusación persistida cuando corresponda y degradación segura si `sessionStorage` no está disponible.
    - **Invariantes de persistencia e hidratación aprobados.**
    - _Requirements: 10.3-10.4, 13.6-13.7, 18.1-18.7_

  - [x] 3.7 Grupo de pruebas (e): interrogación asíncrona, fallback y concurrencia
    - Hacer fallar por separado cada guarda previa —fase, timestamp nulo/expirado, vista, sospechoso, sesión, pregunta vacía o mayor a 300— y comprobar que no se crea request ID, loading, pregunta ni historial; tras superarlas, generar el ID internamente y registrar exactamente una pregunta antes de esperar.
    - Verificar que la superficie pública acepta solo texto en `askQuestion`, que no existen `processResponse`, `registerStatement`, `triggerConfession` ni setter público de feedback/vista call, y que `startCall` es la única vía para abrir llamada y generar sesión.
    - Cubrir modo local y endpoint ausente sin `fetch`; error, timeout, JSON inválido, campos extra, tipos erróneos, texto vacío o mayor a 500, `statementId` desconocido o de otro sospechoso: descartar toda la respuesta Bedrock —texto incluido— y usar la candidata local completa.
    - Revalidar toda respuesta justo antes del commit; si la candidata local está corrupta, usar la única genérica válida del mismo sospechoso, también validada; si ambas fallan, terminar loading sin añadir historial ni declaraciones.
    - Probar literalmente el orden post-`await`: fase inactiva se ignora; timestamp nulo o expirado produce `defeat_time` y limpia loading incluso con sospechoso, sesión o request obsoletos; solo después se validan sospechoso, `callSessionId` y `requestId`.
    - Con timer válido, cubrir sospechoso, sesión o request obsoletos —incluida llamada anterior al mismo sospechoso— sin cambios en historial, declaraciones ni loading; una respuesta tras fin de partida tampoco modifica estado.
    - Verificar commit final único y atómico de mensaje aceptado del sospechoso más declaración canónica, sin repetir pregunta, con copias nuevas y segunda guarda del request; conservar mensajes añadidos concurrentemente y no pisar cambios si la solicitud dejó de ser vigente.
    - Confirmar que `startCall`, `endCall`, `resetGame` y `finalizeGame` limpian loading; inicio/fin de llamada cancelan la solicitud anterior; una solicitud vieja fallida no limpia el loading de una nueva.
    - **Propiedades cubiertas: 5, 11-15, 20, 22-31.**
    - _Requirements: 6.3-6.11, 7.6-7.9, 9.3, 10.3-10.4, 11.6, 13.2, 13.5, 13.7, 14.1, 14.4, 15.5, 16.1-16.5_

- [ ] 4. Implementar y probar la experiencia frontend y drag-and-drop
  - [x] 4.1 Implementar pantallas de título, instrucciones y composición principal
    - Crear título/subtítulo exactos, acción de inicio, instrucciones completas y retorno visible.
    - Componer `App`, `TitleScreen`, `InstructionsScreen`, `GameScreen` y `EndScreen` según `phase`, sin duplicar estado global.
    - Mostrar resultado, tipo de victoria/derrota, score final y reinicio en fases terminales.
    - _Requirements: 2.1-2.5, 13.1, 13.9-13.11_

  - [x] 4.2 Implementar escritorio, expediente, evidencias y HUD persistente
    - Crear header con timer `mm:ss` y score, navegación diferenciada y retorno al escritorio en todas las vistas activas.
    - Crear expediente con víctima, crimen y cuatro perfiles; crear lista/detalle de las seis evidencias con visual o placeholder.
    - Usar view models que omitan relevancia, sospechosos relacionados y contradicción resuelta.
    - _Requirements: 3.1-3.3, 4.1-4.3, 5.1-5.5, 10.1-10.2_

  - [ ] 4.3 Implementar formulario y confirmación de acusación
    - Crear selecciones para sospechoso, motivo, método y una o más de las seis evidencias, con validación de campos faltantes.
    - Mostrar confirmación antes de llamar a `submitAccusation`; cancelar debe volver al escritorio sin consumir el intento.
    - Deshabilitar nuevos envíos después de una acusación confirmada y dejar que el store determine victoria o derrota.
    - _Requirements: 12.1-12.9, 13.6, 14.4_

  - [ ] 4.4 Implementar panel de llamadas, historial y entrada de preguntas
    - Mostrar selector de cuatro sospechosos, retrato, nombre, presión, historial persistente por sospechoso y acción de terminar llamada.
    - Implementar campo máximo 300, validación visible de vacío, loading, errores no bloqueantes y distintivo discreto de modo local.
    - Renderizar declaraciones registradas usando el texto canónico, sin aceptar IDs o mensajes creados por la UI.
    - _Requirements: 6.1-6.11, 7.8, 14.4, 16.5_

  - [ ] 4.5 Implementar contradicciones con `@dnd-kit/core`
    - Crear evidencias arrastrables y declaraciones canónicas registradas como únicos destinos válidos, con soporte pointer y keyboard.
    - Cancelar drops fuera de una declaración sin evaluar; presentar feedback diferenciado para contradicción válida, evidencia relacionada pero insuficiente, combinación incorrecta y contradicción ya descubierta.
    - La UI y `@dnd-kit/core` solo llaman `presentEvidence(evidenceId, statementId)`; el store decide internamente el resultado, los cambios de estado y la posible confesión.
    - La tercera contradicción obligatoria de Daniel, cuando se cumplen la presión y las demás condiciones, activa la confesión automática y finaliza la partida mediante `victory_confession`.
    - Mantener las seis evidencias disponibles durante la llamada; no hace falta ejecutar `endCall` antes de presentar la evidencia. La UI solo llama `presentEvidence` y, si la tercera contradicción obligatoria satisface la presión y las demás condiciones, el store finaliza inmediatamente la partida como `victory_confession`.
    - _Requirements: 5.1, 8.1-8.10, 9.1-9.3, 13.8_

  - [ ] 4.6 Aplicar estética noir y adaptación mínima del viewport
    - Crear paleta de grises/negros con máximo dos acentos, componentes inspirados en expedientes y placeholders para todos los recursos faltantes.
    - Optimizar el layout para 1024 px o más; debajo de ese ancho reorganizar a una columna y mostrar la recomendación de escritorio.
    - Mantener header, timer y score visibles y legibles sin implementar drag-and-drop táctil avanzado.
    - _Requirements: 3.2, 5.4, 20.1-20.6_

  - [ ] 4.7 Grupo de pruebas (f): superficie pública y flujos críticos UI
    - Automatizar título e instrucciones, inicio de partida, navegación entre todos los paneles sin pérdida de estado, retorno al escritorio, inicio/fin de llamadas y render de resultado/reinicio.
    - Verificar timer y score permanentes en expediente, evidencias, llamada y acusación; expediente completo; seis evidencias con visual/placeholder; ausencia de metadatos internos en la superficie renderizada.
    - Cubrir campo de pregunta vacío, espacios y límite de 300; loading, historial por sospechoso, texto canónico de declaraciones y distintivo local no intrusivo.
    - Probar acusación incompleta, confirmación, cancelación sin consumir intento, selección de cualquiera de las seis evidencias y bloqueo tras el único envío confirmado.
    - Probar zonas de drop visibles, drop fuera de declaración sin evaluación, soporte de flujo pointer/keyboard y render distinto de los cuatro feedbacks; comprobar que UI/dnd-kit solo invoca `presentEvidence` y no fabrica resultado, presión, score, feedback ni confesión.
    - Añadir comprobaciones de tipos/API para que UI solo entregue texto a `askQuestion` y `AccusationInput` a `submitAccusation`, sin `ChatMessage`, `statementId`, IDs internos, resultado ni acciones públicas prohibidas.
    - Automatizar los flujos locales críticos completos: victoria por confesión, victoria por acusación, derrota por acusación incorrecta y derrota por timer desde cada vista, con reinicio completo.
    - **Propiedades de superficie pública cubiertas: 5, 7, 15, 17, 20, 21 y 31.**
    - _Requirements: 2.1-2.5, 3.1-3.3, 4.1-4.3, 5.1-5.5, 6.1-6.11, 8.1, 8.9-8.10, 9.1-9.5, 10.2-10.4, 12.1-12.9, 13.2-13.11, 14.1, 14.4, 15.2-15.6, 20.1-20.6_

- [ ] 5. Checkpoint MVP local - Ensure all tests pass
  - Ejecutar en modo no interactivo todas las pruebas deterministas frontend y el build TypeScript/Vite del MVP local conectado: datos, motores, store, persistencia, interrogación local, pantallas, flujo UI y `@dnd-kit/core`.
  - Verificar explícitamente mediante pruebas automatizadas una partida completa offline con victoria por confesión, victoria por acusación, derrota por tiempo y derrota por acusación incorrecta, sin backend, API Gateway ni Bedrock.
  - Confirmar que el fallback local permite continuar y finalizar la partida si el endpoint falta, falla o se retrasa.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implementar y probar el backend importante pero no bloqueante
  - [ ] 6.1 Preparar el paquete backend y la plantilla SAM
    - Crear proyecto TypeScript independiente bajo `backend/`, scripts de build/test y `template.yaml` para Lambda y `POST /interrogate` en API Gateway.
    - Declarar variables `ALLOWED_ORIGINS`, `AWS_REGION` y `BEDROCK_MODEL_ID`, permisos IAM mínimos para Bedrock y timeout coherente con el contrato.
    - Mantener el backend posterior e independiente del checkpoint local: su ausencia, retraso o fallo no debe impedir build, publicación ni juego completo del frontend.
    - _Requirements: 16.6, 17.1, 17.5-17.7_

  - [ ] 6.2 Implementar validación de solicitudes y construcción de prompts
    - Validar tamaño del cuerpo, sospechoso conocido, pregunta de 1 a 300, IDs de contradicción conocidos y presión finita no negativa; devolver 4xx con campo inválido.
    - Construir prompts por sospechoso solo desde datos aprobados, con personalidad, conocimientos, mentiras, prohibición de confesar o cambiar hechos y lista de `statementId` permitidos.
    - Exigir JSON estricto compatible con texto no vacío de hasta 500 caracteres e ID permitido o `null`.
    - _Requirements: 16.2-16.4, 17.2-17.4_

  - [ ] 6.3 Implementar cliente Bedrock, handler, timeout y CORS
    - Invocar Bedrock para solicitudes válidas, parsear/validar su salida y devolver únicamente el contrato aprobado.
    - Devolver 504 al superar 10 segundos y 502 ante fallos del proveedor, sin filtrar detalles internos.
    - Aplicar CORS mediante lista configurable que soporte origen local y dominio Amplify, sin hardcodear dominios.
    - _Requirements: 16.1-16.5, 17.1, 17.3-17.6_

  - [ ] 6.4 Grupo de pruebas (g): contrato backend
    - Cubrir request válido; sospechoso desconocido; pregunta vacía o mayor a 300; contexto ausente o mal tipado; cuerpo excedido; IDs de contradicción desconocidos; presión no numérica, infinita, negativa o ausente; y respuesta 4xx con identificación del campo inválido.
    - Verificar origen local y Amplify permitidos mediante configuración, origen no permitido rechazado, timeout de Bedrock mayor a 10 segundos como 504 y error del proveedor como 502 sin detalles internos.
    - Comprobar que el prompt usa únicamente perfil, conocimientos, mentiras y `statementId` permitidos del sospechoso, prohíbe inventar hechos, cambiar cronología, confesar o decidir culpabilidad y solicita JSON estricto.
    - Probar salida válida y salidas con JSON inválido, campos extra, tipos incorrectos, texto vacío o mayor a 500, ID desconocido o perteneciente a otro sospechoso; ninguna salida fuera de contrato puede devolverse como respuesta válida.
    - Ejecutar build y pruebas backend mediante sus scripts reproducibles, sin convertir su disponibilidad en requisito para las pruebas o build del frontend local.
    - _Requirements: 15.7, 16.2-16.6, 17.1-17.7_

- [ ] 7. Preparar Amplify, documentación y artefactos reproducibles de entrega
  - [ ] 7.1 Configurar build y hosting del frontend en AWS Amplify
    - Crear `amplify.yml` con `npm ci`, `npm run build`, artefactos `dist` y caché de dependencias.
    - Asegurar que configuración local/Bedrock se inyecta por variables y que el frontend publicado queda completamente funcional en modo local aunque el backend falle, no esté desplegado o se retrase.
    - Mantener la configuración compatible con conexión de la rama principal y publicación HTTPS, sin incluir credenciales ni convertir Lambda/Bedrock en dependencia del build.
    - _Requirements: 19.1-19.4, 16.5-16.6, 17.7_

  - [ ] 7.2 Crear la documentación técnica y de Spec-Driven Development
    - Crear `README.md` y los documentos aprobados de arquitectura, setup local, despliegue Amplify/SAM, uso de Kiro y estructura narrativa.
    - Documentar comandos, variables, modo local predeterminado, fallback obligatorio, separación datos/lógica/UI, decisiones tomadas con Kiro y trazabilidad a `requirements.md`, `design.md` y `tasks.md`.
    - Explicar la secuencia lógica del caso, organización de módulos, ejecución independiente de frontend/backend y alcance de tres integrantes/tres días sin revelar metadatos internos en la UI ni añadir funcionalidad fuera de alcance.
    - _Requirements: 21.1-21.4_

- [ ] 8. Checkpoint final de entrega - Ensure all tests pass
  - Ejecutar en modo no interactivo la suite frontend completa, pruebas backend, build TypeScript/Vite y validación de la plantilla SAM.
  - Confirmar que Amplify puede construir y publicar el frontend funcional en modo local con HTTPS aunque el backend no esté disponible, y que la configuración Bedrock conserva fallback local.
  - Confirmar que documentación y artefactos reproducen instalación, pruebas, builds y despliegues aprobados.
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Distribución recomendada para tres días y tres integrantes: Día 1 — base, datos y motores (integrante A), store y persistencia (B), shell UI y estilos (C); Día 2 — flujo local completo y `@dnd-kit/core` (A+C), interrogación y fallback (B), cierre de pruebas locales por los tres; Día 3 — backend SAM no bloqueante (A), Amplify y documentación (B), correcciones y validación final (C con apoyo del equipo).
- El hito no negociable antes del backend es una partida local determinista, conectada y probada. Bedrock, Lambda y API Gateway nunca bloquean el juego, el build ni la publicación del frontend; `sessionStorage` se integra antes del checkpoint local conforme al diseño aprobado.
- Todas las pruebas descritas son deterministas y obligatorias. El diseño exige Vitest con casos concretos reproducibles, no `fast-check` ni generación property-based.
- Los siete grupos de pruebas consolidan íntegramente las 31 propiedades de corrección y los escenarios adicionales aprobados en `design.md`; la consolidación no reduce cobertura.
- Los checkpoints no introducen pruebas manuales de aceptación ni despliegues: validan mediante comandos y pruebas automatizadas los artefactos creados. La conexión efectiva del repositorio en Amplify y la publicación HTTPS quedan habilitadas por la configuración.
- No se incluyen autenticación, base de datos, S3, múltiples casos, dificultad, multijugador, editor, ranking, pagos, chat, aplicación nativa, evidencias ocultas ni drag-and-drop táctil avanzado.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4"] },
    { "id": 3, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 4, "tasks": ["2.4"] },
    { "id": 5, "tasks": ["3.1"] },
    { "id": 6, "tasks": ["3.2"] },
    { "id": 7, "tasks": ["3.3"] },
    { "id": 8, "tasks": ["3.4"] },
    { "id": 9, "tasks": ["3.5"] },
    { "id": 10, "tasks": ["2.5"] },
    { "id": 11, "tasks": ["2.6"] },
    { "id": 12, "tasks": ["3.6", "3.7"] },
    { "id": 13, "tasks": ["4.1"] },
    { "id": 14, "tasks": ["4.2"] },
    { "id": 15, "tasks": ["4.3", "4.4"] },
    { "id": 16, "tasks": ["4.5"] },
    { "id": 17, "tasks": ["4.6"] },
    { "id": 18, "tasks": ["4.7"] },
    { "id": 19, "tasks": ["5"] },
    { "id": 20, "tasks": ["6.1"] },
    { "id": 21, "tasks": ["6.2"] },
    { "id": 22, "tasks": ["6.3"] },
    { "id": 23, "tasks": ["6.4"] },
    { "id": 24, "tasks": ["7.1", "7.2"] },
    { "id": 25, "tasks": ["8"] }
  ]
}
```
