import assert from 'node:assert/strict';

export const BASE_URL = (process.env.TEST_BASE_URL ?? 'http://localhost:5000').replace(/\/+$/, '');

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Envelope<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: Record<string, string[]>;
}

export interface ApiResponse<T = Envelope> {
  status: number;
  ok: boolean;
  headers: Headers;
  json: T | null;
}

export interface RequestOptions {
  method?: string;
  token?: string | null;
  json?: unknown;
  form?: FormData;
  timeoutMs?: number;
}

export async function request<T = Envelope>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);
  try {
    const headers: Record<string, string> = {};
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    if (options.json !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : options.form,
      signal: controller.signal
    });

    const text = await response.text();
    let json: T | null = null;
    try {
      json = text ? (JSON.parse(text) as T) : null;
    } catch {
      json = null;
    }
    return { status: response.status, ok: response.ok, headers: response.headers, json };
  } finally {
    clearTimeout(timer);
  }
}

export async function requestBinary(
  path: string,
  options: { token?: string | null } = {}
): Promise<{ status: number; headers: Headers; buffer: Buffer }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: options.token ? { Authorization: `Bearer ${options.token}` } : {}
  });
  return {
    status: response.status,
    headers: response.headers,
    buffer: Buffer.from(await response.arrayBuffer())
  };
}

/* ── Seeded development credentials (never in production) ── */
const CREDENTIALS = {
  admin: { email: 'admin@fleet.dev', password: 'Admin@123' },
  accountant: { email: 'accountant@fleet.dev', password: 'Account@123' },
  driver: { email: 'ahmed.driver@fleet.dev', password: 'Driver@123' }
} as const;

export type Role = keyof typeof CREDENTIALS;

const tokenCache = new Map<Role, string>();

export async function loginAs(role: Role): Promise<string> {
  const cached = tokenCache.get(role);
  if (cached) return cached;

  const res = await request<Envelope<{ token: string }>>('/api/auth/login', {
    method: 'POST',
    json: CREDENTIALS[role]
  });
  assert.equal(res.status, 200, `loginAs(${role}) failed — is the database seeded? (npm run seed)`);
  const token = res.json?.data?.token;
  assert.ok(token, `loginAs(${role}) response did not include a token`);
  tokenCache.set(role, token);
  return token;
}

/** Minimal valid 1×1 PNG used for upload/OCR tests. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

export function makeFileForm(buffer: Buffer, fileName: string, mimeType: string): FormData {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), fileName);
  return form;
}