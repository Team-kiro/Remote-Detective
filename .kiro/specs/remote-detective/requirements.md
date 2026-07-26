# Documento de Requisitos — Remote Detective

## Introducción

Remote Detective es un juego web de investigación criminal con estética noir. El jugador asume el papel de un detective que trabaja de forma remota desde una computadora virtual y debe resolver un asesinato antes de que se agote el tiempo. La experiencia ocurre dentro de un escritorio virtual donde el jugador revisa expedientes, analiza evidencias, interroga sospechosos, detecta contradicciones y realiza una acusación final. La partida dura entre 10 y 15 minutos. El proyecto está diseñado para ser desarrollado en una hackathon de tres días por un equipo de tres personas.

## Glosario

- **Aplicación**: El juego web Remote Detective desplegado como aplicación de página única.
- **Escritorio_Virtual**: La interfaz principal del juego que simula la computadora del detective.
- **Expediente**: Documento dentro del juego que contiene la información del caso (víctima, contexto, sospechosos).
- **Evidencia**: Objeto digital inspeccionable que contiene información relevante para el caso (exactamente 6 por partida).
- **Sospechoso**: Uno de los cuatro personajes que el jugador puede interrogar durante la partida.
- **Declaración**: Respuesta relevante de un sospechoso que queda registrada en el historial y puede utilizarse en el sistema de contradicciones. Solo las declaraciones con un identificador predefinido válido en los datos narrativos participan en el sistema de contradicciones.
- **Contradicción**: Relación verificable entre una evidencia y una declaración que demuestra una inconsistencia en el testimonio de un sospechoso (exactamente 6 por partida).
- **Presión**: Nivel numérico asociado a cada sospechoso que aumenta al descubrir contradicciones válidas.
- **Acusación_Final**: Acción única e irreversible donde el jugador selecciona culpable, motivo, método y evidencias. La acusación solo se consume al confirmar y enviar.
- **Temporizador**: Reloj regresivo visible que limita la duración de la partida. Continúa en todas las vistas de la partida activa.
- **Puntuación**: Valor numérico acumulado durante la partida según las acciones del jugador.
- **Sistema_Llamadas**: Módulo que permite al jugador iniciar y gestionar interrogatorios con sospechosos.
- **Sistema_Contradicciones**: Módulo que evalúa la validez de combinar una evidencia con una declaración mediante lógica local determinista.
- **Motor_Respuestas**: Componente que genera respuestas de los sospechosos mediante respuestas locales (obligatorio) o Amazon Bedrock (importante, no obligatorio para el MVP).
- **Respuestas_Locales**: Conjunto predefinido de respuestas basadas en palabras clave y sinónimos que permiten jugar sin conexión a Bedrock.
- **Solución_Narrativa**: Datos estructurados que definen al culpable (Daniel Rivas), motivo, método y evidencias requeridas. Evaluada exclusivamente mediante lógica local.
- **Confesión**: Evento donde Daniel Rivas admite su crimen al cumplirse las condiciones de presión y contradicciones obligatorias descubiertas, evaluado mediante lógica local determinista.
- **Partida**: Una sesión completa de juego desde el inicio hasta la victoria, derrota o reinicio.
- **Metadatos_Internos**: Información asociada a evidencias y sospechosos que no se muestra al jugador (relevancia narrativa, sospechosos relacionados, contradicciones que resuelve).

---

## Requisitos Obligatorios del MVP

### Requisito 1: Caso narrativo coherente y solucionable

**Historia de usuario:** Como jugador, quiero que el caso sea completamente solucionable mediante lógica y evidencias, para poder resolverlo sin depender de la inteligencia artificial.

#### Criterios de Aceptación

1. THE Solución_Narrativa SHALL definir a Daniel Rivas como culpable, un motivo, un método y un conjunto de entre 2 y 4 evidencias mínimas requeridas para una acusación correcta.
2. THE Aplicación SHALL incluir exactamente cuatro sospechosos con información estructurada que contenga: identidad, relación con la víctima, personalidad, coartada, hechos verdaderos, al menos una mentira verificable, secretos secundarios, motivos aparentes y nivel de presión inicial en cero.
3. THE Aplicación SHALL incluir exactamente seis evidencias, cada una con identificador único, nombre, descripción, categoría e información observable por el jugador.
4. THE Aplicación SHALL incluir exactamente seis contradicciones válidas predefinidas: tres relacionadas directamente con Daniel Rivas y una relacionada con cada uno de los otros tres sospechosos.
5. Daniel Rivas SHALL tener al menos tres declaraciones que participen en contradicciones predefinidas. Cada uno de los otros tres sospechosos SHALL tener al menos una declaración que participe en una contradicción predefinida.
6. THE Solución_Narrativa SHALL ser deducible mediante una secuencia documentada de al menos 3 pasos lógicos donde cada paso conecta una evidencia con una contradicción que descarta a un sospechoso inocente o incrimina a Daniel Rivas, sin requerir adivinación ni una pregunta específica a la inteligencia artificial.
7. Las seis evidencias SHALL estar disponibles para el jugador desde el comienzo de la partida. No se implementarán evidencias ocultas ni mecanismos de desbloqueo de evidencias.

