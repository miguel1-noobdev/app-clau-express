import React from 'react'
import { Link } from 'react-router-dom'

import React from 'react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  // Simple dashboard placeholder
  return (
    <div className="dashboard" style={{ padding: '2rem' }}>
      <h2>Dashboard</h2>
      <p>Bienvenido a CLAUDIA Express. Este es un panel de pruebas tras login.</p>
      <nav>
        <ul>
          <li><Link to="/login">Cerrar sesión</Link></li>
        </ul>
      </nav>
    </div>
  )
}
