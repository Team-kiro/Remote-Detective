---
name: Remote Detective
description: Noir desktop detective interface for short, logic-first investigations.
colors:
  bg-root: "#0b0b0b"
  bg-surface: "#171717"
  bg-surface-2: "#151515"
  bg-header: "#121212"
  bg-active: "#221515"
  bg-inset: "#141414"
  bg-raised: "#1d1d1d"
  border-muted: "#3d3d3d"
  border-default: "#545454"
  border-strong: "#6e6e6e"
  text-primary: "#e7e2d5"
  text-base: "#d7d7d7"
  text-secondary: "#d4cfc2"
  text-muted: "#b9b4a8"
  accent-danger: "#b44a42"
  accent-danger-text: "#d9584f"
  accent-victory: "#c9b672"
  text-on-accent: "#f5f2ea"
typography:
  display:
    fontFamily: "Cambria, Palatino Linotype, Book Antiqua, Georgia, serif"
    fontSize: "clamp(2rem, 7vw, 4.25rem)"
    fontWeight: 700
    letterSpacing: "0.08em"
  title:
    fontFamily: "Cambria, Palatino Linotype, Book Antiqua, Georgia, serif"
    fontSize: "clamp(1.6rem, 4vw, 2.75rem)"
    fontWeight: 700
    letterSpacing: "0.05em"
  xl:
    fontFamily: "Cambria, Palatino Linotype, Book Antiqua, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 700
  lg:
    fontFamily: "Cambria, Palatino Linotype, Book Antiqua, Georgia, serif"
    fontSize: "1.15rem"
    fontWeight: 700
  body:
    fontFamily: "Cambria, Palatino Linotype, Book Antiqua, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  sm:
    fontFamily: "Cambria, Palatino Linotype, Book Antiqua, Georgia, serif"
    fontSize: "0.9rem"
    fontWeight: 400
  xs:
    fontFamily: "Cambria, Palatino Linotype, Book Antiqua, Georgia, serif"
    fontSize: "0.8rem"
    fontWeight: 400
  label:
    fontFamily: "Cambria, Palatino Linotype, Book Antiqua, Georgia, serif"
    fontSize: "0.7rem"
    fontWeight: 700
    letterSpacing: "0.14em"
rounded:
  none: "0"
  sm: "6px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.accent-danger}"
    textColor: "{colors.text-on-accent}"
    rounded: "{rounded.none}"
    padding: "0.85rem 1.75rem"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.none}"
    padding: "0.85rem 1.75rem"
  nav-item-active:
    backgroundColor: "{colors.bg-active}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.none}"
---

# Design System: Remote Detective

## Overview

**Creative North Star: "Expediente Forense Nocturno"**

Interfaz de escritorio noir, sobria y de alto contraste, donde la jerarquia la construyen bloque oscuro, borde fino y acento oxido. El sistema evita decoracion gratuita y prioriza lectura, trazabilidad de estado y foco en la investigacion.

**Key Characteristics:**
- Paleta casi monocromatica con acento rojo oxidado.
- Tipografia editorial serif con etiquetas en mayusculas espaciadas para controles.
- Superficies planas con sombra puntual para modales/pantallas de cierre.
- Botones rectos, directos, con estados por contraste y brillo.
- Fotografia noir de ambiente detras de cada pantalla, siempre bajo un velo oscuro que preserva el contraste del texto.

## Colors

La base visual se apoya en negros y grises calidos con acentos funcionales de riesgo y victoria.

### Primary
- **Oxido de Alerta** (`#b44a42`): CTA principal, bordes y rellenos de riesgo. Rinde 3.46:1 sobre panel: sirve para superficie y contorno, nunca para texto.
- **Oxido Legible** (`#d9584f`, `accent-danger-text`): la unica variante admitida para texto en acento (4.75:1 sobre panel).

### Tertiary
- **Ambar de Cierre Exitoso** (`#c9b672`): resultado de victoria.

