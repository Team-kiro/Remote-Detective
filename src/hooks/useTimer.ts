/**
 * Hook del temporizador visible de la partida.
 *
 * Deriva el tiempo restante del `timerEndTimestamp` del store mediante el motor
 * puro `timerEngine`, lo refresca una vez por segundo mientras la partida está
 * activa y, al llegar a cero, provoca la derrota por tiempo llamando a la
 * acción pública existente `triggerTimeDefeat`. El hook no duplica lógica de
 * puntuación ni de fase: no calcula score, no decide victoria ni derrota y no
 * escribe ningún otro campo del store.
 *
 * Requisitos: 10.1-10.4, 13.7
 */

import { useEffect, useState } from 'react';
import { calculateTimeRemaining } from '@/logic/timerEngine';
import { useGameStore } from '@/store/gameStore';

/** Intervalo de refresco del temporizador visible. */
export const TIMER_TICK_MS = 1000;

/** Umbral en segundos por debajo del cual el temporizador se muestra en rojo. */
export const TIMER_CRITICAL_SECONDS = 120;

export interface TimerViewModel {
  /** Segundos restantes, nunca negativos. */
  secondsRemaining: number;
  /** Tiempo restante en formato `mm:ss`. */
  formatted: string;
  /** `true` cuando queda menos de dos minutos. */
  isCritical: boolean;
  /** `true` cuando el temporizador ya llegó a 00:00. */
  isExpired: boolean;
}

/** Convierte segundos restantes al formato `mm:ss`. */
export function formatTimeRemaining(secondsRemaining: number): string {
  const safeSeconds = Number.isFinite(secondsRemaining) ? Math.max(0, secondsRemaining) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Segundos que debe mostrar el temporizador.
 *
 * Se redondea hacia arriba para que la cuenta comience en la duración completa
 * y muestre 00:00 solo cuando el tiempo se ha agotado de verdad.
 */
function displayedSeconds(endTimestamp: number | null): number {
  if (endTimestamp === null) {
    return 0;
  }

  return Math.ceil(calculateTimeRemaining(endTimestamp) / 1000);
}

export function useTimer(): TimerViewModel {
  const phase = useGameStore((state) => state.phase);
  const timerEndTimestamp = useGameStore((state) => state.timerEndTimestamp);
  const triggerTimeDefeat = useGameStore((state) => state.triggerTimeDefeat);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() =>
    displayedSeconds(timerEndTimestamp),
  );

  useEffect(() => {
    if (phase !== 'active') {
      return;
    }

    // Una partida activa sin marca de temporizador termina de forma segura.
    if (timerEndTimestamp === null) {
      setSecondsRemaining(0);
      triggerTimeDefeat();
      return;
    }

    const sync = (): void => {
      const remainingMs = calculateTimeRemaining(timerEndTimestamp);
      setSecondsRemaining(Math.ceil(remainingMs / 1000));

      // El temporizador agotado termina la partida desde cualquier vista; el
      // store decide el resultado y la puntuación final.
      if (remainingMs <= 0) {
        triggerTimeDefeat();
      }
    };

    sync();
    const intervalId = setInterval(sync, TIMER_TICK_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [phase, timerEndTimestamp, triggerTimeDefeat]);

  return {
    secondsRemaining,
    formatted: formatTimeRemaining(secondsRemaining),
    isCritical: secondsRemaining < TIMER_CRITICAL_SECONDS,
    isExpired: secondsRemaining <= 0,
  };
}
