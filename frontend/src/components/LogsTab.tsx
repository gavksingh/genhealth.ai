import { useState, useEffect } from 'react';
import { getLogs } from '../api';
import type { ActivityLog } from '../types';

const METHOD_COLORS: Record<string, string> = {
  GET: '#3b82f6',
  POST: '#22c55e',
  PUT: '#f59e0b',
  PATCH: '#f59e0b',
  DELETE: '#ef4444',
};

export default function LogsTab() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLogs().then(setLogs).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  if (logs.length === 0) return <p className="empty">No activity logs yet.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Method</th>
            <th>Endpoint</th>
            <th>Status</th>
            <th>Duration</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{new Date(l.timestamp).toLocaleString()}</td>
              <td>
                <span
                  className="badge method-badge"
                  style={{ backgroundColor: METHOD_COLORS[l.method] || '#6b7280' }}
                >
                  {l.method}
                </span>
              </td>
              <td className="path-cell">{l.path}</td>
              <td>{l.status_code}</td>
              <td>{l.duration_ms != null ? `${l.duration_ms.toFixed(0)}ms` : '—'}</td>
              <td>{l.client_ip || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
