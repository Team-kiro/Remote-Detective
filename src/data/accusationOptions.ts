import type { MethodOptionDef, MotiveOptionDef } from '@/data/types';

/** Opciones de motivo aprobadas para la acusación final. */
export const MOTIVE_OPTIONS = [
  {
    id: 'motive_silence',
    text: 'Silenciar a Marcos para ocultar el desfalco',
  },
  { id: 'motive_greed', text: 'Mayor participación en la sociedad' },
  { id: 'motive_revenge', text: 'Venganza personal' },
  {
    id: 'motive_divorce',
    text: 'Beneficiarse del conflicto del divorcio',
  },
] as const satisfies readonly MotiveOptionDef[];

/** Opciones de método aprobadas para la acusación final. */
export const METHOD_OPTIONS = [
  {
    id: 'method_poison',
    text: 'Envenenamiento con cianuro en el whisky',
  },
  { id: 'method_assault', text: 'Agresión física directa' },
  { id: 'method_hired', text: 'Contratación de un tercero' },
  { id: 'method_accident', text: 'Simulación de accidente' },
] as const satisfies readonly MethodOptionDef[];
