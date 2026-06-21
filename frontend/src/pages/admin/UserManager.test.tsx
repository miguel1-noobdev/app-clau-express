import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserManager from './UserManager';
import api from '../../services/api.service';

vi.mock('../../services/api.service', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

describe('UserManager', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders user table with username, role and status columns', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([{ _id: '1', username: 'john', role: 'user', isActive: true }, { _id: '2', username: 'jane', role: 'admin', isActive: false }]);
    render(<UserManager />);
    await waitFor(() => { expect(screen.getByText('john')).toBeInTheDocument(); expect(screen.getByText('jane')).toBeInTheDocument(); });
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('opens create user modal on Nuevo click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);
    render(<UserManager />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Nuevo/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Nuevo/i }));
    expect(screen.getByText(/Nuevo usuario/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nombre de usuario/i)).toBeInTheDocument();
  });

  it('shows error message on failed API call', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    render(<UserManager />);
    await waitFor(() => expect(screen.getByText(/Network error/i)).toBeInTheDocument());
  });

  it('opens edit modal when clicking edit button', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([{ _id: '1', username: 'john', role: 'user', isActive: true }]);
    render(<UserManager />);
    await waitFor(() => expect(screen.getByText('john')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Editar/i }));
    expect(screen.getByText(/Editar usuario/i)).toBeInTheDocument();
  });
});