---

### Requisito 2: Pantalla inicial y flujo de inicio

**Historia de usuario:** Como jugador, quiero ver una pantalla de inicio con el título del juego e instrucciones, para entender cómo jugar antes de comenzar.

#### Criterios de Aceptación

1. WHEN el jugador abre la Aplicación, THE Aplicación SHALL mostrar la pantalla inicial con el título "REMOTE DETECTIVE", el subtítulo "Solve the case before time runs out." y un botón para iniciar la partida.
2. WHILE el jugador se encuentra en la pantalla inicial, THE Aplicación SHALL ofrecer acceso a una sección de instrucciones que describa: el objetivo del juego, cómo inspeccionar evidencias, cómo interrogar sospechosos, cómo detectar contradicciones mediante drag-and-drop, y cómo realizar la Acusación_Final.
3. WHEN el jugador se encuentra en la sección de instrucciones, THE Aplicación SHALL ofrecer una acción visible para regresar a la pantalla inicial.
4. WHEN el jugador activa el botón de inicio de partida, THE Temporizador SHALL comenzar la cuenta regresiva.
5. WHEN el jugador activa el botón de inicio de partida, THE Aplicación SHALL mostrar el Escritorio_Virtual.

---

### Requisito 3: Escritorio virtual

**Historia de usuario:** Como jugador, quiero interactuar con un escritorio virtual de detective, para sentir la inmersión noir del juego.

#### Criterios de Aceptación

1. WHILE la Partida está activa, THE Escritorio_Virtual SHALL mostrar elementos de navegación diferenciados que permitan acceder al expediente del caso, al Sistema_Llamadas, a las evidencias y a la pantalla de Acusación_Final.
2. WHILE la Partida está activa, THE Escritorio_Virtual SHALL mostrar el Temporizador y la Puntuación actual del jugador de forma permanente en todas las vistas de la partida (expediente, llamada, evidencias, acusación).
3. WHILE la Partida está activa y el jugador se encuentra en cualquier vista, THE Aplicación SHALL ofrecer un mecanismo de navegación que permita regresar al Escritorio_Virtual sin perder el estado de la Partida.

---

### Requisito 4: Expediente del caso

**Historia de usuario:** Como jugador, quiero abrir el expediente del caso, para conocer los detalles del crimen y los sospechosos.

#### Criterios de Aceptación

1. WHEN el jugador abre el expediente, THE Aplicación SHALL mostrar la información del caso incluyendo nombre de la víctima, causa de muerte, lugar del crimen y una lista de los 4 sospechosos con sus nombres visibles.
2. WHEN el jugador consulta un sospechoso en el expediente, THE Aplicación SHALL mostrar el nombre, descripción del sospechoso, su relación con la víctima y el motivo atribuido.
3. WHEN el jugador se encuentra en la vista de detalle de un sospechoso o en el expediente, THE Aplicación SHALL permitir volver al Escritorio_Virtual.

---

### Requisito 5: Inspección de evidencias

**Historia de usuario:** Como jugador, quiero inspeccionar las evidencias disponibles, para analizarlas y utilizarlas en los interrogatorios.

#### Criterios de Aceptación

1. WHILE la Partida está activa, THE Aplicación SHALL permitir al jugador acceder a la lista completa de las 6 evidencias, mostrando el nombre y la categoría de cada una.
2. WHEN el jugador selecciona una evidencia de la lista, THE Aplicación SHALL mostrar únicamente: nombre, imagen o placeholder, categoría, descripción e información observable por el jugador.
3. THE Aplicación SHALL NO mostrar al jugador la relevancia narrativa interna, los sospechosos relacionados internamente, ni qué contradicción resuelve una evidencia. Estos datos son Metadatos_Internos utilizados exclusivamente por la lógica del juego.
4. THE Aplicación SHALL representar cada evidencia con un recurso visual; si la evidencia no dispone de imagen asignada, THE Aplicación SHALL mostrar un placeholder genérico.
5. WHILE la vista de evidencias está abierta, THE Aplicación SHALL permitir al jugador volver al Escritorio_Virtual.

