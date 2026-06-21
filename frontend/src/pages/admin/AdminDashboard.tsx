import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.service';
import UserManager from './UserManager';
import LogViewer from './LogViewer';
import RecordManager from './RecordManager';
import { ROLES, ROUTES, API_ENDPOINTS } from './constants';

interface User { username: string; role: string; }

const AdminDashboard = (): JSX.Element | null => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'users' | 'logs' | 'records'>('users');
  const navigate = useNavigate();

  useEffect(() => {
    api.get(API_ENDPOINTS.AUTH_ME).then(data => {
      if (data?.role !== ROLES.ADMIN && data?.role !== ROLES.SUPERVISOR) {
        navigate(ROUTES.DASHBOARD, { replace: true });
        return;
      }
      setUser(data);
    }).catch(err => setError(err instanceof Error ? err.message : 'Error al cargar datos')).finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div className="app-container items-center justify-center"><div className="loading-spinner" /><p className="text-muted mt-2">Cargando...</p></div>;
  if (error) return <div className="app-container"><p className="text-danger">Error al cargar datos: {error}</p></div>;
  if (!user) return null;

  return (
    <div className="dashboard-page fade-in">
      <header className="app-header">
        <div><h1 className="app-header-title">Panel de Administración</h1></div>
        <div className="app-header-user">
          <div className="avatar">{user.username[0].toUpperCase()}</div>
          <strong>{user.username}</strong>
        </div>
      </header>
      <nav className="tab-nav">
        <button onClick={() => setActiveSection('users')} className={`tab-btn ${activeSection === 'users' ? 'active' : ''}`}>Usuarios</button>
        <button onClick={() => setActiveSection('logs')} className={`tab-btn ${activeSection === 'logs' ? 'active' : ''}`}>Logs</button>
        <button onClick={() => setActiveSection('records')} className={`tab-btn ${activeSection === 'records' ? 'active' : ''}`}>Registros</button>
      </nav>
      <main>
        {activeSection === 'users' && <UserManager />}
        {activeSection === 'logs' && <LogViewer />}
        {activeSection === 'records' && <RecordManager />}
      </main>
    </div>
  );
};

export default AdminDashboard;
