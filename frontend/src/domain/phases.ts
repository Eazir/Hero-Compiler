import { PhaseId } from '../api/schema';
import { es } from '../i18n/es';

export interface PhaseMeta {
  id: PhaseId;
  name: string;
  order: number;
}

export const PHASES_META: PhaseMeta[] = [
  { id: 'lexical', name: es.phases.lexical, order: 0 },
  { id: 'syntactic', name: es.phases.syntactic, order: 1 },
  { id: 'semantic', name: es.phases.semantic, order: 2 },
  { id: 'ir', name: es.phases.ir, order: 3 },
  { id: 'optimization', name: es.phases.optimization, order: 4 },
  { id: 'assembly', name: es.phases.assembly, order: 5 },
  { id: 'binary', name: es.phases.binary, order: 6 },
];
