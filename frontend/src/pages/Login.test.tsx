import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';
import api from '../services/api.service';

vi.mock('../services/api.service', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with correct titles and inputs', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Verificar título principal
    expect(screen.getByRole('heading', { name: /ClaudApp/i })).toBeInTheDocument();
    expect(screen.getByText(/Tu registro de horas/i)).toBeInTheDocument();

    // Verificar labels con emojis
    expect(screen.getByLabelText(/Usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();

    // Verificar placeholders amigables
    expect(screen.getByPlaceholderText(/Tu nombre de usuario/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Tu contraseña/i)).toBeInTheDocument();

    // Verificar botón submit
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();

    // Verificar footer
    expect(screen.getByText(/Problemas para entrar/i)).toBeInTheDocument();
  });

  it('calls API on submit with correct credentials', async () => {
    const mockedPost = vi.mocked(api.post);
    mockedPost.mockResolvedValueOnce({ success: true });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const usernameInput = screen.getByPlaceholderText(/Tu nombre de usuario/i);
    const passwordInput = screen.getByPlaceholderText(/Tu contraseña/i);
    const submitButton = screen.getByRole('button', { name: /Entrar/i });

    fireEvent.change(usernameInput, { target: { value: 'tony' } });
    fireEvent.change(passwordInput, { target: { value: 'stark123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/api/auth/login', {
        username: 'tony',
        password: 'stark123',
      });
    });
  });

  it('shows error message on failed login', async () => {
    const mockedPost = vi.mocked(api.post);
    mockedPost.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const usernameInput = screen.getByPlaceholderText(/Tu nombre de usuario/i);
    const passwordInput = screen.getByPlaceholderText(/Tu contraseña/i);
    const submitButton = screen.getByRole('button', { name: /Entrar/i });

    fireEvent.change(usernameInput, { target: { value: 'tony' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Usuario o contraseña incorrectos/i);
    });
  });

  it('shows loading state while submitting', async () => {
    const mockedPost = vi.mocked(api.post);
    // Delay the promise so we can observe the loading state
    mockedPost.mockImplementationOnce(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const usernameInput = screen.getByPlaceholderText(/Tu nombre de usuario/i);
    const passwordInput = screen.getByPlaceholderText(/Tu contraseña/i);
    const submitButton = screen.getByRole('button', { name: /Entrar/i });

    fireEvent.change(usernameInput, { target: { value: 'tony' } });
    fireEvent.change(passwordInput, { target: { value: 'stark123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
    });

    // The button should show loading text
    expect(screen.getByText(/Entrando/i)).toBeInTheDocument();
  });
});