---

### Requisito 6: Sistema de llamadas e interrogatorio

**Historia de usuario:** Como jugador, quiero llamar a los sospechosos y hacerles preguntas, para obtener información y detectar inconsistencias.

#### Criterios de Aceptación

1. WHILE la Partida está activa, THE Sistema_Llamadas SHALL permitir al jugador seleccionar y llamar a cualquiera de los cuatro sospechosos.
2. WHILE una llamada está activa, THE Sistema_Llamadas SHALL mostrar el nombre, retrato y nivel de presión del sospechoso.
3. WHILE una llamada está activa, THE Sistema_Llamadas SHALL permitir al jugador escribir una pregunta en un campo de texto con un límite máximo de 300 caracteres.
4. IF el jugador intenta enviar una pregunta vacía o que contenga solo espacios en blanco, THEN THE Sistema_Llamadas SHALL mantener deshabilitado el envío e indicar que se requiere texto.
5. WHEN el jugador envía una pregunta, THE Sistema_Llamadas SHALL mostrar un estado visual de carga mientras se genera la respuesta.
6. WHEN el Motor_Respuestas genera una respuesta, THE Sistema_Llamadas SHALL mostrar la respuesta y guardarla en el historial de la llamada.
7. WHEN una respuesta incluye un identificador de declaración predefinido válido en los datos narrativos, THE Sistema_Llamadas SHALL registrar la declaración para uso en el Sistema_Contradicciones.
8. WHILE una llamada está activa, THE Sistema_Llamadas SHALL permitir al jugador presentar una evidencia al sospechoso, lo cual enviará la evidencia como contexto al Motor_Respuestas.
9. WHILE una llamada está activa, THE Sistema_Llamadas SHALL mostrar el historial de preguntas y respuestas de la llamada actual y de llamadas previas al mismo sospechoso.
10. WHILE una llamada está activa, THE Sistema_Llamadas SHALL mostrar un botón para terminar la llamada.
11. WHEN el jugador termina la llamada, THE Aplicación SHALL regresar al Escritorio_Virtual.

---

### Requisito 7: Sistema local de respuestas (obligatorio)

**Historia de usuario:** Como jugador, quiero poder jugar la partida completa sin conexión a Bedrock, para que el juego funcione siempre de forma autónoma.

#### Criterios de Aceptación

1. THE Motor_Respuestas SHALL utilizar el sistema de Respuestas_Locales como mecanismo principal para generar respuestas de los sospechosos en el MVP.
2. THE Respuestas_Locales SHALL incluir un mínimo de 5 respuestas principales por sospechoso, cubriendo las preguntas necesarias para descubrir todas las contradicciones válidas y activar la confesión del culpable.
3. THE sistema de Respuestas_Locales SHALL normalizar la entrada del jugador convirtiendo mayúsculas a minúsculas, eliminando acentos, colapsando espacios múltiples y recortando espacios al inicio y final.
4. THE sistema de Respuestas_Locales SHALL reconocer grupos de palabras clave y sinónimos para emparejar la intención del jugador, sin requerir que escriba una frase exacta.
5. THE sistema de Respuestas_Locales SHALL permitir acceder a cada declaración necesaria mediante al menos dos formulaciones razonables distintas.
6. IF la entrada del jugador no coincide con ningún grupo de palabras clave definido, THEN THE Motor_Respuestas SHALL devolver una respuesta genérica coherente con la personalidad del sospechoso que indique que no tiene información sobre ese tema.
7. WHEN una respuesta local corresponde a una declaración importante, THE Motor_Respuestas SHALL asociar la respuesta a un identificador predefinido de declaración definido en los datos narrativos.
8. THE Sistema_Llamadas SHALL aceptar únicamente identificadores de declaración que existan en los datos narrativos. IF un identificador es desconocido o inválido, THEN THE Sistema_Llamadas SHALL descartarlo sin registrar la declaración.
9. THE Aplicación SHALL permitir completar una Partida completa con victoria por acusación correcta o por confesión utilizando exclusivamente Respuestas_Locales.

---

### Requisito 8: Sistema de contradicciones

