import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboard from './AdminDashboard';
import api from '../../services/api.service';

vi.mock('../../services/api.service', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

describe('AdminDashboard', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const wrap = (el: React.ReactNode) => <MemoryRouter initialEntries={['/admin']}><Routes><Route path="/admin" element={el} /><Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} /></Routes></MemoryRouter>;

  it('redirects non-admin user to /dashboard', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ username: 'regular', role: 'user' });
    render(wrap(<AdminDashboard />));
    await waitFor(() => expect(screen.getByTestId('dashboard-page')).toBeInTheDocument());
  });

  it('renders admin navigation tabs for admin user', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ username: 'admin', role: 'admin' });
    render(wrap(<AdminDashboard />));
    await waitFor(() => { expect(screen.getByRole('button', { name: /Usuarios/i })).toBeInTheDocument(); expect(screen.getByRole('button', { name: /Logs/i })).toBeInTheDocument(); expect(screen.getByRole('button', { name: /Registros/i })).toBeInTheDocument(); });
  });

  it('shows loading state initially', () => {
    vi.mocked(api.get).mockImplementationOnce(() => new Promise(() => {}));
    render(wrap(<AdminDashboard />));
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
  });

  it('displays error message when user fetch fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    render(wrap(<AdminDashboard />));
    await waitFor(() => expect(screen.getByText(/Error al cargar datos/i)).toBeInTheDocument());
  });
});
