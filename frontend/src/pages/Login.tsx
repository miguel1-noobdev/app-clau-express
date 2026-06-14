import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.service';

const Login: React.FC = () => {
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
        if (resp.token) {
          localStorage.setItem('authToken', resp.token);
        }
        navigate('/dashboard');
      } else {
        setError('Credenciales inválidas');
      }
    } catch (err) {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page fade-in">
      <div className="stark-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>
          CLAUDIA<span className="text-cyan">_</span>EXE
        </h1>
        <p className="text-gold" style={{ letterSpacing: '0.2em', fontSize: '0.7rem', fontWeight: 600 }}>
          STARK INDUSTRIES SYSTEM
        </p>
      </div>

      <div className="glass-card">
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Autenticación <span className="text-cyan">BIOMÉTRICA</span></h2>
        
        <form onSubmit={handleSubmit}>
          <div className="stark-input-group">
            <label htmlFor="username">Protocolo de Usuario</label>
            <input
              id="username"
              className="stark-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite ID de acceso"
              autoComplete="username"
            />
          </div>

          <div className="stark-input-group">
            <label htmlFor="password">Cifrado de Seguridad</label>
            <input
              id="password"
              className="stark-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary mt-4" 
            disabled={loading}
          >
            {loading ? (
              <span className="arc-reactor-glow" style={{ borderRadius: '50%', width: 16, height: 16, border: '2px solid white' }}></span>
            ) : 'Activar Sistemas'}
          </button>
        </form>

        {error && (
          <div role="alert" style={{ 
            color: 'var(--stark-red)', 
            marginTop: '1.5rem', 
            textAlign: 'center',
            fontSize: '0.9rem',
            background: 'rgba(255, 62, 62, 0.1)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--stark-red)'
          }}>
            ERROR RESTRINGIDO: {error}
          </div>
        )}
      </div>

      <div className="stark-footer" style={{ marginTop: '2rem', textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>
        <p>© 2026 STARK INDUSTRIES. Todos los sistemas nominales.</p>
      </div>
    </div>
  );
};

export default Login;