**Historia de usuario:** Como jugador, quiero poder arrastrar evidencias sobre declaraciones para detectar contradicciones, para probar las mentiras de los sospechosos.

#### Criterios de Aceptación

1. WHILE una llamada está activa o el historial de declaraciones está visible, THE Sistema_Contradicciones SHALL permitir al jugador arrastrar una evidencia sobre una declaración mediante drag-and-drop, indicando visualmente las zonas válidas de destino durante el arrastre.
2. WHEN el jugador combina una evidencia con una declaración, THE Sistema_Contradicciones SHALL evaluar la combinación exclusivamente mediante lógica local determinista según los datos predefinidos de contradicciones.
3. WHEN la combinación es una contradicción válida, THE Sistema_Contradicciones SHALL aumentar la presión del sospechoso correspondiente según el valor definido en los datos de contradicciones.
4. WHEN la combinación es una contradicción válida, THE Sistema_Contradicciones SHALL otorgar los puntos definidos para esa contradicción.
5. WHEN la combinación es una contradicción válida, THE Sistema_Contradicciones SHALL desbloquear la nueva declaración definida, si aplica.
6. WHEN la combinación es una contradicción ya descubierta, THE Sistema_Contradicciones SHALL informar al jugador sin otorgar puntos adicionales ni modificar la presión.
7. WHEN la combinación es una evidencia relacionada pero insuficiente, THE Sistema_Contradicciones SHALL informar al jugador que la evidencia es relevante pero no demuestra la contradicción, sin aplicar penalización.
8. WHEN la combinación es incorrecta, THE Sistema_Contradicciones SHALL informar al jugador y aplicar la penalización definida en las reglas de puntuación.
9. THE Sistema_Contradicciones SHALL distinguir visualmente entre los cuatro tipos de resultado: contradicción válida, evidencia relacionada pero insuficiente, combinación incorrecta y contradicción ya descubierta.
10. IF el jugador suelta la evidencia fuera de una declaración válida durante el arrastre, THEN THE Sistema_Contradicciones SHALL cancelar la acción sin evaluar ninguna combinación.

---

### Requisito 9: Confesión del culpable

**Historia de usuario:** Como jugador, quiero que el culpable confiese cuando la presión y las contradicciones descubiertas sean suficientes, para tener una vía alternativa de victoria.

#### Criterios de Aceptación

1. WHILE una llamada con Daniel Rivas está activa, WHEN la presión de Daniel Rivas alcanza el umbral definido en la Solución_Narrativa Y el jugador ha descubierto las tres contradicciones obligatorias relacionadas con Daniel Rivas, THE Sistema_Llamadas SHALL activar la Confesión mostrando un diálogo narrativo donde Daniel Rivas admite su crimen.
2. WHEN el jugador inicia una llamada con Daniel Rivas Y las condiciones de presión y contradicciones obligatorias ya se cumplieron previamente durante la Partida, THE Sistema_Llamadas SHALL activar la Confesión al establecerse la llamada.
3. THE Confesión SHALL evaluarse exclusivamente mediante lógica local determinista, nunca mediante una decisión libre de Bedrock.
4. WHEN Daniel Rivas confiesa, THE Aplicación SHALL registrar la victoria por confesión y detener el Temporizador.
5. WHEN Daniel Rivas confiesa, THE Aplicación SHALL mostrar la pantalla de victoria por confesión incluyendo la Puntuación final.
6. IF la presión de Daniel Rivas alcanza el umbral pero no se han descubierto las tres contradicciones obligatorias, THEN THE Sistema_Llamadas SHALL NO activar la Confesión y la llamada continuará con normalidad.

---


### Requisito 10: Temporizador

**Historia de usuario:** Como jugador, quiero ver un temporizador visible durante la partida, para saber cuánto tiempo me queda para resolver el caso.

#### Criterios de Aceptación

1. WHEN la Partida comienza, THE Temporizador SHALL iniciar una cuenta regresiva con una duración fija definida por la configuración de la partida, dentro del rango de 10 a 15 minutos, mostrando el tiempo restante en formato mm:ss.
2. WHILE la Partida está activa, THE Temporizador SHALL ser visible en pantalla sin ser ocultado por otros elementos de la interfaz, actualizándose cada segundo, independientemente de la vista activa (expediente, llamada, evidencias, acusación).
3. WHEN el Temporizador llega a 00:00 desde cualquier vista de la partida activa, THE Aplicación SHALL terminar la Partida inmediatamente como derrota por tiempo agotado.
4. WHEN la Partida finaliza por cualquier condición de victoria o derrota, THE Temporizador SHALL detenerse y mostrar el tiempo en el que se detuvo.

