import { ENV } from './config';
import { getMockResponse } from './mocks';
import { storage } from '../lib/storage';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message?: string
  ) {
    super(message || `API Error: ${status}`);
    this.name = 'ApiError';
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAuthToken(): Promise<string | null> {
  const refreshToken = await storage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    if (ENV.USE_MOCKS) {
      const mockRes = getMockResponse('POST', '/auth/refresh') as {
        accessToken: string;
        refreshToken: string;
      };
      await storage.setAccessToken(mockRes.accessToken);
      return mockRes.accessToken;
    }

    const response = await fetch(`${ENV.API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        try {
          const { useAuthStore } = require('../src/features/auth/authStore');
          useAuthStore.getState().logout();
        } catch {}
      }
      await storage.clearAll();
      return null;
    }

    const data = await response.json();
    if (data.accessToken) {
      await storage.setAccessToken(data.accessToken);
      if (data.refreshToken) {
        await storage.setRefreshToken(data.refreshToken);
      }
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();

  // Query parameter building
  let url = path;
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // 1. Check Mock Layer if USE_MOCKS is enabled
  if (ENV.USE_MOCKS) {
    // Artificial mock network latency for realistic feel
    await new Promise((resolve) => setTimeout(resolve, 100));

    const mockData = getMockResponse(method, path);
    if (mockData !== null) {
      return mockData as T;
    }
    console.warn(`[Mock] No mock defined for: ${method} ${path}, falling back to network.`);
  }

  // 2. Prepare Network Request
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!options.skipAuth) {
    const token = await storage.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const fullUrl = `${ENV.API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;

  let response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // 3. Handle 401 Unauthorized & Token Refresh
  if (response.status === 401 && !options.skipAuth) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAuthToken();
      isRefreshing = false;

      if (newToken) {
        onRefreshed(newToken);
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(fullUrl, {
          ...options,
          headers,
        });
      }
    } else {
      // Wait for existing refresh process
      const retryPromise = new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken) => {
          try {
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryRes = await fetch(fullUrl, {
              ...options,
              headers,
            });
            const data = await retryRes.json();
            resolve(data);
          } catch (err) {
            reject(err);
          }
        });
      });
      return retryPromise;
    }
  }

  // 4. Parse response
  if (!response.ok) {
    if (response.status === 401 && !options.skipAuth) {
      try {
        const { useAuthStore } = require('../features/auth/authStore');
        useAuthStore.getState().logout();
      } catch {}
    }
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }
    throw new ApiError(response.status, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
}

export const http = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: 'DELETE' });
  },
};
