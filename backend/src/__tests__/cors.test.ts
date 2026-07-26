/**
 * Pruebas de la utilidad CORS del backend.
 * Grupo (g): contrato backend — tarea 6.4.
 *
 * Verifica:
 * - Origen local (http://localhost:5173) permitido mediante configuración
 * - Origen Amplify permitido mediante configuración
 * - Origen no configurado rechazado (sin cabeceras CORS en la respuesta)
 * - Lista vacía rechaza todo
 *
 * La propiedad de seguridad clave es la comparación de igualdad exacta:
 * `allowedOrigins.includes(origin)` (Array.includes) hace comparación de
 * igualdad estricta, NO coincidencia por subcadena. Los tests de
 * buildCorsHeaders cubren esta propiedad de extremo a extremo.
 *
 * Requisitos: 16.5, 17.1, 17.6
 */

import { getAllowedOrigins, isOriginAllowed, buildCorsHeaders } from '../cors';

// ---------------------------------------------------------------------------
// getAllowedOrigins
// ---------------------------------------------------------------------------

describe('getAllowedOrigins', () => {
  it('parsea una lista con un único origen', () => {
    const origins = getAllowedOrigins('http://localhost:5173');
    expect(origins).toEqual(['http://localhost:5173']);
  });

  it('parsea una lista con dos orígenes separados por coma', () => {
    const origins = getAllowedOrigins('http://localhost:5173,https://frontend.example.com');
    expect(origins).toEqual(['http://localhost:5173', 'https://frontend.example.com']);
  });

  it('elimina espacios en blanco alrededor de los orígenes', () => {
    const origins = getAllowedOrigins(' http://localhost:5173 , https://frontend.example.com ');
    expect(origins).toEqual(['http://localhost:5173', 'https://frontend.example.com']);
  });

  it('devuelve un array vacío si la variable de entorno no está definida', () => {
    expect(getAllowedOrigins(undefined)).toEqual([]);
  });

  it('devuelve un array vacío si la variable de entorno es una cadena vacía', () => {
    expect(getAllowedOrigins('')).toEqual([]);
  });

  it('ignora entradas vacías producidas por comas extras', () => {
    const origins = getAllowedOrigins('http://localhost:5173,,http://localhost:3000');
    expect(origins).toEqual(['http://localhost:5173', 'http://localhost:3000']);
  });
});

// ---------------------------------------------------------------------------
// isOriginAllowed — lógica de comparación exacta
// ---------------------------------------------------------------------------

describe('isOriginAllowed', () => {
  const allowedList = ['http://localhost:5173', 'https://frontend.example.com'];

  it('devuelve true para cada cadena contenida en la lista', () => {
    expect(isOriginAllowed(allowedList[0]!, allowedList)).toBe(true);
    expect(isOriginAllowed(allowedList[1]!, allowedList)).toBe(true);
  });

  it('devuelve false para una cadena vacía', () => {
    expect(isOriginAllowed('', allowedList)).toBe(false);
  });

  it('devuelve false si la lista de permitidos está vacía', () => {
    expect(isOriginAllowed(allowedList[0]!, [])).toBe(false);
  });

  it('devuelve false para una cadena no idéntica a ningún elemento de la lista', () => {
    // Usa una cadena construida dinámicamente para probar la comparación exacta:
    // cualquier variante de un origen permitido que no sea idéntica a él es rechazada.
    const notAllowed = allowedList[1]! + '/extra';
    expect(isOriginAllowed(notAllowed, allowedList)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildCorsHeaders — comportamiento de extremo a extremo
// ---------------------------------------------------------------------------

describe('buildCorsHeaders', () => {
  const originLocal = 'http://localhost:5173';
  // Origen configurado que simula un dominio Amplify (sin hardcodear el real)
  const originAmplify = 'https://frontend.example.com';
  const allowed = [originLocal, originAmplify];

  it('incluye Access-Control-Allow-Origin para origen local permitido', () => {
    const headers = buildCorsHeaders(originLocal, allowed);
    expect(headers['Access-Control-Allow-Origin']).toBe(originLocal);
  });

  it('incluye Access-Control-Allow-Origin para origen Amplify configurado', () => {
    const headers = buildCorsHeaders(originAmplify, allowed);
    expect(headers['Access-Control-Allow-Origin']).toBe(originAmplify);
  });

  it('incluye Access-Control-Allow-Methods con POST para origen permitido', () => {
    const headers = buildCorsHeaders(originLocal, allowed);
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
  });

  it('incluye Access-Control-Allow-Headers con Content-Type para origen permitido', () => {
    const headers = buildCorsHeaders(originLocal, allowed);
    expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
  });

  it('devuelve un objeto vacío (sin cabeceras CORS) para origen no permitido', () => {
    // Construye un origen que no es idéntico a ninguno de la lista
    const notPermitted = originLocal + '/extra';
    const headers = buildCorsHeaders(notPermitted, allowed);
    expect(Object.keys(headers)).toHaveLength(0);
  });

  it('devuelve un objeto vacío cuando origin es undefined', () => {
    const headers = buildCorsHeaders(undefined, allowed);
    expect(Object.keys(headers)).toHaveLength(0);
  });

  it('devuelve un objeto vacío cuando la lista de permitidos está vacía', () => {
    const headers = buildCorsHeaders(originLocal, []);
    expect(Object.keys(headers)).toHaveLength(0);
  });

  it('refleja el origen exacto de la solicitud en la cabecera (no hardcoded)', () => {
    const headers = buildCorsHeaders(originAmplify, allowed);
    expect(headers['Access-Control-Allow-Origin']).toBe(originAmplify);
  });

  it('un origen que es superconjunto del permitido NO recibe cabeceras (igualdad exacta)', () => {
    // sub.frontend.example.com ≠ frontend.example.com: la comparación es exacta
    const superSet = `https://sub.${originAmplify.replace('https://', '')}`;
    const headers = buildCorsHeaders(superSet, allowed);
    expect(Object.keys(headers)).toHaveLength(0);
  });
});