---

### Requisito 11: Sistema de puntuación

**Historia de usuario:** Como jugador, quiero recibir una puntuación basada en mis acciones durante la partida, para medir mi desempeño.

#### Criterios de Aceptación

1. THE Aplicación SHALL calcular la Puntuación como la suma de: puntos por contradicciones válidas descubiertas, puntos por confesión del culpable, puntos por acusación final correcta, puntos de crédito parcial cuando una acusación derrotada señala al culpable correcto, y puntos por tiempo restante al ganar, menos las penalizaciones por combinaciones incorrectas, con un valor mínimo de cero.
2. WHEN el jugador descubre una contradicción válida, THE Aplicación SHALL sumar los puntos definidos en el módulo de reglas de puntuación para esa contradicción.
3. WHEN el jugador realiza una combinación incorrecta en el Sistema_Contradicciones, THE Aplicación SHALL restar los puntos de penalización definidos en las reglas de puntuación, sin reducir la Puntuación por debajo de cero.
4. WHEN la Partida finaliza en victoria, THE Aplicación SHALL sumar puntos proporcionales al tiempo restante según el factor definido en las reglas de puntuación.
5. WHEN la Partida finaliza, THE Aplicación SHALL mostrar la Puntuación final.
6. THE Puntuación, la presión de los sospechosos y las condiciones de victoria o derrota SHALL evaluarse exclusivamente mediante datos y lógica locales deterministas. Bedrock no puede modificar estos valores.

---

### Requisito 12: Acusación final

**Historia de usuario:** Como jugador, quiero realizar una acusación final seleccionando culpable, motivo, método y evidencias, para resolver el caso.

#### Criterios de Aceptación

1. WHILE la Partida está activa, THE Aplicación SHALL permitir al jugador abrir la pantalla de Acusación_Final.
2. WHEN el jugador abre la pantalla de Acusación_Final, THE Aplicación SHALL presentar listas de selección para: sospechoso (los cuatro), motivo (opciones definidas en los datos narrativos), método (opciones definidas en los datos narrativos) y evidencias (las 6 evidencias disponibles), requiriendo exactamente un sospechoso, un motivo, un método y al menos una evidencia.
3. THE Aplicación SHALL permitir al jugador seleccionar cualquiera de las 6 evidencias disponibles en la acusación, no solamente evidencias previamente inspeccionadas o "descubiertas".
4. IF el jugador intenta enviar la Acusación_Final sin haber completado todos los campos requeridos, THEN THE Aplicación SHALL impedir el envío e indicar los campos faltantes.
5. WHEN el jugador intenta enviar la Acusación_Final con todos los campos completos, THE Aplicación SHALL mostrar un diálogo de confirmación que permita confirmar o cancelar el envío.
6. WHILE el jugador no ha confirmado el envío de la acusación, THE Aplicación SHALL permitir cancelar y regresar al Escritorio_Virtual sin consumir el intento. Abrir la pantalla de acusación no consume el único intento.
7. WHEN la acusación confirmada selecciona al mismo culpable, motivo y método definidos en la Solución_Narrativa Y las evidencias seleccionadas incluyen todas las evidencias requeridas, THE Aplicación SHALL registrar victoria por acusación correcta y detener el Temporizador.
8. WHEN la acusación confirmada no cumple todas las condiciones de la Solución_Narrativa (culpable incorrecto, motivo incorrecto, método incorrecto o evidencias requeridas incompletas), THE Aplicación SHALL registrar derrota por acusación incorrecta y detener el Temporizador.
9. THE Aplicación SHALL permitir al jugador realizar una sola Acusación_Final confirmada por Partida.

---

### Requisito 13: Estados del juego y navegación

**Historia de usuario:** Como jugador, quiero que el juego gestione claramente los estados y la navegación, para tener una experiencia fluida y predecible.

#### Criterios de Aceptación

