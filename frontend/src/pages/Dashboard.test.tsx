import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import api from '../services/api.service';

vi.mock('../services/api.service', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    const mockedGet = vi.mocked(api.get);
    mockedGet.mockImplementationOnce(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
  });

  it('renders tabs after loading data', async () => {
    const mockedGet = vi.mocked(api.get);
    mockedGet.mockResolvedValueOnce({
      username: 'tony',
      role: 'user',
    });
    mockedGet.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Resumen/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Registrar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reportes/i })).toBeInTheDocument();
    });
  });

  it('shows admin tabs for admin users', async () => {
    const mockedGet = vi.mocked(api.get);
    mockedGet.mockResolvedValueOnce({
      username: 'tony',
      role: 'admin',
    });
    mockedGet.mockResolvedValueOnce([]);
    mockedGet.mockResolvedValueOnce([]);
    mockedGet.mockResolvedValueOnce({ logs: [] });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Usuarios/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Logs/i })).toBeInTheDocument();
    });
  });

  it('does not show admin tabs for regular users', async () => {
    const mockedGet = vi.mocked(api.get);
    mockedGet.mockResolvedValueOnce({
      username: 'tony',
      role: 'user',
    });
    mockedGet.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Resumen/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Usuarios/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Logs/i })).not.toBeInTheDocument();
  });
});
