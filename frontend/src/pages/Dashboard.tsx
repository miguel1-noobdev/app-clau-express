import React, { useEffect, useState, useMemo, useCallback } from 'react';
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

const Dashboard: React.FC = () => {
  // ── Estado principal ──
  const [activeTab, setActiveTab] = useState('resumen');
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // ── Estado del formulario de registro de jornada ──
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    horaInicio: '08:00',
    horaFin: '16:00',
    parador: '',
    notas: ''
  });

  // ── Estados para modales de gestión de usuarios ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // ── Estado del formulario para crear usuario ──
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    role: 'user',
    phone: '',
    email: ''
  });

  // ── Estado del formulario para editar usuario ──
  const [editForm, setEditForm] = useState({
    username: '',
    role: 'user'
  });

  // ── Obtener datos iniciales ──
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

  // ── Recargar solo la lista de usuarios (más eficiente que fetchData completo) ──
  const reloadUsers = useCallback(async () => {
    try {
      const usersData = await api.get('/api/users');
      setUsers(usersData);
    } catch (err) {
      console.error('Error recargando usuarios:', err);
    }
  }, []);

  // ── Cerrar modales con tecla Escape ──
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

  // ── Estadísticas memoizadas ──
  const stats = useMemo(() => {
    const totalHours = records.reduce((acc, r) => acc + (r.totalHoras || 0), 0);
    const totalNight = records.reduce((acc, r) => acc + (r.horasNocturnas || 0), 0);
    const daysWorked = new Set(records.map(r => r.fecha)).size;
    const zones = new Set(records.map(r => r.parador)).size;
    return { totalHours, totalNight, daysWorked, zones };
  }, [records]);

  // ── Cálculo de horas y nocturnas ──
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

  // ── Crear registro de jornada ──
  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { total, night } = calculateHours(formData.horaInicio, formData.horaFin);
    try {
      await api.post('/api/records', { ...formData, totalHoras: total, horasNocturnas: night });
      await fetchData();
      setActiveTab('resumen');
      setFormData({ ...formData, parador: '', notas: '', fecha: new Date().toISOString().split('T')[0] });
    } catch (err) { alert('Error al guardar el registro'); }
    finally { setSubmitting(false); }
  };

  // ── CREAR USUARIO ──
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username || !createForm.password) {
      alert('Username y password son obligatorios');
      return;
    }
    try {
      await api.post('/api/users', createForm);
      alert(`Usuario ${createForm.username} creado exitosamente`);
      setShowCreateModal(false);
      setCreateForm({ username: '', password: '', role: 'user', phone: '', email: '' });
      await reloadUsers();
    } catch (err: any) {
      alert(err?.message || 'Error al crear usuario');
    }
  };

  // ── ABRIR MODAL EDITAR ──
  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditForm({ username: u.username, role: u.role });
    setShowEditModal(true);
  };

  // ── ACTUALIZAR USUARIO ──
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.put(`/api/users/${editingUser._id}`, editForm);
      alert(`Usuario ${editForm.username} actualizado`);
      setShowEditModal(false);
      setEditingUser(null);
      await reloadUsers();
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar usuario');
    }
  };

  // ── ELIMINAR USUARIO ──
  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`¿Eliminar permanentemente al usuario "${username}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/api/users/${userId}`);
      alert(`Usuario ${username} eliminado`);
      await reloadUsers();
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar usuario');
    }
  };

  // ── TOGGLE STATUS (bloquear / desbloquear) ──
  const handleToggleStatus = async (userId: string, username: string, currentStatus: boolean) => {
    const action = currentStatus ? 'bloquear' : 'activar';
    if (!window.confirm(`¿${action} al usuario "${username}"?`)) return;
    try {
      await api.put(`/api/users/${userId}/toggle-status`, {});
      await reloadUsers();
    } catch (err: any) {
      alert(err?.message || 'Error al cambiar estado');
    }
  };

  // ── RESET PASSWORD ──
  const handleResetPassword = async (userId: string) => {
    if (!window.confirm('¿Confirmar reseteo de seguridad para esta cuenta?')) return;
    try {
      const res = await api.put(`/api/users/${userId}/reset-password`, {});
      alert(`PROTOCOLO COMPLETADO. Nueva clave temporal: ${res.temporaryPassword}`);
    } catch (err) { alert('Fallo en el protocolo de reseteo'); }
  };

  // ── LOGOUT ──
  const handleLogout = async () => {
    try { await api.post('/api/auth/logout', {}); } catch {}
    navigate('/login');
  };

  // ── Loading screen ──
  if (loading) return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="arc-reactor-glow" style={{ borderRadius: '50%', width: 50, height: 50, border: '4px solid var(--stark-cyan)', animation: 'spin 2s linear infinite' }}></div>
      <p className="mt-4 text-cyan" style={{ letterSpacing: '0.1em' }}>JARVIS: CARGANDO SISTEMAS...</p>
    </div>
  );

  // ── Solo admin puede crear usuarios con rol admin/supervisor ──
  const canCreatePrivileged = user?.username === 'admin';

  return (
    <div className="dashboard-page fade-in">
      {/* Header Stark */}
      <header className="stark-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>CLAUDIA<span className="text-cyan">_</span>EXE</h1>
          <p className="text-gold" style={{ fontSize: '0.6rem', margin: 0, letterSpacing: '2px' }}>PROYECTO STARK INDUSTRIES</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
          <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--stark-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900 }}>{user?.username?.[0].toUpperCase()}</div>
            <span style={{ fontSize: '0.8rem' }}>{user?.username}</span>
          </div>
          <button onClick={handleLogout} className="btn-primary" style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--stark-red)', color: 'var(--stark-red)', fontSize: '0.7rem' }}>CERRAR</button>
        </div>
      </header>

      {/* Navegación por tabs */}
      <nav className="tab-nav">
        <button onClick={() => setActiveTab('resumen')} className={`tab-btn ${activeTab === 'resumen' ? 'active' : ''}`}>Resumen</button>
        <button onClick={() => setActiveTab('registrar')} className={`tab-btn ${activeTab === 'registrar' ? 'active' : ''}`}>Registrar</button>
        <button onClick={() => setActiveTab('reportes')} className={`tab-btn ${activeTab === 'reportes' ? 'active' : ''}`}>Reportes</button>
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <>
            <button onClick={() => setActiveTab('usuarios')} className={`tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`}>Usuarios</button>
            <button onClick={() => setActiveTab('logs')} className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}>Logs</button>
          </>
        )}
        <button onClick={() => setActiveTab('jarvis')} className={`tab-btn ${activeTab === 'jarvis' ? 'active' : ''}`}>JARVIS AI</button>
      </nav>

      <div className="dashboard-grid">
        {/* Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-card stark-card">
            <h4 className="text-cyan" style={{ fontSize: '0.7rem', marginBottom: '1rem' }}>ESTADO ACTUAL</h4>
            <div className="report-summary">
              <div><p style={{ margin: 0, opacity: 0.6, fontSize: '0.6rem' }}>HORAS TOTALES</p><p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>{stats.totalHours.toFixed(1)}</p></div>
              <div><p style={{ margin: 0, opacity: 0.6, fontSize: '0.6rem' }}>NOCTURNAS</p><p className="text-gold" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>{stats.totalNight.toFixed(1)}</p></div>
            </div>
          </div>
          <div className="glass-card stark-card" style={{ borderLeft: '3px solid var(--stark-gold)' }}>
            <h4 className="text-gold" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>MÉTRICAS</h4>
            <p style={{ fontSize: '0.8rem', margin: '2px 0' }}>Días Activos: {stats.daysWorked}</p>
            <p style={{ fontSize: '0.8rem', margin: '2px 0' }}>Zonas Cubiertas: {stats.zones}</p>
          </div>
        </aside>

        {/* Main content */}
        <main>
          {/* ── TAB RESUMEN ── */}
          {activeTab === 'resumen' && (
            <div className="fade-in">
              <h3 className="text-cyan" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>ÚLTIMOS REGISTROS</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {records.slice(0, 5).map(r => (
                  <div key={r._id} className="glass-card stark-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{r.parador}</h4>
                      <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>{new Date(r.fecha).toLocaleDateString()} | {r.horaInicio} - {r.horaFin}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{r.totalHoras} <span style={{ fontSize: '0.6rem' }}>HRS</span></p>
                      {r.horasNocturnas > 0 && <span className="badge-night">🌙 {r.horasNocturnas}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB REGISTRAR ── */}
          {activeTab === 'registrar' && (
            <div className="glass-card stark-card fade-in">
              <div className="scanner-line"></div>
              <h3 className="text-cyan" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>REGISTRAR NUEVA JORNADA</h3>
              <form onSubmit={handleCreateRecord} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="stark-input-group"><label>Fecha</label><input type="date" className="stark-input" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="stark-input-group"><label>Inicio</label><input type="time" className="stark-input" value={formData.horaInicio} onChange={e => setFormData({...formData, horaInicio: e.target.value})} required /></div>
                  <div className="stark-input-group"><label>Fin</label><input type="time" className="stark-input" value={formData.horaFin} onChange={e => setFormData({...formData, horaFin: e.target.value})} required /></div>
                </div>
                <div className="stark-input-group"><label>Parador / Zona</label><input type="text" className="stark-input" placeholder="Ej. Zona C" value={formData.parador} onChange={e => setFormData({...formData, parador: e.target.value})} required /></div>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'SINCRONIZANDO...' : 'GUARDAR REGISTRO'}</button>
              </form>
            </div>
          )}

          {/* ── TAB REPORTES ── */}
          {activeTab === 'reportes' && (
            <div className="fade-in">
              <h3 className="text-gold" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>DESGLOSE POR ZONAS</h3>
              <div className="glass-card stark-card">
                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', opacity: 0.6, borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.5rem' }}>Parador</th>
                      <th style={{ padding: '0.5rem' }}>Días</th>
                      <th style={{ padding: '0.5rem' }}>Total Hrs</th>
                      <th style={{ padding: '0.5rem' }}>Nocturnas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(records.map(r => r.parador))).map(zone => {
                      const zoneRecords = records.filter(r => r.parador === zone);
                      const total = zoneRecords.reduce((acc, r) => acc + r.totalHoras, 0);
                      const night = zoneRecords.reduce((acc, r) => acc + r.horasNocturnas, 0);
                      return (
                        <tr key={zone} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.5rem' }}>{zone}</td>
                          <td style={{ padding: '0.5rem' }}>{zoneRecords.length}</td>
                          <td style={{ padding: '0.5rem' }}>{total.toFixed(1)}</td>
                          <td style={{ padding: '0.5rem' }}>{night.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB USUARIOS (MEJORADO) ── */}
          {activeTab === 'usuarios' && (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="text-cyan" style={{ fontSize: '0.9rem', margin: 0 }}>GESTIÓN DE PERSONAL</h3>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.7rem' }}
                >
                  + CREAR USUARIO
                </button>
              </div>

              {/* Tabla de usuarios con acciones */}
              <div className="glass-card stark-card" style={{ padding: '1rem' }}>
                <table className="admin-table" style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', opacity: 0.6, borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.5rem' }}>Usuario</th>
                      <th style={{ padding: '0.5rem' }}>Rol</th>
                      <th style={{ padding: '0.5rem' }}>Estado</th>
                      <th style={{ padding: '0.5rem' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{u.username}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <span className={`role-badge role-${u.role}`}>{u.role}</span>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <span className={`status-badge ${u.isActive ? 'status-active' : 'status-blocked'}`}>
                            {u.isActive ? 'ACTIVO' : 'BLOQUEADO'}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <div className="action-buttons">
                            {/* Botón editar */}
                            <button
                              onClick={() => openEditModal(u)}
                              className="action-btn action-edit"
                              title="Editar"
                            >
                              ✎
                            </button>
                            {/* Botón toggle status (bloquear / desbloquear) */}
                            <button
                              onClick={() => handleToggleStatus(u._id, u.username, u.isActive)}
                              className={`action-btn ${u.isActive ? 'action-block' : 'action-unblock'}`}
                              title={u.isActive ? 'Bloquear' : 'Activar'}
                            >
                              {u.isActive ? '⊘' : '☑'}
                            </button>
                            {/* Botón reset password */}
                            <button
                              onClick={() => handleResetPassword(u._id)}
                              className="action-btn action-reset"
                              title="Reset Password"
                            >
                              ↻
                            </button>
                            {/* Botón eliminar (solo admin) */}
                            {(user?.role === 'admin') && (
                              <button
                                onClick={() => handleDeleteUser(u._id, u.username)}
                                className="action-btn action-delete"
                                title="Eliminar"
                              >
                                ✕
                              </button>
                            )}
                          </div>
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
              <h3 className="text-gold" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>CONEXIONES RECIENTES</h3>
              <div className="glass-card stark-card" style={{ fontSize: '0.7rem' }}>
                {logs.map((l, i) => (
                  <div key={i} style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{l.username} logged in</span>
                    <span style={{ opacity: 0.6 }}>{new Date(l.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB JARVIS AI ── */}
          {activeTab === 'jarvis' && (
            <div className="glass-card stark-card fade-in" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
              <h3 className="text-cyan" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>JARVIS AI INTERFACE</h3>
              <div style={{ flex: 1, padding: '1rem', background: 'var(--border)', borderRadius: 'var(--radius-sm)', overflowY: 'auto', fontSize: '0.85rem' }}>
                <p className="text-cyan"><b>[SISTEMA]:</b> Bienvenido, {user?.username}.</p>
                <p>He analizado sus datos recientes.</p>
                <p>Esta semana ha completado <b>{stats.totalHours.toFixed(1)} horas</b> totales.</p>
                <p>Las horas nocturnas ascienden a <b>{stats.totalNight.toFixed(1)}</b>, asegúrese de que el reporte de nómina coincida.</p>
                <p className="text-gold">Recomiendo revisar la Zona: <b>{records[0]?.parador || 'N/A'}</b> por su alta frecuencia de actividad.</p>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <input type="text" className="stark-input" placeholder="Preguntar a Jarvis..." disabled />
                <button className="btn-primary" style={{ width: 'auto', padding: '0 1rem' }}>ENVIAR</button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ════════════════════════════════════════════════
          MODAL CREAR USUARIO
          ════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container glass-card" onClick={e => e.stopPropagation()}>
            <div className="scanner-line"></div>
            <h3 className="text-cyan" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>CREAR NUEVO USUARIO</h3>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="stark-input-group">
                <label>Username</label>
                <input
                  type="text"
                  className="stark-input"
                  placeholder="Nombre de usuario"
                  value={createForm.username}
                  onChange={e => setCreateForm({...createForm, username: e.target.value})}
                  required
                  autoFocus
                />
              </div>
              <div className="stark-input-group">
                <label>Password</label>
                <input
                  type="password"
                  className="stark-input"
                  placeholder="Contraseña"
                  value={createForm.password}
                  onChange={e => setCreateForm({...createForm, password: e.target.value})}
                  required
                />
              </div>
              <div className="stark-input-group">
                <label>Rol</label>
                <select
                  className="stark-input"
                  value={createForm.role}
                  onChange={e => setCreateForm({...createForm, role: e.target.value})}
                >
                  <option value="user">user</option>
                  {canCreatePrivileged && (
                    <>
                      <option value="supervisor">supervisor</option>
                      <option value="admin">admin</option>
                    </>
                  )}
                </select>
              </div>
              <div className="stark-input-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  className="stark-input"
                  placeholder="Número de teléfono"
                  value={createForm.phone}
                  onChange={e => setCreateForm({...createForm, phone: e.target.value})}
                />
              </div>
              <div className="stark-input-group">
                <label>Email</label>
                <input
                  type="email"
                  className="stark-input"
                  placeholder="correo@ejemplo.com"
                  value={createForm.email}
                  onChange={e => setCreateForm({...createForm, email: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-primary"
                  style={{ background: 'transparent', border: '1px solid var(--stark-red)', color: 'var(--stark-red)', flex: 1, fontSize: '0.7rem' }}
                >
                  CANCELAR
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, fontSize: '0.7rem' }}>
                  CREAR
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
          <div className="modal-container glass-card" onClick={e => e.stopPropagation()}>
            <div className="scanner-line"></div>
            <h3 className="text-cyan" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              EDITAR USUARIO: <span className="text-gold">{editingUser.username}</span>
            </h3>
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="stark-input-group">
                <label>Username</label>
                <input
                  type="text"
                  className="stark-input"
                  value={editForm.username}
                  onChange={e => setEditForm({...editForm, username: e.target.value})}
                  required
                />
              </div>
              <div className="stark-input-group">
                <label>Rol</label>
                <select
                  className="stark-input"
                  value={editForm.role}
                  onChange={e => setEditForm({...editForm, role: e.target.value})}
                >
                  <option value="user">user</option>
                  {canCreatePrivileged && (
                    <>
                      <option value="supervisor">supervisor</option>
                      <option value="admin">admin</option>
                    </>
                  )}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-primary"
                  style={{ background: 'transparent', border: '1px solid var(--stark-red)', color: 'var(--stark-red)', flex: 1, fontSize: '0.7rem' }}
                >
                  CANCELAR
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, fontSize: '0.7rem' }}>
                  GUARDAR
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