1. THE Aplicación SHALL implementar los siguientes estados principales: pantalla inicial, instrucciones, partida activa, victoria por acusación, victoria por confesión, derrota por tiempo agotado, derrota por acusación incorrecta.
2. WHILE la Partida está activa, el jugador SHALL poder navegar libremente entre las vistas de: escritorio, expediente, evidencias, llamada activa y acusación final. Estas vistas no son estados mutuamente excluyentes sino paneles dentro de la partida activa.
3. THE Aplicación SHALL permitir regresar desde la vista de evidencias al Escritorio_Virtual.
4. THE Aplicación SHALL permitir regresar desde el expediente al Escritorio_Virtual.
5. THE Aplicación SHALL permitir regresar desde una llamada activa al Escritorio_Virtual terminando la llamada.
6. THE Aplicación SHALL permitir cancelar la acusación final y regresar al Escritorio_Virtual si el jugador no ha confirmado el envío.
7. WHEN el Temporizador llega a cero desde cualquier vista de la partida activa (expediente, evidencias, llamada, acusación), THE Aplicación SHALL terminar la Partida como derrota por tiempo agotado.
8. THE Confesión de Daniel Rivas SHALL poder activarse desde una llamada activa con él.
9. WHEN la Partida finaliza en victoria o derrota, THE Aplicación SHALL mostrar la pantalla correspondiente con la Puntuación final y el tipo de resultado.
10. WHEN la Partida finaliza, THE Aplicación SHALL ofrecer la opción de reiniciar la partida.
11. WHEN el jugador reinicia la partida, THE Aplicación SHALL restablecer todos los estados al valor inicial incluyendo presión de todos los sospechosos, puntuación, temporizador, contradicciones descubiertas e historial de declaraciones.

---

### Requisito 14: Calidad del código y separación de datos

**Historia de usuario:** Como desarrollador, quiero que el código sea mantenible y que los datos narrativos estén separados, para facilitar la edición y evolución del proyecto.

#### Criterios de Aceptación

1. THE Aplicación SHALL utilizar TypeScript con tipos explícitos para todas las interfaces, props de componentes y valores de retorno de funciones exportadas, sin uso de `any` en estos puntos.
2. THE Aplicación SHALL separar la información narrativa (sospechosos, evidencias, declaraciones, contradicciones, solución, respuestas locales, reglas de puntuación, condiciones de victoria y derrota) en módulos que no importen componentes visuales de React.
3. THE Aplicación SHALL separar la lógica del juego (puntuación, contradicciones, temporizador, estados) en módulos que no importen componentes visuales de React.
4. THE Aplicación SHALL manejar estados de carga y errores en las operaciones asíncronas, mostrando un indicador visual de carga y un mensaje de error si la operación falla.
5. THE Aplicación SHALL tipar cada módulo de datos narrativos con una interfaz TypeScript exportada que defina la estructura esperada.

---

### Requisito 15: Pruebas automatizadas

**Historia de usuario:** Como desarrollador, quiero pruebas automatizadas para la lógica principal, para garantizar que el juego funcione correctamente.

#### Criterios de Aceptación

1. THE Aplicación SHALL incluir pruebas que validen la evaluación de contradicciones: una combinación válida otorga puntos y presión correctos, una combinación incorrecta aplica penalización, y una contradicción ya descubierta no otorga puntos adicionales.
2. THE Aplicación SHALL incluir pruebas que validen las condiciones de confesión del culpable: presión alcanzada y tres contradicciones obligatorias descubiertas activan la confesión; condiciones incompletas no la activan.
3. THE Aplicación SHALL incluir pruebas que validen la acusación final: acusación correcta produce victoria, acusación incorrecta produce derrota.
4. THE Aplicación SHALL incluir pruebas que validen que el temporizador al llegar a cero produce derrota por tiempo agotado.
5. THE Aplicación SHALL incluir pruebas que validen que el Motor_Respuestas utiliza Respuestas_Locales cuando Bedrock no está disponible.
6. THE Aplicación SHALL incluir pruebas que validen el reinicio completo del estado de la partida.
7. THE Aplicación SHALL ejecutar todas las pruebas mediante un solo comando y todas SHALL pasar sin fallos para considerar el build exitoso.
8. THE build de producción SHALL completarse sin errores de TypeScript. No se exige ausencia absoluta de warnings producidos por Vite o dependencias de terceros.

---

## Requisitos Obligatorios de Entrega

### Requisito 19: Despliegue del frontend

**Historia de usuario:** Como desarrollador, quiero publicar el frontend mediante AWS Amplify, para que el juego esté disponible mediante un enlace público HTTPS, cumpliendo el requisito de entrega de la hackathon.

#### Criterios de Aceptación

1. THE Aplicación SHALL producir un build de producción exitoso mediante Vite sin errores de TypeScript.
2. THE Aplicación SHALL ser desplegable mediante AWS Amplify conectado a la rama principal del repositorio.
3. WHEN el despliegue se completa, THE Aplicación SHALL estar accesible mediante un enlace público HTTPS.
4. La publicación mediante enlace público HTTPS es obligatoria para completar y entregar el proyecto en la hackathon.