### Neutral
- **Negro Raiz** (`#0b0b0b`): fondo global.
- **Carbón de Superficie** (`#171717`, `#151515`, `#141414`, `#121212`, `#1d1d1d`): paneles, barra superior, campos hundidos (`bg-inset`) y bloques elevados sobre panel (`bg-raised`).
- **Marfil de Lectura** (`#e7e2d5`, `#d7d7d7`, `#d4cfc2`, `#b9b4a8`): texto por niveles de prioridad.
- **Gris de Estructura** (`#3d3d3d`, `#545454`, `#6e6e6e`): bordes, divisores y delimitacion.

## Typography

**Display Font:** Cambria + Palatino/Georgia serif fallback  
**Body Font:** Cambria + Palatino/Georgia serif fallback

**Character:** tipografia de expediente editorial: sobria, legible en oscuro y con un tono mas distintivo que una sans generica.

### Hierarchy
Seis pasos y dos escalas fluidas. Ningun `font-size` fuera de esta rampa.

- **Display** (700, `clamp(2rem, 7vw, 4.25rem)`, tracking `0.08em`): identidad de pantalla inicial.
- **Title** (700, `clamp(1.6rem, 4vw, 2.75rem)`, tracking `0.05em`): encabezados de pantallas clave.
- **XL** (700, `1.5rem`): temporizador, marcador y cifras de resultado.
- **LG** (700, `1.15rem`): encabezados de panel y nombres de sospechoso.
- **Body** (400, `1rem`, line-height `1.6`): descripciones e instrucciones largas.
- **SM** (400, `0.9rem`): texto de apoyo dentro de paneles densos.
- **XS** (400, `0.8rem`): metadatos, ayudas en linea y chips.
- **Label** (700, `0.7rem`, tracking `0.14em`, uppercase): timer, score, metadata, controles.

## Layout

El sistema es desktop-first con composicion por paneles: cabecera sticky, navegacion lateral y area de trabajo principal. Espaciado dominante en escalas de `0.5rem`, `0.75rem`, `1rem`, `1.5rem`, `2rem`. Debajo de 1024px se degrada a una sola columna para conservar legibilidad.

## Elevation & Depth

Predomina la capa plana. La profundidad aparece en pantallas-estado con sombra `rgb(0 0 0 / 45%)` para separar bloques centrales del fondo.

Las fotografias de ambiente se cubren con dos velos de gradiente: `--scrim-screen` para pantallas completas y `--scrim-panel` para paneles de trabajo. Sobre ellos, las tarjetas usan `--bg-surface-veiled` (`rgb(23 23 23 / 93%)`) para dejar entrever la foto sin perder legibilidad. Una capa global de grano y viñeta (`body::after`, no interactiva) unifica el conjunto.

## Shapes

Forma rectilinea, bordes de 1px, esquinas sin redondeo perceptible y contornos definidos. La identidad es expediente tecnico, no interfaz blanda.

## Components

### Buttons
- **Shape:** recto (sin radio visible).
- **Primary:** fondo `#b44a42`, texto `#f5f2ea`, padding `0.85rem 1.75rem`, uppercase y tracking amplio.
- **Secondary/Ghost:** fondo transparente, borde gris, texto marfil.
- **Hover / Focus:** brillo por `filter: brightness(...)` y focus ring de 3px en marfil.

### Navigation Items
- Base transparente con borde `#3d3d3d`.
- Activo con `#221515` + borde/acento rojo oxidado.
- Icono y texto en mayusculas para lectura rapida por seccion.

### Cards / Panels
- Superficie oscura (`#171717`) con borde `#545454`.
- Padding generoso (2rem-3rem en pantallas principales) para ritmo de lectura.

## Do's and Don'ts

- **Do:** mantener contraste alto, estructura de borde claro y acentos puntuales.
- **Do:** usar acento rojo para accion/alerta y reservar ambar para victoria.
- **Don't:** introducir gradientes coloridos, neones o sombras blandas extensivas.
- **Don't:** suavizar formas con radios altos; rompe la identidad de expediente noir.
