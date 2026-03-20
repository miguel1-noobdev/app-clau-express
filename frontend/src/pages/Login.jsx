import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api.service.js'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const resp = await api.post('/api/auth/login', { username, password })
      if (resp && resp.success) {
        // If login ok, navigate to dashboard
        navigate('/dashboard')
      } else {
        setError('Credenciales inválidas')
      }
    } catch (err) {
      setError('Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container" style={{ padding: '2rem' }}>
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Usuario</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="usuario" />
        </div>
        <div>
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="contraseña" />
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={loading}>{loading ? 'Iniciando…' : 'Entrar'}</button>
        </div>
      </form>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      <p style={{ marginTop: 12 }}>
        ¿No tienes usuario? Contacta al administrador.
      </p>
      <p><Link to="/">Volver</Link></p>
    </div>
  )
}
