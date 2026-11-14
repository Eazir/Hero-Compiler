import { z } from 'zod';

export const EXPECTED_PHASE_ORDER = [
  'lexical',
  'syntactic',
  'semantic',
  'ir',
  'optimization',
  'assembly',
  'binary',
] as const;

export const PhaseIdSchema = z.enum(EXPECTED_PHASE_ORDER);
export type PhaseId = z.infer<typeof PhaseIdSchema>;

export const PhaseStatusSchema = z.enum(['ok', 'error', 'skipped']);
export type PhaseStatus = z.infer<typeof PhaseStatusSchema>;

export const SpanSchema = z.object({
  line: z.number(),
  col: z.number(),
  len: z.number(),
}).passthrough();
export type Span = z.infer<typeof SpanSchema>;

export const FocusSchema = z.object({
  span: SpanSchema.nullable().optional(),
  nodeIds: z.array(z.string()).default([]),
}).passthrough();
export type Focus = z.infer<typeof FocusSchema>;

export const StepSchema = z.object({
  i: z.number(),
  title: z.string(),
  explain: z.string(),
  focus: FocusSchema.nullable().optional(),
  ops: z.array(z.record(z.any())).default([]),
}).passthrough();
export type Step = z.infer<typeof StepSchema>;

export const PhaseResultSchema = z.object({
  id: PhaseIdSchema,
  name: z.string(),
  status: PhaseStatusSchema,
  summary: z.string().default(''),
  steps: z.array(StepSchema).default([]),
  output: z.record(z.any()).nullable().optional(),
}).passthrough();
export type PhaseResult = z.infer<typeof PhaseResultSchema>;

export const ExecutableSchema = z.object({
  hex: z.string(),
  size: z.number(),
}).passthrough();
export type Executable = z.infer<typeof ExecutableSchema>;

export const RunStepSchema = z.object({
  pc: z.number(),
  asm: z.string(),
  registers: z.array(z.number()),
}).passthrough();
export type RunStep = z.infer<typeof RunStepSchema>;

export const RunResultSchema = z.object({
  stdout: z.array(z.string()).default([]),
  exitCode: z.number().default(0),
  steps: z.array(RunStepSchema).default([]),
}).passthrough();
export type RunResult = z.infer<typeof RunResultSchema>;

export const FixSchema = z.object({
  label: z.string(),
  kind: z.string(),
}).passthrough();
export type Fix = z.infer<typeof FixSchema>;

export const ErrorInfoSchema = z.object({
  code: z.string(),
  kind: z.string(),
  phase: z.string(),
  message: z.string(),
  why: z.string(),
  hint: z.string(),
  span: SpanSchema.nullable().optional(),
  stepIndex: z.number().default(0),
  fixes: z.array(z.record(z.any())).default([]),
}).passthrough();
export type ErrorInfo = z.infer<typeof ErrorInfoSchema>;

export const MetaSchema = z.object({
  sourceLength: z.number(),
  lineCount: z.number(),
  elapsedMs: z.number().default(0),
}).passthrough();
export type Meta = z.infer<typeof MetaSchema>;

export const CompileRequest = z.object({
  source: z.string(),
  optimize: z.boolean().default(true),
});
export type CompileRequest = z.infer<typeof CompileRequest>;

export const CompileResponse = z.object({
  version: z.number().default(1),
  ok: z.boolean(),
  phases: z.array(PhaseResultSchema).refine(
    (phases) => {
      if (phases.length !== 7) return false;
      return phases.every((p, idx) => p.id === EXPECTED_PHASE_ORDER[idx]);
    },
    { message: 'phases debe contener exactamente 7 fases en el orden canónico' }
  ),
  executable: ExecutableSchema.nullable().optional(),
  run: RunResultSchema.nullable().optional(),
  error: ErrorInfoSchema.nullable().optional(),
  meta: MetaSchema.nullable().optional(),
}).passthrough();
export type CompileResponse = z.infer<typeof CompileResponse>;
