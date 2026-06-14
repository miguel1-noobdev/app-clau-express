import React from 'react';
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

    // Verificar título (el span interrumpe el texto, usamos querySelector + toHaveTextContent)
    const title = document.querySelector('h2');
    expect(title).toHaveTextContent(/Autenticación BIOMÉTRICA/i);

    // Verificar labels
    expect(screen.getByLabelText(/Protocolo de Usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cifrado de Seguridad/i)).toBeInTheDocument();

    // Verificar placeholders
    expect(screen.getByPlaceholderText(/Digite ID de acceso/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument();

    // Verificar botón submit
    expect(screen.getByRole('button', { name: /Activar Sistemas/i })).toBeInTheDocument();

    // Verificar footer
    expect(screen.getByText(/STARK INDUSTRIES SYSTEM/i)).toBeInTheDocument();
  });

  it('calls API on submit with correct credentials', async () => {
    const mockedPost = vi.mocked(api.post);
    mockedPost.mockResolvedValueOnce({ success: true, token: 'test-token' });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const usernameInput = screen.getByPlaceholderText(/Digite ID de acceso/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/);
    const submitButton = screen.getByRole('button', { name: /Activar Sistemas/i });

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

    const usernameInput = screen.getByPlaceholderText(/Digite ID de acceso/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/);
    const submitButton = screen.getByRole('button', { name: /Activar Sistemas/i });

    fireEvent.change(usernameInput, { target: { value: 'tony' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/ERROR RESTRINGIDO:/i);
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

    const usernameInput = screen.getByPlaceholderText(/Digite ID de acceso/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/);
    const submitButton = screen.getByRole('button', { name: /Activar Sistemas/i });

    fireEvent.change(usernameInput, { target: { value: 'tony' } });
    fireEvent.change(passwordInput, { target: { value: 'stark123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
    });

    // The button should show a spinner (span element) instead of text
    expect(screen.getByRole('button').querySelector('span')).toBeInTheDocument();
    expect(screen.queryByText(/Activar Sistemas/i)).not.toBeInTheDocument();
  });
});
