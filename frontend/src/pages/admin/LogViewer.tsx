import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.service';
import { API_ENDPOINTS, DEFAULTS } from './constants';

interface LogEntry { _id: string; username?: string; adminUsername?: string; action: string; timestamp: string; details?: string; }

interface LogViewerProps { logType?: 'access' | 'modifications'; }

const LogViewer = ({ logType = 'access' }: LogViewerProps): JSX.Element => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState<number>(DEFAULTS.PAGE_LIMIT);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try { setLoading(true); setError(null); const ep = logType === 'access' ? API_ENDPOINTS.ADMIN_LOGS_ACCESS : API_ENDPOINTS.ADMIN_LOGS_MODIFICATIONS; const data = await api.get(`${ep}?limit=${limit}&offset=${offset}`); setLogs(Array.isArray(data.logs) ? data.logs : []); setTotal(data.total || 0); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error al cargar logs'); }
    finally { setLoading(false); }
  }, [logType, limit, offset]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const pages = Math.ceil(total / limit);
  const page = Math.floor(offset / limit) + 1;

  if (loading) return <div className="flex items-center justify-center p-4"><div className="loading-spinner" /><p className="text-muted ml-2">Cargando logs...</p></div>;

  return (
    <div className="fade-in">
      {error && <div className="card mb-2 error-card"><p>{error}</p></div>}
      <div className="flex justify-between items-center mb-2"><h3>{logType === 'access' ? 'Logs de acceso' : 'Logs de modificaciones'}</h3><select className="input" value={limit} onChange={e => { setLimit(Number(e.target.value)); setOffset(0); }}>{DEFAULTS.PAGE_LIMITS.map(size => <option key={size} value={size}>{size}</option>)}</select></div>
      <div className="card">
        {logs.length === 0 ? <p className="text-muted text-center p-4">No hay registros</p> : (
          <div className="flex flex-col">
            {logs.map(log => (
              <div key={log._id} className="log-row">
                <div><span className="font-semibold">{log.username || log.adminUsername || 'Sistema'}</span><span className="text-muted ml-2">{log.action}</span>{log.details && <p className="text-muted text-xs">{log.details}</p>}</div>
                <span className="text-muted text-sm">{new Date(log.timestamp).toLocaleString(DEFAULTS.LOCALE)}</span>
              </div>
            ))}
          </div>
        )}
        {pages > 1 && (
          <div className="flex justify-between items-center p-4 border-t">
            <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="btn btn-secondary btn-sm">Anterior</button>
            <span className="text-muted text-sm">Página {page} de {pages} ({total} total)</span>
            <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total} className="btn btn-secondary btn-sm">Siguiente</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
