import type { ApiErrorBody, TutorStreamEvent } from '../../shared/api.ts';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
  get offline(): boolean {
    return this.code === 'network';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: { 'x-requested-with': 'magubane', ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(0, 'network', "You seem to be offline. Check your connection and try again.");
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON (e.g. a proxy error page)
  }
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'http_error', err?.message ?? `Request failed (${res.status}).`, err?.details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
};

/** POST that returns a server-sent event stream (the tutor). */
export async function streamEvents(path: string, body: unknown, onEvent: (e: TutorStreamEvent) => void, signal: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'x-requested-with': 'magubane', 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (signal.aborted) return;
    throw new ApiError(0, 'network', "You seem to be offline. Check your connection and try again.");
  }
  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(res.status, data?.error.code ?? 'http_error', data?.error.message ?? `Request failed (${res.status}).`, data?.error.details);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const line = block.split('\n').find((l) => l.startsWith('data:'));
        if (line) onEvent(JSON.parse(line.slice(5).trim()) as TutorStreamEvent);
      }
    }
  } catch (e) {
    if (!signal.aborted) throw new ApiError(0, 'network', 'The connection dropped while the tutor was replying.');
  }
}
