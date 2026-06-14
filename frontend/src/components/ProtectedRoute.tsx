import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api.service';

/**
 * ProtectedRoute - Componente que protege rutas privadas
 * 
 * ¿Cómo funciona?
 * El backend usa sesiones con cookies (no tokens JWT).
 * Cuando hacés login, el backend crea una sesión en MongoDB y el navegador
 * guarda una cookie automáticamente.
 * 
 * Para verificar si el usuario está logueado, preguntamos al backend:
 * GET /api/auth/me → Si devuelve datos, hay sesión. Si devuelve 401, no hay.
 * 
 * ¿Por qué no usar localStorage?
 * Porque el backend no devuelve un token. Usa cookies de sesión.
 * localStorage.getItem('authToken') siempre sería null.
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión con el backend
    const checkSession = async () => {
      try {
        await api.get('/api/auth/me');
        // Si la API responde sin error, hay sesión activa
        setIsAuthenticated(true);
      } catch (error) {
        // Si la API devuelve 401, no hay sesión
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  // Mientras verificamos, mostramos un spinner de carga
  if (isLoading) {
    return (
      <div className="app-container" style={{ 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div className="loading-spinner" />
        <p className="loading-text">Verificando sesión...</p>
      </div>
    );
  }

  // Si no hay sesión, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si hay sesión, renderizar el contenido protegido
  return <>{children}</>;
};
