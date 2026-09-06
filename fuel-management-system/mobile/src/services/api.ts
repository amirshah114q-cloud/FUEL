import { API_BASE_URL } from '../config';
import { PaginationMeta } from '../types/models';

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly errors?: Record<string, string[]>;

  constructor(message: string, status = 0, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Registered by AuthContext: any 401 forces a logout app-wide. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

function statusFallback(status: number): string {
  switch (status) {
    case 400:
      return 'Please check your input and try again.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested record was not found.';
    case 413:
      return 'The file is too large. Maximum slip size is 10 MB.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again in a moment.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
}

/** Central REST client: token injection, JSON envelope parsing, friendly errors. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);

  try {
    const response = await fetch(`${API_BASE_URL}/api${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });

    let json: (ApiEnvelope<T> & { errors?: Record<string, string[]> }) | null = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) {
      if (response.status === 401 && unauthorizedHandler) unauthorizedHandler();
      throw new ApiError(
        json?.message ?? statusFallback(response.status),
        response.status,
        json?.errors
      );
    }

    return json as ApiEnvelope<T>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The request timed out. Please check your connection and try again.', 0);
    }
    throw new ApiError(
      'Network error. Could not reach the server — check that the backend is running and the API URL is correct.',
      0
    );
  } finally {
    clearTimeout(timer);
  }
}