---

## Requisitos Importantes

### Requisito 16: Integración con Amazon Bedrock

**Historia de usuario:** Como jugador, quiero que los sospechosos generen respuestas dinámicas mediante inteligencia artificial, para una experiencia más inmersiva durante la presentación.

#### Criterios de Aceptación

1. WHEN Bedrock está disponible y el jugador envía una pregunta, THE Motor_Respuestas SHALL enviar la solicitud al endpoint POST /interrogate incluyendo el identificador del sospechoso, la pregunta (máximo 300 caracteres) y el contexto relevante de la partida.
2. Bedrock solamente SHALL generar el texto presentado por el sospechoso. Bedrock nunca puede modificar: el culpable, la solución oficial, la puntuación, la presión, las contradicciones, las evidencias, las condiciones de victoria o derrota, ni el estado de la partida.
3. THE respuesta del backend SHALL incluir: el texto de la respuesta (máximo 500 caracteres) y opcionalmente un identificador de declaración predefinido o null.
4. IF la respuesta excede 500 caracteres, contiene un identificador de declaración desconocido, o el servicio falla, THEN THE Motor_Respuestas SHALL utilizar una respuesta local como respaldo.
5. IF Bedrock, Lambda o API Gateway fallan, THEN THE Motor_Respuestas SHALL cambiar a Respuestas_Locales sin interrumpir la partida y SHALL mostrar un indicador visual no intrusivo del modo local.
6. THE integración con Bedrock es un requisito importante pero no bloquea la completitud del MVP. El juego debe funcionar completamente sin ella.

---

### Requisito 17: Backend con AWS Lambda y API Gateway

**Historia de usuario:** Como sistema, quiero un endpoint para comunicarme con Amazon Bedrock, para generar respuestas dinámicas de los sospechosos.

#### Criterios de Aceptación

1. THE Motor_Respuestas SHALL exponer un endpoint POST /interrogate mediante Amazon API Gateway.
2. WHEN el endpoint recibe una solicitud, THE Motor_Respuestas SHALL validar que contenga: identificador de sospechoso (uno de los cuatro definidos), pregunta (texto de entre 1 y 300 caracteres) y contexto de la partida.
3. WHEN la solicitud es válida, THE Motor_Respuestas SHALL invocar Amazon Bedrock con el prompt construido según los datos estructurados del sospechoso.
4. IF la solicitud es inválida, THEN THE Motor_Respuestas SHALL devolver una respuesta con código de estado HTTP 4xx e indicación del campo faltante o inválido.
5. IF Amazon Bedrock no responde dentro de 10 segundos, THEN THE Motor_Respuestas SHALL devolver un error de timeout con código de estado HTTP 504.
6. THE Motor_Respuestas SHALL configurar CORS mediante una lista de orígenes permitidos configurable por variables de entorno, incluyendo el dominio público de AWS Amplify y el origen local de desarrollo.
7. THE backend con Lambda y API Gateway es un requisito importante pero no bloquea la completitud del MVP.

---

### Requisito 18: Persistencia de sesión mediante sessionStorage

**Historia de usuario:** Como jugador, quiero que mi progreso se recupere si recargo la página accidentalmente, para no perder la partida.

#### Criterios de Aceptación

1. THE Aplicación SHALL guardar el estado de la partida y la marca de finalización del temporizador en sessionStorage al iniciar la partida y después de acciones significativas (descubrimiento de contradicción, finalización de llamada, envío de acusación).
2. THE Aplicación SHALL guardar una marca de tiempo de finalización del temporizador en lugar del tiempo restante literal.
3. WHEN el jugador recarga la página durante una Partida activa, THE Aplicación SHALL restaurar el estado guardado y calcular el tiempo restante considerando el tiempo real transcurrido desde la marca de tiempo guardada.
4. IF el tiempo calculado al recargar es menor o igual a cero, THEN THE Aplicación SHALL mostrar derrota por tiempo agotado.
5. WHEN el jugador reinicia o finaliza la partida, THE Aplicación SHALL borrar los datos de sessionStorage.
6. IF los datos en sessionStorage están corruptos o incompletos, THEN THE Aplicación SHALL descartar los datos e iniciar una nueva partida.
7. THE persistencia de sesión es un requisito importante pero no bloquea la completitud del MVP.

