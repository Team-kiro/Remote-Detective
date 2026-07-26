import type { NarrativeSolution } from '@/data/types';

/** Solución narrativa local y determinista del caso. */
export const SOLUTION = {
  culpritId: 'daniel',
  motiveId: 'motive_silence',
  methodId: 'method_poison',
  requiredEvidenceIds: [
    'ev_email',
    'ev_camera',
    'ev_receipt',
    'ev_bottle',
  ],
  confessionPressureThreshold: 80,
  mandatoryContradictionIds: [
    'contra_daniel_access',
    'contra_daniel_camera',
    'contra_daniel_receipt',
  ],
} as const satisfies NarrativeSolution;
