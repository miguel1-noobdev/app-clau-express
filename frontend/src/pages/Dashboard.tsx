import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Intenta obtener el usuario de la sesión
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json()
        // No hay sesión o permiso; redirige a login
        navigate('/login')
      })
      .then(data => {
        if (data) {
          // data puede ser un User u objeto { user: { ... } }
          const u = data.user || data
          setUser(u)
        }
      })
      .catch(() => navigate('/login'))
  }, [navigate])

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch { /* ignore */ }
    setUser(null)
    navigate('/login')
  }

  if (!user) {
    return <div className="dashboard" style={{ padding: '2rem' }}>Cargando...</div>
  }

  return (
    <div className="dashboard" style={{ padding: '2rem' }}>
      <h2>Dashboard</h2>
      <p>Bienvenido a CLAUDIA Express. Este es un panel de pruebas tras login.</p>
      <p>Usuario: {user.username} | Rol: {user.role}</p>
      <button onClick={logout}>Cerrar sesión</button>
      <nav>
        <ul>
          <li><Link to="/login">Logout</Link></li>
        </ul>
      </nav>
    </div>
  )
}
