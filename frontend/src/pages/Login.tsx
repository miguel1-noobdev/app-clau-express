import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.service';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await api.post('/api/auth/login', { username, password });
      if (resp && resp.success) {
        navigate('/dashboard');
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } catch {
      setError('Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page fade-in">
      {/* Logo y título */}
      <div className="login-header">
        <div className="login-logo">⏱️</div>
        <h1 className="login-title">ClaudApp</h1>
        <p className="login-subtitle">Tu registro de horas, fácil y rápido</p>
      </div>

      {/* Formulario */}
      <div className="card login-card">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">👤 Usuario</label>
            <input
              id="username"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu nombre de usuario"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">🔒 Contraseña</label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary mt-2" 
            disabled={loading}
          >
            {loading ? '⏳ Entrando...' : '👉 Entrar'}
          </button>
        </form>

        {error && (
          <div className="error-message mt-2" role="alert">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="login-footer">
        ¿Problemas para entrar? Contactá a tu administrador
      </p>
    </div>
  );
};

export default Login;
