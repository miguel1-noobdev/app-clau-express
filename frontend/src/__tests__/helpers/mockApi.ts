// Mock helper para api.service
// Usar en tests: vi.mock('../services/api.service', () => mockApiService)
import { vi } from 'vitest';

export const mockApiService = {
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
};

export const resetMockApi = () => {
  mockApiService.default.get.mockReset();
  mockApiService.default.post.mockReset();
  mockApiService.default.put.mockReset();
  mockApiService.default.delete.mockReset();
};

// Helper para simular respuestas exitosas
export const mockApiSuccess = (method: 'get' | 'post' | 'put' | 'delete', data: any) => {
  mockApiService.default[method].mockResolvedValueOnce(data);
};

// Helper para simular errores
export const mockApiError = (method: 'get' | 'post' | 'put' | 'delete', error = 'Error') => {
  mockApiService.default[method].mockRejectedValueOnce(new Error(error));
};
