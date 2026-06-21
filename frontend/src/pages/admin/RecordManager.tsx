import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.service';
import { API_ENDPOINTS, DEFAULTS } from './constants';

interface Record { _id: string; username?: string; fecha: string; horaInicio: string; horaFin: string; totalHoras: number; parador: string; notas: string; }

const RecordManager = (): JSX.Element => {
  const [records, setRecords] = useState<Record[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<Record | null>(null);
  const [editForm, setEditForm] = useState({ fecha: '', horaInicio: '', horaFin: '', parador: '', notas: '', reason: '' });

  const fetchRecords = useCallback(async () => {
    try { setLoading(true); setError(null); const users = await api.get(API_ENDPOINTS.ADMIN_USERS); const all: Record[] = []; for (const user of Array.isArray(users) ? users : []) { try { const response = await api.get(API_ENDPOINTS.USER_RECORDS(user._id)); if (response.records) all.push(...response.records.map((record: Record) => ({ ...record, username: user.username }))); } catch (err: unknown) { setError(prev => prev ? `${prev}; ${err instanceof Error ? err.message : 'Error'}` : (err instanceof Error ? err.message : 'Error')); } } setRecords(all); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error al cargar registros'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing) return;
    try { await api.put(API_ENDPOINTS.ADMIN_RECORD_EDIT(editing._id), { ...editForm, reason: editForm.reason || DEFAULTS.EDIT_REASON }); setShowEdit(false); setEditing(null); await fetchRecords(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error al editar registro'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Eliminar este registro?')) return;
    try { await api.delete(API_ENDPOINTS.ADMIN_RECORD_DELETE(id)); await fetchRecords(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error al eliminar registro'); }
  };

  const openEdit = (record: Record) => { setEditing(record); setEditForm({ fecha: record.fecha, horaInicio: record.horaInicio, horaFin: record.horaFin, parador: record.parador, notas: record.notas, reason: '' }); setShowEdit(true); };

  const filtered = records.filter(record => !filter || (record.username || '').toLowerCase().includes(filter.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center p-4"><div className="loading-spinner" /><p className="text-muted ml-2">Cargando registros...</p></div>;

  return (
    <div className="fade-in">
      {error && <div className="card mb-2 error-card"><p>{error}</p></div>}
      <div className="flex justify-between items-center mb-2"><h3>Registros</h3><input type="text" className="input" placeholder="Buscar por usuario..." value={filter} onChange={e => setFilter(e.target.value)} /></div>
      <div className="card table-card">
        <table className="admin-table">
          <thead><tr><th>Usuario</th><th>Fecha</th><th>Horario</th><th>Horas</th><th>Zona</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.map(record => (
              <tr key={record._id}><td className="font-semibold">{record.username || 'N/A'}</td><td>{new Date(record.fecha).toLocaleDateString(DEFAULTS.LOCALE)}</td><td>{record.horaInicio} - {record.horaFin}</td><td>{record.totalHoras}h</td><td>{record.parador}</td>
                <td><div className="action-buttons"><button onClick={() => openEdit(record)} className="action-btn" title="Editar" aria-label="Editar">✏️</button><button onClick={() => handleDelete(record._id)} className="action-btn action-delete" title="Eliminar">🗑️</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-muted text-center p-4">No hay registros</p>}
      </div>
      {showEdit && editing && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" /><h3 className="mb-2">Editar registro</h3>
            <form onSubmit={handleEdit} className="flex flex-col gap-1">
              <div className="input-group"><label>Fecha</label><input type="date" className="input" value={editForm.fecha} onChange={e => setEditForm({ ...editForm, fecha: e.target.value })} required /></div>
              <div className="input-group"><label>Inicio</label><input type="time" className="input" value={editForm.horaInicio} onChange={e => setEditForm({ ...editForm, horaInicio: e.target.value })} required /></div>
              <div className="input-group"><label>Fin</label><input type="time" className="input" value={editForm.horaFin} onChange={e => setEditForm({ ...editForm, horaFin: e.target.value })} required /></div>
              <div className="input-group"><label>Zona</label><input type="text" className="input" value={editForm.parador} onChange={e => setEditForm({ ...editForm, parador: e.target.value })} required /></div>
              <div className="input-group"><label>Notas</label><input type="text" className="input" value={editForm.notas} onChange={e => setEditForm({ ...editForm, notas: e.target.value })} /></div>
              <div className="input-group"><label>Motivo de edición</label><input type="text" className="input" placeholder="Motivo..." value={editForm.reason} onChange={e => setEditForm({ ...editForm, reason: e.target.value })} required /></div>
              <div className="flex gap-1 mt-1"><button type="button" onClick={() => setShowEdit(false)} className="btn btn-secondary">Cancelar</button><button type="submit" className="btn btn-primary">Guardar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordManager;
