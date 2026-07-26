/**
 * Utilidades CORS para el handler Lambda.
 *
 * Los orígenes permitidos se leen de la variable de entorno ALLOWED_ORIGINS
 * (lista separada por comas). Nunca se codifican dominios directamente.
 *
 * Requisitos: 16.5, 17.1, 17.6
 */

/** Lee y normaliza la lista de orígenes permitidos desde la cadena de configuración. */
export function getAllowedOrigins(originsString: string | undefined = process.env['ALLOWED_ORIGINS']): string[] {
  if (!originsString || originsString.trim() === '') {
    return [];
  }
  return originsString
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

/** Devuelve true si el origen está en la lista de permitidos. */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.includes(origin);
}

/**
 * Construye las cabeceras CORS para la respuesta.
 * Si el origen no está permitido, devuelve un objeto vacío (sin cabeceras CORS).
 */
export function buildCorsHeaders(
  origin: string | undefined,
  allowedOrigins: string[],
): Record<string, string> {
  if (!origin || !isOriginAllowed(origin, allowedOrigins)) {
    return {};
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
