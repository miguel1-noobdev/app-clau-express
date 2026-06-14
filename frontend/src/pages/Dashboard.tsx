import React, { useEffect, useState, useMemo } from 'react';
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
}

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('resumen');
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
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
            // FIX: Access the 'logs' property of the response object
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
    } catch (err) { alert('Error al guardar el registro'); }
    finally { setSubmitting(false); }
  };

  const handleResetPassword = async (userId: string) => {
    if (!window.confirm('¿Confirmar reseteo de seguridad para esta cuenta?')) return;
    try {
      const res = await api.put(`/api/users/${userId}/reset-password`);
      alert(`PROTOCOLO COMPLETADO. Nueva clave temporal: ${res.temporaryPassword}`);
    } catch (err) { alert('Fallo en el protocolo de reseteo'); }
  };

  const handleLogout = async () => {
    try { await api.post('/api/auth/logout'); } catch {}
    navigate('/login');
  };

  if (loading) return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="arc-reactor-glow" style={{ borderRadius: '50%', width: 50, height: 50, border: '4px solid var(--stark-cyan)', animation: 'spin 2s linear infinite' }}></div>
      <p className="mt-4 text-cyan" style={{ letterSpacing: '0.1em' }}>JARVIS: CARGANDO SISTEMAS...</p>
    </div>
  );

  return (
    <div className="dashboard-page fade-in">
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

        <main>
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

          {activeTab === 'usuarios' && (
            <div className="fade-in">
              <h3 className="text-cyan" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>GESTIÓN DE PERSONAL</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {users.map(u => (
                  <div key={u._id} className="glass-card stark-card" style={{ display: 'flex', justifyContent: 'space-between', borderLeft: u.isActive ? '3px solid var(--stark-cyan)' : '3px solid var(--stark-red)' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>{u.username}</h4>
                      <p style={{ margin: 0, fontSize: '0.6rem', opacity: 0.6 }}>Rol: {u.role} | Estatus: {u.isActive ? 'ACTIVO' : 'BLOQUEADO'}</p>
                    </div>
                    <div>
                      <button onClick={() => handleResetPassword(u._id)} className="btn-primary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.6rem', background: 'transparent', border: '1px solid var(--stark-gold)', color: 'var(--stark-gold)' }}>RESET</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
    </div>
  );
};

export default Dashboard;
