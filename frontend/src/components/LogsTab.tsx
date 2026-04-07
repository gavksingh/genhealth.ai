import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock } from 'lucide-react';
import { getLogs } from '../api';
import type { ActivityLog } from '../types';

const METHOD: Record<string, { bg: string; text: string }> = {
  GET:    { bg: '#f1f5f9', text: '#475569' },
  POST:   { bg: '#dbeafe', text: '#1e40af' },
  PUT:    { bg: '#fef3c7', text: '#92400e' },
  PATCH:  { bg: '#ede9fe', text: '#5b21b6' },
  DELETE: { bg: '#ffe4e6', text: '#9f1239' },
};

function statusColor(c: number | null) {
  if (!c) return '#94a3b8';
  if (c < 300) return '#059669';
  if (c < 500) return '#d97706';
  return '#e11d48';
}

function durationColor(ms: number | null) {
  if (ms == null) return '#94a3b8';
  if (ms < 100) return '#059669';
  if (ms < 500) return '#d97706';
  return '#e11d48';
}

export default function LogsTab() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [newLogIds, setNewLogIds] = useState<Set<number>>(new Set());
  const prevIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    getLogs().then((d) => {
      setLogs(d);
      prevIds.current = new Set(d.map(l => l.id));
      setLastUpdated(new Date());
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const d = await getLogs();
        const fresh = new Set<number>();
        d.forEach(l => { if (!prevIds.current.has(l.id)) fresh.add(l.id); });
        if (fresh.size > 0) { setNewLogIds(fresh); setTimeout(() => setNewLogIds(new Set()), 1500); }
        prevIds.current = new Set(d.map(l => l.id));
        setLogs(d);
        setLastUpdated(new Date());
      } catch { /* silent */ }
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [lastUpdated]);

  const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' };
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid #f1f5f9' };

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock style={{ width: 18, height: 18, color: '#94a3b8' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>Activity Log</h2>
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Auto-refreshes every 10s &middot; Updated {secondsAgo}s ago
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 20 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: 80, height: 16, background: '#e2e8f0', borderRadius: 4 }} />
                <div style={{ width: 50, height: 20, background: '#e2e8f0', borderRadius: 10 }} />
                <div style={{ width: 200, height: 16, background: '#e2e8f0', borderRadius: 4 }} />
                <div style={{ flex: 1 }} />
                <div style={{ width: 40, height: 16, background: '#e2e8f0', borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 20px' }}>
            <div style={{ position: 'relative', width: 48, height: 48, marginBottom: 16 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #e2e8f0', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite', opacity: 0.3 }} />
              <span style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '2px solid #e2e8f0', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite 0.5s', opacity: 0.3 }} />
              <span style={{ position: 'absolute', inset: 16, borderRadius: '50%', background: '#cbd5e1' }} />
            </div>
            <p style={{ fontWeight: 500, color: '#0f172a', marginBottom: 4 }}>No activity recorded yet</p>
            <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', maxWidth: 300 }}>Make an API request to see it logged here automatically.</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="desktop-logs" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Time</th>
                    <th style={th}>Method</th>
                    <th style={th}>Endpoint</th>
                    <th style={th}>Status</th>
                    <th style={{ ...th, textAlign: 'right' }}>Duration</th>
                    <th style={th} className="ip-col">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => {
                    const mc = METHOD[l.method] || { bg: '#f1f5f9', text: '#475569' };
                    return (
                      <tr key={l.id} style={newLogIds.has(l.id) ? { animation: 'newRowFlash 1.5s ease-out' } : {}}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ ...td, color: '#64748b', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          <span title={new Date(l.timestamp).toISOString()}>
                            {formatDistanceToNow(new Date(l.timestamp), { addSuffix: true })}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '11px', fontWeight: 600, letterSpacing: '0.03em', background: mc.bg, color: mc.text }}>
                            {l.method}
                          </span>
                        </td>
                        <td style={{ ...td, fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '13px', color: '#475569', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.path}
                        </td>
                        <td style={{ ...td, fontWeight: 600, color: statusColor(l.status_code) }}>
                          {l.status_code ?? '—'}
                        </td>
                        <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {l.duration_ms != null ? (
                            <span style={{ fontWeight: 500, color: durationColor(l.duration_ms) }}>
                              {l.duration_ms.toFixed(0)}<span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: 2 }}>ms</span>
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ ...td, color: '#94a3b8', fontSize: '12px' }} className="ip-col">
                          {l.client_ip || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="mobile-logs" style={{ display: 'none', padding: 12, gap: 8, flexDirection: 'column' }}>
              {logs.map((l) => {
                const mc = METHOD[l.method] || { bg: '#f1f5f9', text: '#475569' };
                return (
                  <div key={l.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, background: '#fff', ...(newLogIds.has(l.id) ? { animation: 'newRowFlash 1.5s ease-out' } : {}) }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '11px', fontWeight: 600, background: mc.bg, color: mc.text }}>{l.method}</span>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: statusColor(l.status_code) }}>{l.status_code}</span>
                    </div>
                    <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>{l.path}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
                      <span>{formatDistanceToNow(new Date(l.timestamp), { addSuffix: true })}</span>
                      {l.duration_ms != null && <span style={{ fontWeight: 500, color: durationColor(l.duration_ms) }}>{l.duration_ms.toFixed(0)}ms</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        @media (max-width: 768px) {
          .desktop-logs { display: none !important; }
          .mobile-logs { display: flex !important; }
          .ip-col { display: none !important; }
        }
        @media (min-width: 769px) {
          .mobile-logs { display: none !important; }
        }
      `}</style>
    </div>
  );
}
