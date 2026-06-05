const callsByApi: Record<string, number[]> = {
  ideogram: [],
  fal: [],
  gemini: [],
};

const limits: Record<string, number> = {
  ideogram: 40,
  fal: 2,
  gemini: 30,
};

export function canGenerate(api: 'ideogram' | 'fal' | 'gemini'): boolean {
  const now = Date.now();
  const windowMs = 60000;
  callsByApi[api] = (callsByApi[api] || []).filter(t => now - t < windowMs);
  return callsByApi[api].length < limits[api];
}

export function recordCall(api: 'ideogram' | 'fal' | 'gemini'): void {
  if (!callsByApi[api]) callsByApi[api] = [];
  callsByApi[api].push(Date.now());
}
