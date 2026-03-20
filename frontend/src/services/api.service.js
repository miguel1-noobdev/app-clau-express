// Simple API wrapper for front-end HTTP calls (with cookies)
const API_BASE = '';

class ApiService {
  constructor(base = API_BASE) {
    this.base = base;
  }
  async request(endpoint, options = {}) {
    const url = (endpoint.startsWith('http') ? endpoint : `${this.base}${endpoint}`) || endpoint;
    const config = {
      credentials: 'include',
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
      const err = data?.error || res.statusText;
      throw new Error(err);
    }
    return data;
  }
  get(endpoint, options = {}) { return this.request(endpoint, { ...options, method: 'GET' }); }
  post(endpoint, body, options = {}) { return this.request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }); }
  put(endpoint, body, options = {}) { return this.request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }); }
  delete(endpoint, options = {}) { return this.request(endpoint, { ...options, method: 'DELETE' }); }
}

const api = new ApiService();
export default api;
