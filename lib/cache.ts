const store = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

export function getCached(key: string): unknown | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl * 1000) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setCached(key: string, data: unknown, ttl: number): void {
  store.set(key, { data, timestamp: Date.now(), ttl });
}

export function getStale(key: string): unknown | null {
  return store.get(key)?.data ?? null;
}

export async function hashPayload(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
