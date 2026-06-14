import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage for all tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  get length() { return 0; },
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  get length() { return 0; },
  key: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true });
