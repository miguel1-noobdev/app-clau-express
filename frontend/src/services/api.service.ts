// Simple API wrapper for front-end HTTP calls (with cookies)
const API_BASE = '';

export interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

class ApiService {
  private base: string;

  constructor(base: string = API_BASE) {
    this.base = base;
  }

  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = (endpoint.startsWith('http') ? endpoint : `${this.base}${endpoint}`) || endpoint;
    const config = {
      credentials: 'include' as const,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    };

    const res = await fetch(url, config);
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      const err = (data as any)?.error || res.statusText;
      throw new Error(err);
    }

    return data as T;
  }

  get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, body: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  put<T = any>(endpoint: string, body: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

const api = new ApiService();
export default api;
