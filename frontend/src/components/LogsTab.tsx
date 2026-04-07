import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock } from 'lucide-react';
import { getLogs } from '../api';
import type { ActivityLog } from '../types';

const METHOD_CONFIG: Record<string, { bg: string; text: string }> = {
  GET:    { bg: 'bg-slate-100',  text: 'text-slate-700' },
  POST:   { bg: 'bg-blue-100',   text: 'text-blue-700' },
  PUT:    { bg: 'bg-amber-100',  text: 'text-amber-700' },
  PATCH:  { bg: 'bg-violet-100', text: 'text-violet-700' },
  DELETE: { bg: 'bg-rose-100',   text: 'text-rose-700' },
};

function statusColor(code: number | null) {
  if (!code) return 'text-slate-400';
  if (code < 300) return 'text-emerald-600';
  if (code < 500) return 'text-amber-600';
  return 'text-rose-600';
}

function durationColor(ms: number | null) {
  if (ms == null) return 'text-slate-400';
  if (ms < 100) return 'text-emerald-600';
  if (ms < 500) return 'text-amber-600';
  return 'text-rose-600';
}

export default function LogsTab() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [newLogIds, setNewLogIds] = useState<Set<number>>(new Set());
  const prevLogIdsRef = useRef<Set<number>>(new Set());

  // Initial fetch
  useEffect(() => {
    getLogs().then((data) => {
      setLogs(data);
      prevLogIdsRef.current = new Set(data.map((l) => l.id));
      setLastUpdated(new Date());
    }).finally(() => setLoading(false));
  }, []);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await getLogs();
        const newIds = new Set<number>();
        data.forEach((l) => {
          if (!prevLogIdsRef.current.has(l.id)) newIds.add(l.id);
        });
        if (newIds.size > 0) {
          setNewLogIds(newIds);
          setTimeout(() => setNewLogIds(new Set()), 1500);
        }
        prevLogIdsRef.current = new Set(data.map((l) => l.id));
        setLogs(data);
        setLastUpdated(new Date());
      } catch {
        // silent fail on background refresh
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update "seconds ago" counter
  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  return (
    <div className="py-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-900">Activity Log</h2>
          </div>
          <div className="text-xs text-slate-400">
            Auto-refreshes every 10s &middot; Updated {secondsAgo}s ago
          </div>
        </div>

        {loading ? (
          <div className="p-8">
            <table className="w-full">
              <tbody>
                {[1, 2, 3, 4].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-12 bg-slate-200 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-40 bg-slate-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-8 bg-slate-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 bg-slate-200 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            {/* Radar animation */}
            <div className="relative w-12 h-12 mb-4">
              <span className="absolute inset-0 rounded-full border-2 border-slate-200 animate-ping opacity-20" />
              <span className="absolute inset-2 rounded-full border-2 border-slate-200 animate-ping opacity-20" style={{ animationDelay: '0.5s' }} />
              <span className="absolute inset-4 rounded-full bg-slate-300" />
            </div>
            <p className="text-slate-900 font-medium mb-1">No activity recorded yet</p>
            <p className="text-slate-500 text-sm text-center max-w-xs">
              Make an API request to see it logged here automatically.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80">
                    {['Time', 'Method', 'Endpoint', 'Status', 'Duration', 'IP'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                      style={newLogIds.has(l.id) ? { animation: 'newRowFlash 1.5s ease-out' } : {}}
                    >
                      <td className="px-4 py-3">
                        <span title={new Date(l.timestamp).toISOString()} className="text-slate-500 text-sm">
                          {formatDistanceToNow(new Date(l.timestamp), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const mc = METHOD_CONFIG[l.method] || { bg: 'bg-slate-100', text: 'text-slate-700' };
                          return (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide ${mc.bg} ${mc.text}`}>
                              {l.method}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-600 truncate max-w-[300px] block">
                          {l.path}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${statusColor(l.status_code)}`}>
                          {l.status_code ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {l.duration_ms != null ? (
                          <span className={`font-medium ${durationColor(l.duration_ms)}`}>
                            {l.duration_ms.toFixed(0)}<span className="text-slate-400 text-xs ml-0.5">ms</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {l.client_ip || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3 p-4">
              {logs.map((l) => {
                const mc = METHOD_CONFIG[l.method] || { bg: 'bg-slate-100', text: 'text-slate-700' };
                return (
                  <div key={l.id} className="border border-slate-200 rounded-lg p-3" style={newLogIds.has(l.id) ? { animation: 'newRowFlash 1.5s ease-out' } : {}}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${mc.bg} ${mc.text}`}>{l.method}</span>
                      <span className={`font-semibold text-sm ${statusColor(l.status_code)}`}>{l.status_code}</span>
                    </div>
                    <p className="font-mono text-sm text-slate-600 truncate mb-2">{l.path}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{formatDistanceToNow(new Date(l.timestamp), { addSuffix: true })}</span>
                      {l.duration_ms != null && (
                        <span className={`font-medium ${durationColor(l.duration_ms)}`}>
                          {l.duration_ms.toFixed(0)}ms
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