---

### Requisito 20: Diseño visual noir

**Historia de usuario:** Como jugador, quiero una interfaz con estética noir, para sentirme inmerso en una historia de investigación criminal.

#### Criterios de Aceptación

1. THE Aplicación SHALL utilizar una paleta de colores basada en grises, negros y un máximo de dos tonos de acento.
2. THE Aplicación SHALL presentar elementos visuales inspirados en expedientes policiales, fotografías de sospechosos y documentos clasificados.
3. THE Aplicación SHALL utilizar placeholders para recursos visuales hasta que se creen los definitivos, de forma que ningún elemento visual aparezca vacío o roto.
4. THE Aplicación SHALL estar optimizada para un viewport mínimo de 1024px de ancho como experiencia principal completamente soportada.
5. WHILE el viewport es menor a 1024px de ancho, THE Aplicación SHALL reorganizar el contenido de forma básica manteniendo la legibilidad, y SHALL mostrar una recomendación de jugar desde una computadora si la interacción de drag-and-drop no es adecuada.
6. No se exige drag-and-drop táctil avanzado ni experiencia móvil completa en el MVP.

---

### Requisito 21: Documentación del repositorio y uso de Kiro

**Historia de usuario:** Como desarrollador y participante de la hackathon, quiero documentación completa del proyecto y del proceso de desarrollo con Kiro, para facilitar la presentación y la contribución.

#### Criterios de Aceptación

1. THE Aplicación SHALL incluir un archivo README.md con secciones para: instalación local, ejecución del frontend, ejecución del backend, variables de entorno requeridas, arquitectura del sistema, despliegue en AWS y ejecución de pruebas.
2. THE repositorio SHALL incluir documentación sobre el uso de Kiro durante el desarrollo, incluyendo: requirements.md, design.md, tasks.md, archivos de steering utilizados, decisiones importantes tomadas con Kiro, tareas implementadas con asistencia de Kiro e instrucciones de despliegue.
3. THE documentación SHALL proporcionar evidencia suficiente para explicar durante la presentación cómo se utilizó Spec-Driven Development con Kiro.
4. THE repositorio SHALL incluir documentación de la estructura narrativa que describa cómo están organizados los módulos de datos del caso.

---

## Requisitos Fuera del Alcance

Los siguientes elementos están explícitamente excluidos del MVP:

- Autenticación y cuentas de usuario.
- DynamoDB u otras bases de datos.
- S3 para almacenamiento de imágenes.
- Modo multijugador.
- Múltiples casos.
- Selección de dificultad.
- Editor de casos.
- Clasificación global.
- Pagos.
- Chat entre jugadores.
- Aplicación móvil nativa.
- Administración de usuarios.
- Evidencias ocultas o mecanismos de desbloqueo de evidencias.
- Drag-and-drop táctil avanzado para dispositivos móviles.
- Validación semántica perfecta del texto generado por Bedrock.

---

## Tecnologías Definidas

| Componente | Tecnología |
|---|---|
| Frontend | React, TypeScript, Vite |
| Estilos | CSS Modules o CSS organizado |
| Estado global | React Context o Zustand |
| Drag-and-drop | Librería compatible con React |
| Persistencia local | sessionStorage (requisito importante) |
| Backend | AWS Lambda (TypeScript) (requisito importante) |
| API | Amazon API Gateway (requisito importante) |
| IA | Amazon Bedrock (requisito importante) |
| Despliegue frontend | AWS Amplify |

---

## Prioridades de Implementación

1. Caso coherente y solucionable con datos narrativos completos.
2. Partida completa jugable con respuestas locales (sin dependencia de Bedrock).
3. Evidencias, declaraciones y sistema de contradicciones con drag-and-drop.
4. Temporizador y puntuación.
5. Confesión determinista de Daniel Rivas.
6. Acusación final con victoria, derrota y reinicio.
7. Primera publicación en AWS Amplify (partida local completa y jugable).
8. Diseño visual noir.
9. Pruebas automatizadas de la lógica principal.
10. Backend con Lambda y API Gateway.
11. Integración con Amazon Bedrock.
12. Persistencia de sesión con sessionStorage.
13. Documentación del repositorio y uso de Kiro.

Las actualizaciones posteriores del frontend podrán publicarse progresivamente en AWS Amplify.

Amazon Bedrock, Lambda, API Gateway y sessionStorage son importantes para la presentación pero nunca deben bloquear el funcionamiento del juego ni la completitud del MVP.
