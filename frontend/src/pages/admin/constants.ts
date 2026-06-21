export const ROLES = { ADMIN: 'admin', SUPERVISOR: 'supervisor', USER: 'user' } as const;
export const ROUTES = { DASHBOARD: '/dashboard', ADMIN: '/admin' } as const;
export const API_ENDPOINTS = {
  ADMIN_USERS: '/api/admin/users',
  ADMIN_LOGS_ACCESS: '/api/admin/logs/access',
  ADMIN_LOGS_MODIFICATIONS: '/api/admin/logs/modifications',
  ADMIN_RECORD_EDIT: (id: string) => `/api/admin/records/${id}/admin-edit`,
  ADMIN_RECORD_DELETE: (id: string) => `/api/admin/records/${id}/admin-delete`,
  USER_RECORDS: (id: string) => `/api/admin/users/${id}/records`,
  AUTH_ME: '/api/auth/me',
} as const;
export const DEFAULTS = {
  PAGE_LIMIT: 10,
  PAGE_LIMITS: [10, 25, 50] as const,
  ROLE: ROLES.USER,
  EDIT_REASON: 'Edición administrativa',
  PROTECTED_ACCOUNT: 'admin',
  LOCALE: 'es-AR',
} as const;
