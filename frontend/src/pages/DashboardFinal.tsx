import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const DashboardFinal: React.FC = () => {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.username) setUser(data)
        else navigate('/login')
      })
      .catch(() => navigate('/login'))
  }, [navigate])

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch {}
    setUser(null)
    navigate('/login')
  }

  if (!user) return <div>Loading...</div>

  return (
    <div className="dashboard" style={{ padding: '2rem' }}>
      <h2>Dashboard</h2>
      <p>Usuario: {user.username} | Rol: {user.role}</p>
      <button onClick={logout}>Cerrar sesión</button>
      <nav>
        <ul>
          <li><Link to="/login">Cerrar sesión</Link></li>
        </ul>
      </nav>
    </div>
  )
}

export default DashboardFinal
