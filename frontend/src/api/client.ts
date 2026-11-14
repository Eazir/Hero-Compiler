import { CompileResponse } from './schema';

export type ApiErrorCode = 'SERVER' | 'CONTRACT' | 'NETWORK';

export class ApiError extends Error {
  code: ApiErrorCode;
  cause?: unknown;

  constructor(code: ApiErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.cause = cause;
  }
}

export async function compile(source: string, optimize = true): Promise<CompileResponse> {
  let res: Response;
  try {
    res = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, optimize }),
    });
  } catch (err) {
    throw new ApiError('NETWORK', 'No se pudo conectar con el servidor', err);
  }

  if (!res.ok) {
    throw new ApiError('SERVER', `El servidor respondió con código ${res.status}`);
  }

  let rawData: unknown;
  try {
    rawData = await res.json();
  } catch (err) {
    throw new ApiError('SERVER', 'La respuesta del servidor no es un JSON válido', err);
  }

  const parsed = CompileResponse.safeParse(rawData);
  if (!parsed.success) {
    throw new ApiError('CONTRACT', 'La respuesta no cumple el contrato v1', parsed.error);
  }

  return parsed.data;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch {
    return false;
  }
}
