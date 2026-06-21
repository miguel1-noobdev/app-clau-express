import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.service';
import { ROLES, API_ENDPOINTS, DEFAULTS } from './constants';

interface User { _id: string; username: string; role: string; isActive: boolean; phone?: string; email?: string; }

const UserManager = (): JSX.Element => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState<{ username: string; password: string; role: string; phone: string; email: string }>({ username: '', password: '', role: DEFAULTS.ROLE, phone: '', email: '' });
  const [editForm, setEditForm] = useState<{ username: string; role: string }>({ username: '', role: DEFAULTS.ROLE });

  const fetchUsers = useCallback(async () => {
    try { setLoading(true); setError(null); const data = await api.get(API_ENDPOINTS.ADMIN_USERS); setUsers(Array.isArray(data) ? data : []); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error al cargar usuarios'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username || !createForm.password) { setError('Usuario y contraseña son obligatorios'); return; }
    try { await api.post(API_ENDPOINTS.ADMIN_USERS, createForm); setShowCreate(false); setCreateForm({ username: '', password: '', role: DEFAULTS.ROLE, phone: '', email: '' }); await fetchUsers(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error al crear usuario'); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing) return;
    try { await api.put(`${API_ENDPOINTS.ADMIN_USERS}/${editing._id}`, editForm); setShowEdit(false); setEditing(null); await fetchUsers(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error al actualizar usuario'); }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!window.confirm(`Eliminar al usuario "${username}"?`)) return;
    try { await api.delete(`${API_ENDPOINTS.ADMIN_USERS}/${id}`); await fetchUsers(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error al eliminar usuario'); }
  };

  const handleToggle = async (id: string, username: string, current: boolean) => {
    if (!window.confirm(`${current ? 'bloquear' : 'activar'} al usuario "${username}"?`)) return;
    try { await api.put(`${API_ENDPOINTS.ADMIN_USERS}/${id}/toggle-status`, {}); await fetchUsers(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error al cambiar estado'); }
  };

  const handleReset = async (id: string) => {
    if (!window.confirm('Resetear la contraseña?')) return;
    try { await api.put(`${API_ENDPOINTS.ADMIN_USERS}/${id}/reset-password`, {}); await fetchUsers(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error al resetear contraseña'); }
  };

  const openEdit = (user: User) => { setEditing(user); setEditForm({ username: user.username, role: user.role }); setShowEdit(true); };

  if (loading) return <div className="flex items-center justify-center p-4"><div className="loading-spinner" /><p className="text-muted ml-2">Cargando usuarios...</p></div>;

  return (
    <div className="fade-in">
      {error && <div className="card mb-2 error-card"><p>{error}</p></div>}
      <div className="flex justify-between items-center mb-2"><h3>Usuarios</h3><button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">Nuevo</button></div>
      <div className="card table-card">
        <table className="admin-table">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td className="font-semibold">{user.username}</td>
                <td><span className={`role-badge role-${user.role}`}>{user.role}</span></td>
                <td><span className={`status-badge ${user.isActive ? 'status-active' : 'status-blocked'}`}>{user.isActive ? 'Activo' : 'Bloqueado'}</span></td>
                <td>{user.username === DEFAULTS.PROTECTED_ACCOUNT ? <span className="text-muted text-sm">Cuenta protegida</span> : (
                  <div className="action-buttons">
                    <button onClick={() => openEdit(user)} className="action-btn" title="Editar" aria-label="Editar">✏️</button>
                    <button onClick={() => handleToggle(user._id, user.username, user.isActive)} className="action-btn" title={user.isActive ? 'Bloquear' : 'Activar'}>{user.isActive ? '🚫' : '✅'}</button>
                    <button onClick={() => handleReset(user._id)} className="action-btn" title="Reset password">🔑</button>
                    <button onClick={() => handleDelete(user._id, user.username)} className="action-btn action-delete" title="Eliminar">🗑️</button>
                  </div>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" /><h3 className="mb-2">Nuevo usuario</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-1">
              <div className="input-group"><label>Usuario</label><input type="text" className="input" placeholder="Nombre de usuario" value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} required autoFocus /></div>
              <div className="input-group"><label>Contraseña</label><input type="password" className="input" placeholder="Contraseña" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} required /></div>
              <div className="input-group"><label>Rol</label><select className="input" value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}><option value={ROLES.USER}>Usuario</option><option value={ROLES.SUPERVISOR}>Supervisor</option><option value={ROLES.ADMIN}>Admin</option></select></div>
              <div className="input-group"><label>Teléfono (opcional)</label><input type="tel" className="input" placeholder="Número de teléfono" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} /></div>
              <div className="input-group"><label>Email (opcional)</label><input type="email" className="input" placeholder="correo@ejemplo.com" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} /></div>
              <div className="flex gap-1 mt-1"><button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancelar</button><button type="submit" className="btn btn-primary">Crear</button></div>
            </form>
          </div>
        </div>
      )}

      {showEdit && editing && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" /><h3 className="mb-2">Editar usuario</h3>
            <form onSubmit={handleUpdate} className="flex flex-col gap-1">
              <div className="input-group"><label>Usuario</label><input type="text" className="input" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} required /></div>
              <div className="input-group"><label>Rol</label><select className="input" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}><option value={ROLES.USER}>Usuario</option><option value={ROLES.SUPERVISOR}>Supervisor</option><option value={ROLES.ADMIN}>Admin</option></select></div>
              <div className="flex gap-1 mt-1"><button type="button" onClick={() => setShowEdit(false)} className="btn btn-secondary">Cancelar</button><button type="submit" className="btn btn-primary">Guardar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
