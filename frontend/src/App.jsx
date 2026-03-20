import React, { useState } from 'react'
import api from './services/api.service.js'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const resp = await api.post('/api/auth/login', { username, password })
      if (resp && resp.success) {
        if (resp.requirePasswordChange) {
          setError('Se requiere cambio de contraseña en el primer inicio de sesión')
        } else {
          setUser({ id: resp.user.id, username: resp.user.username, role: resp.user.role })
        }
      } else {
        setError('Credenciales inválidas')
      }
    } catch (err) {
      setError('Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch (e) {
      // ignore
    } finally {
      setUser(null)
      setUsername('')
      setPassword('')
    }
  }

  if (!user) {
    return (
      <div className="login-container" style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
        <h1>CLAUDIA Express - Inicio de sesión</h1>
        <form onSubmit={login}>
          <div>
            <label>Usuario</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="usuario" />
          </div>
          <div>
            <label>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="contraseña" />
          </div>
          <div style={{ marginTop: '8px' }}>
            <button type="submit" disabled={loading}>{loading ? 'Conectando...' : 'Iniciar sesión'}</button>
          </div>
        </form>
        {error && (
          <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>
        )}
        <div style={{ marginTop: '12px' }}>
          <span>Notas: privilegios y seguridad deben ser tratados con cuidado</span>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard" style={{ padding: '2rem' }}>
      <h1>Bienvenido, {user.username}!</h1>
      <p>Rol: {user.role}</p>
      <button onClick={logout}>Cerrar sesión</button>
    </div>
  )
}

export default App
