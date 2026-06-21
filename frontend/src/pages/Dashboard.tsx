import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.service';

interface Record {
  _id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  totalHoras: number;
  horasNocturnas: number;
  parador: string;
  notas: string;
}

interface User {
  _id: string;
  username: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  phone?: string;
  email?: string;
}

interface DashboardProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Dashboard = ({ theme, toggleTheme }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState('resumen');
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<{ username: string; timestamp: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    horaInicio: '08:00',
    horaFin: '16:00',
    parador: '',
    notas: ''
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    role: 'user',
    phone: '',
    email: ''
  });

  const [editForm, setEditForm] = useState({
    username: '',
    role: 'user'
  });

  const fetchData = async () => {
    try {
      const userData = await api.get('/api/auth/me');
      if (userData && userData.username) {
        setUser(userData);
        const recordsData = await api.get('/api/records');
        setRecords(Array.isArray(recordsData) ? recordsData : []);

        if (userData.role === 'admin' || userData.role === 'supervisor') {
          const usersData = await api.get('/api/users');
          setUsers(usersData);
          const logsData = await api.get('/api/logs/access');
          setLogs(Array.isArray(logsData.logs) ? logsData.logs.slice(0, 20) : []);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const reloadUsers = useCallback(async () => {
    try {
      const usersData = await api.get('/api/users');
      setUsers(usersData);
    } catch (err) {
      console.error('Error recargando usuarios:', err);
    }
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setShowEditModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const stats = useMemo(() => {
    const totalHours = records.reduce((acc, r) => acc + (r.totalHoras || 0), 0);
    const totalNight = records.reduce((acc, r) => acc + (r.horasNocturnas || 0), 0);
    const daysWorked = new Set(records.map(r => r.fecha)).size;
    const zones = new Set(records.map(r => r.parador)).size;
    return { totalHours, totalNight, daysWorked, zones };
  }, [records]);

  const calculateHours = (start: string, end: string) => {
    const [hStart, mStart] = start.split(':').map(Number);
    const [hEnd, mEnd] = end.split(':').map(Number);
    let totalMinutes = (hEnd * 60 + mEnd) - (hStart * 60 + mStart);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const total = totalMinutes / 60;
    const nightStartMinutes = 22 * 60;
    let nightMinutes = 0;
    const endMin = hEnd * 60 + mEnd;
    const startMin = hStart * 60 + mStart;
    if (endMin > nightStartMinutes) nightMinutes = endMin - Math.max(startMin, nightStartMinutes);
    else if (endMin < startMin) nightMinutes = (24 * 60 - Math.max(startMin, nightStartMinutes)) + Math.min(endMin, 6 * 60);
    return { total: Number(total.toFixed(2)), night: Number((nightMinutes / 60).toFixed(2)) };
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { total, night } = calculateHours(formData.horaInicio, formData.horaFin);
    try {
      await api.post('/api/records', { ...formData, totalHoras: total, horasNocturnas: night });
      await fetchData();
      setActiveTab('resumen');
      setFormData({ ...formData, parador: '', notas: '', fecha: new Date().toISOString().split('T')[0] });
    } catch {
      alert('Error al guardar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username || !createForm.password) {
      alert('Usuario y contraseña son obligatorios');
      return;
    }
    try {
      await api.post('/api/users', createForm);
      alert(`Usuario ${createForm.username} creado`);
      setShowCreateModal(false);
      setCreateForm({ username: '', password: '', role: 'user', phone: '', email: '' });
      await reloadUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear usuario';
      alert(message);
    }
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditForm({ username: u.username, role: u.role });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.put(`/api/users/${editingUser._id}`, editForm);
      alert(`Usuario ${editForm.username} actualizado`);
      setShowEditModal(false);
      setEditingUser(null);
      await reloadUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar';
      alert(message);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`¿Eliminar al usuario "${username}"?`)) return;
    try {
      await api.delete(`/api/users/${userId}`);
      alert(`Usuario ${username} eliminado`);
      await reloadUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar';
      alert(message);
    }
  };

  const handleToggleStatus = async (userId: string, username: string, currentStatus: boolean) => {
    const action = currentStatus ? 'bloquear' : 'activar';
    if (!window.confirm(`¿${action} al usuario "${username}"?`)) return;
    try {
      await api.put(`/api/users/${userId}/toggle-status`, {});
      await reloadUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar estado';
      alert(message);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!window.confirm('¿Resetear la contraseña?')) return;
    try {
      const res = await api.put(`/api/users/${userId}/reset-password`, {});
      alert(`Contraseña reseteada. Nueva clave: ${res.temporaryPassword}`);
    } catch {
      alert('Error al resetear contraseña');
    }
  };

  const handleLogout = async () => {
    try { await api.post('/api/auth/logout', {}); } catch { /* ignore */ }
    navigate('/login');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };

  const canCreatePrivileged = user?.username === 'admin';

  if (loading) {
    return (
      <div className="app-container items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="loading-spinner"></div>
        <p className="text-muted mt-2">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page fade-in">
      {/* Header */}
      <header className="app-header">
        <div>
          <h1 className="app-header-title">⏱️ ClaudApp</h1>
        </div>
        <div className="app-header-user">
          <button onClick={toggleTheme} className="icon-btn" title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div className="avatar">{user?.username?.[0].toUpperCase()}</div>
          <span style={{ fontWeight: 600 }}>{user?.username}</span>
          <button onClick={handleLogout} className="icon-btn" title="Salir">
            🚪
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tab-nav">
        <button 
          onClick={() => setActiveTab('resumen')} 
          className={`tab-btn ${activeTab === 'resumen' ? 'active' : ''}`}
        >
          📊 Resumen
        </button>
        <button 
          onClick={() => setActiveTab('registrar')} 
          className={`tab-btn ${activeTab === 'registrar' ? 'active' : ''}`}
        >
          ➕ Registrar
        </button>
        <button 
          onClick={() => setActiveTab('reportes')} 
          className={`tab-btn ${activeTab === 'reportes' ? 'active' : ''}`}
        >
          📈 Reportes
        </button>
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <>
            <button 
              onClick={() => setActiveTab('usuarios')} 
              className={`tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`}
            >
              👥 Usuarios
            </button>
            <button 
              onClick={() => setActiveTab('logs')} 
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            >
              📋 Logs
            </button>
          </>
        )}
      </nav>

      {/* Content */}
      <main>
        {/* ── TAB RESUMEN ── */}
        {activeTab === 'resumen' && (
          <div className="fade-in">
            {/* Stats */}
            <div className="stats-grid mb-2">
              <div className="stat-card">
                <p className="stat-value">{stats.totalHours.toFixed(1)}</p>
                <p className="stat-label">Horas totales</p>
              </div>
              <div className="stat-card">
                <p className="stat-value text-warning">{stats.totalNight.toFixed(1)}</p>
                <p className="stat-label">🌙 Nocturnas</p>
              </div>
              <div className="stat-card">
                <p className="stat-value">{stats.daysWorked}</p>
                <p className="stat-label">Días trabajados</p>
              </div>
              <div className="stat-card">
                <p className="stat-value">{stats.zones}</p>
                <p className="stat-label">Zonas</p>
              </div>
            </div>

            {/* Últimos registros */}
            <h3 className="mb-1">Últimos registros</h3>
            {records.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p className="empty-state-text">
                  Todavía no cargaste ningún registro.<br />
                  ¡Empezá con el botón "Registrar"!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {records.slice(0, 5).map(r => (
                  <div key={r._id} className="record-item">
                    <div className="record-icon">📍</div>
                    <div className="record-info">
                      <p className="record-title">{r.parador || 'Sin zona'}</p>
                      <p className="record-subtitle">
                        {formatDate(r.fecha)} · {r.horaInicio} - {r.horaFin}
                      </p>
                    </div>
                    <div className="record-hours">
                      <p className="record-hours-value">{r.totalHoras}h</p>
                      {r.horasNocturnas > 0 && (
                        <span className="badge badge-warning">🌙 {r.horasNocturnas}h</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB REGISTRAR ── */}
        {activeTab === 'registrar' && (
          <div className="card fade-in">
            <h3 className="mb-2">➕ Nuevo registro</h3>
            <form onSubmit={handleCreateRecord} className="flex flex-col gap-2">
              <div className="input-group">
                <label>📅 Fecha</label>
                <input 
                  type="date" 
                  className="input" 
                  value={formData.fecha} 
                  onChange={e => setFormData({...formData, fecha: e.target.value})} 
                  required 
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>🕐 Entrada</label>
                  <input 
                    type="time" 
                    className="input" 
                    value={formData.horaInicio} 
                    onChange={e => setFormData({...formData, horaInicio: e.target.value})} 
                    required 
                  />
                </div>
                <div className="input-group">
                  <label>🕕 Salida</label>
                  <input 
                    type="time" 
                    className="input" 
                    value={formData.horaFin} 
                    onChange={e => setFormData({...formData, horaFin: e.target.value})} 
                    required 
                  />
                </div>
              </div>

              <div className="input-group">
                <label>📍 Zona / Parador</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Ej: Zona Norte, Parador 5" 
                  value={formData.parador} 
                  onChange={e => setFormData({...formData, parador: e.target.value})} 
                  required 
                />
              </div>

              <div className="input-group">
                <label>📝 Notas (opcional)</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Algo para recordar..." 
                  value={formData.notas} 
                  onChange={e => setFormData({...formData, notas: e.target.value})} 
                />
              </div>

              <button type="submit" className="btn btn-primary mt-1" disabled={submitting}>
                {submitting ? '⏳ Guardando...' : '✅ Guardar registro'}
              </button>
            </form>
          </div>
        )}

        {/* ── TAB REPORTES ── */}
        {activeTab === 'reportes' && (
          <div className="fade-in">
            <h3 className="mb-2">📈 Resumen por zona</h3>
            {records.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <p className="empty-state-text">No hay datos para mostrar</p>
              </div>
            ) : (
              <div className="card">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Zona</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Días</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Horas</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🌙</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(records.map(r => r.parador))).map(zone => {
                      const zoneRecords = records.filter(r => r.parador === zone);
                      const total = zoneRecords.reduce((acc, r) => acc + r.totalHoras, 0);
                      const night = zoneRecords.reduce((acc, r) => acc + r.horasNocturnas, 0);
                      return (
                        <tr key={zone} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{zone}</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{zoneRecords.length}</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{total.toFixed(1)}</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{night.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB USUARIOS ── */}
        {activeTab === 'usuarios' && (
          <div className="fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 style={{ margin: 0 }}>👥 Usuarios</h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary btn-sm"
              >
                ➕ Nuevo
              </button>
            </div>

            <div className="card" style={{ padding: '0.5rem', overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td style={{ fontWeight: 600 }}>{u.username}</td>
                      <td>
                        <span className={`role-badge role-${u.role}`}>{u.role}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${u.isActive ? 'status-active' : 'status-blocked'}`}>
                          {u.isActive ? '✓ Activo' : '✕ Bloqueado'}
                        </span>
                      </td>
                      <td>
                        {u.username === 'admin' ? (
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>Cuenta protegida</span>
                        ) : (
                          <div className="action-buttons">
                            <button onClick={() => openEditModal(u)} className="action-btn" title="Editar">✏️</button>
                            <button onClick={() => handleToggleStatus(u._id, u.username, u.isActive)} className="action-btn" title={u.isActive ? 'Bloquear' : 'Activar'}>
                              {u.isActive ? '🚫' : '✅'}
                            </button>
                            <button onClick={() => handleResetPassword(u._id)} className="action-btn" title="Reset password">🔑</button>
                            {user?.role === 'admin' && (
                              <button onClick={() => handleDeleteUser(u._id, u.username)} className="action-btn action-delete" title="Eliminar">🗑️</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB LOGS ── */}
        {activeTab === 'logs' && (
          <div className="fade-in">
            <h3 className="mb-2">📋 Últimas conexiones</h3>
            <div className="card">
              {logs.length === 0 ? (
                <p className="text-muted text-center">No hay registros</p>
              ) : (
                logs.map((l, i) => (
                  <div key={i} style={{ padding: '0.5rem 0', borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span>👤 {l.username}</span>
                    <span className="text-muted">{new Date(l.timestamp).toLocaleString('es-AR')}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ════════════════════════════════════════════════
          MODAL CREAR USUARIO
          ════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <h3 className="mb-2">➕ Nuevo usuario</h3>
            <form onSubmit={handleCreateUser} className="flex flex-col gap-1">
              <div className="input-group">
                <label>Usuario</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Nombre de usuario"
                  value={createForm.username}
                  onChange={e => setCreateForm({...createForm, username: e.target.value})}
                  required
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Contraseña"
                  value={createForm.password}
                  onChange={e => setCreateForm({...createForm, password: e.target.value})}
                  required
                />
              </div>
              <div className="input-group">
                <label>Rol</label>
                <select
                  className="input"
                  value={createForm.role}
                  onChange={e => setCreateForm({...createForm, role: e.target.value})}
                >
                  <option value="user">Usuario</option>
                  {canCreatePrivileged && (
                    <>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Admin</option>
                    </>
                  )}
                </select>
              </div>
              <div className="input-group">
                <label>Teléfono (opcional)</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="Número de teléfono"
                  value={createForm.phone}
                  onChange={e => setCreateForm({...createForm, phone: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label>Email (opcional)</label>
                <input
                  type="email"
                  className="input"
                  placeholder="correo@ejemplo.com"
                  value={createForm.email}
                  onChange={e => setCreateForm({...createForm, email: e.target.value})}
                />
              </div>
              <div className="flex gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          MODAL EDITAR USUARIO
          ════════════════════════════════════════════════ */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"></div>
            <h3 className="mb-2">✏️ Editar: {editingUser.username}</h3>
            <form onSubmit={handleUpdateUser} className="flex flex-col gap-1">
              <div className="input-group">
                <label>Usuario</label>
                <input
                  type="text"
                  className="input"
                  value={editForm.username}
                  onChange={e => setEditForm({...editForm, username: e.target.value})}
                  required
                />
              </div>
              <div className="input-group">
                <label>Rol</label>
                <select
                  className="input"
                  value={editForm.role}
                  onChange={e => setEditForm({...editForm, role: e.target.value})}
                >
                  <option value="user">Usuario</option>
                  {canCreatePrivileged && (
                    <>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Admin</option>
                    </>
                  )}
                </select>
              </div>
              <div className="flex gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
