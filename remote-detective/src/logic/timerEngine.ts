/**
 * Motor del temporizador: calcula el tiempo restante desde un timestamp de
 * fin. Módulo puro, sin imports de React, Zustand ni Bedrock.
 *
 * Requisitos: 10.1-10.4, 14.3, 15.4
 */

/**
 * Milisegundos restantes hasta `endTimestamp`, con piso 0. Un timestamp no
 * finito se trata como tiempo agotado.
 */
export function calculateTimeRemaining(endTimestamp: number): number {
  if (!Number.isFinite(endTimestamp)) {
    return 0;
  }

  return Math.max(0, endTimestamp - Date.now());
}

/** `true` cuando ya no queda tiempo, es decir, cuando el restante es 0 ms. */
export function isTimeExpired(endTimestamp: number): boolean {
  return calculateTimeRemaining(endTimestamp) <= 0;
}

/** Segundos restantes, truncando los milisegundos hacia abajo. */
export function timeRemainingSeconds(endTimestamp: number): number {
  return Math.floor(calculateTimeRemaining(endTimestamp) / 1000);
}
