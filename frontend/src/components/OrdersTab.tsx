import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, Plus, FileText, Pencil, Trash2, FileSearch } from 'lucide-react';
import { getOrders, createOrder, updateOrder, deleteOrder } from '../api';
import type { Order, OrderStatus } from '../types';

const STATUS: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  pending:    { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  processing: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  complete:   { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  failed:     { bg: '#ffe4e6', text: '#9f1239', dot: '#f43f5e' },
};

function Badge({ status }: { status: OrderStatus }) {
  const s = STATUS[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 999,
      fontSize: '12px', fontWeight: 500, background: s.bg, color: s.text,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);

  const fetchOrders = async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try { setOrders(await getOrders()); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fn = (fd.get('first_name') as string).trim();
    const ln = (fd.get('last_name') as string).trim();
    const dob = (fd.get('date_of_birth') as string).trim();
    const notes = (fd.get('notes') as string).trim();
    if (!fn || !ln || !dob) { toast.error('All required fields must be filled'); return; }
    try {
      const order = await createOrder({ first_name: fn, last_name: ln, date_of_birth: dob, notes: notes || undefined });
      setShowForm(false);
      formRef.current?.reset();
      setNewIds(prev => new Set(prev).add(order.id));
      setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(order.id); return n; }), 2000);
      await fetchOrders();
      toast.success('Order created');
    } catch { toast.error('Failed to create order'); }
  };

  const handleStatus = async (id: number, status: OrderStatus) => {
    try { await updateOrder(id, { status }); setEditingId(null); await fetchOrders(); toast.success('Status updated'); }
    catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id: number) => {
    try { await deleteOrder(id); setDeletingId(null); await fetchOrders(); toast.success('Order deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' };
  const td: React.CSSProperties = { padding: '14px 16px', fontSize: '14px', borderBottom: '1px solid #f1f5f9' };

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Card container */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>Orders</h2>
            {!loading && (
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', background: '#f1f5f9', padding: '2px 10px', borderRadius: 999 }}>
                {orders.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setShowForm(!showForm)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              <Plus style={{ width: 15, height: 15 }} /> New Order
            </button>
            <button onClick={() => fetchOrders(true)}
              style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', borderRadius: '6px' }}>
              <RefreshCw style={{ width: 16, height: 16, ...(refreshing ? { animation: 'spin 1s linear infinite' } : {}) }} />
            </button>
          </div>
        </div>

        {/* Create Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden', borderBottom: '1px solid #f1f5f9' }}>
              <form ref={formRef} onSubmit={handleCreate}
                style={{ padding: '20px', background: '#fafbfc', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                  {[
                    { name: 'first_name', placeholder: 'First Name *' },
                    { name: 'last_name', placeholder: 'Last Name *' },
                    { name: 'date_of_birth', placeholder: 'DOB (MM/DD/YYYY) *' },
                  ].map((f) => (
                    <input key={f.name} name={f.name} placeholder={f.placeholder} required
                      style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', width: '100%' }} />
                  ))}
                </div>
                <textarea name="notes" placeholder="Notes (optional)" rows={2}
                  style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', resize: 'none', width: '100%' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit"
                    style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Create Order
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {loading ? (
          <div style={{ padding: '16px 0' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: 40, height: 16, background: '#e2e8f0', borderRadius: 4 }} />
                <div style={{ width: 140, height: 16, background: '#e2e8f0', borderRadius: 4 }} />
                <div style={{ width: 100, height: 16, background: '#e2e8f0', borderRadius: 4 }} />
                <div style={{ width: 80, height: 20, background: '#e2e8f0', borderRadius: 12 }} />
                <div style={{ flex: 1 }} />
                <div style={{ width: 100, height: 16, background: '#e2e8f0', borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px' }}>
            <FileSearch style={{ width: 48, height: 48, color: '#cbd5e1', marginBottom: 16 }} />
            <p style={{ fontWeight: 500, color: '#0f172a', marginBottom: 4 }}>No orders yet</p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Upload a medical document or create an order manually.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="desktop-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>ID</th>
                    <th style={th}>Patient Name</th>
                    <th style={th}>DOB</th>
                    <th style={th}>Status</th>
                    <th style={th}>Source</th>
                    <th style={th}>Created</th>
                    <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} style={{
                      background: deletingId === o.id ? '#fff1f2' : newIds.has(o.id) ? '#eff6ff' : 'transparent',
                      transition: 'background 300ms',
                    }}
                    onMouseEnter={(e) => { if (deletingId !== o.id && !newIds.has(o.id)) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={(e) => { if (deletingId !== o.id && !newIds.has(o.id)) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ ...td, fontFamily: 'monospace', color: '#94a3b8', fontSize: '13px' }}>{o.id}</td>
                      <td style={{ ...td, fontWeight: 500, color: '#0f172a' }}>{o.first_name} {o.last_name}</td>
                      <td style={{ ...td, color: '#475569' }}>{o.date_of_birth}</td>
                      <td style={td}>
                        {editingId === o.id ? (
                          <select autoFocus defaultValue={o.status}
                            onChange={(e) => handleStatus(o.id, e.target.value as OrderStatus)}
                            onBlur={() => setEditingId(null)}
                            style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px', fontSize: '13px', outline: 'none' }}>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="complete">Complete</option>
                            <option value="failed">Failed</option>
                          </select>
                        ) : <Badge status={o.status} />}
                      </td>
                      <td style={td}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: '#64748b' }}>
                          {o.extracted_from_document
                            ? <><FileText style={{ width: 14, height: 14, color: '#3b82f6' }} />PDF Upload</>
                            : <><Pencil style={{ width: 14, height: 14, color: '#94a3b8' }} />Manual</>}
                        </span>
                      </td>
                      <td style={td}>
                        <span title={new Date(o.created_at).toISOString()} style={{ color: '#64748b', fontSize: '13px' }}>
                          {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {deletingId === o.id ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => handleDelete(o.id)}
                              style={{ background: '#e11d48', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                              Confirm
                            </button>
                            <button onClick={() => setDeletingId(null)}
                              style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingId(o.id)} title="Edit status"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 6, borderRadius: 4 }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                              <Pencil style={{ width: 15, height: 15 }} />
                            </button>
                            <button onClick={() => setDeletingId(o.id)} title="Delete"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 6, borderRadius: 4 }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#e11d48'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>
                              <Trash2 style={{ width: 15, height: 15 }} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="mobile-cards" style={{ display: 'none', padding: 12, gap: 10, flexDirection: 'column' }}>
              {orders.map((o) => (
                <div key={o.id} style={{
                  border: '1px solid #e2e8f0', borderRadius: 10, padding: 16,
                  background: deletingId === o.id ? '#fff1f2' : newIds.has(o.id) ? '#eff6ff' : '#fff',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 500, color: '#0f172a', fontSize: '15px' }}>{o.first_name} {o.last_name}</span>
                    <Badge status={o.status} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div><p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>DOB</p><p style={{ fontSize: '14px', color: '#475569' }}>{o.date_of_birth}</p></div>
                    <div><p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Source</p><p style={{ fontSize: '14px', color: '#475569' }}>{o.extracted_from_document ? 'PDF Upload' : 'Manual'}</p></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}</span>
                    {deletingId === o.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleDelete(o.id)} style={{ background: '#e11d48', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>Confirm</button>
                        <button onClick={() => setDeletingId(null)} style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 16px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setEditingId(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 10, minHeight: 44, minWidth: 44 }}>
                          <Pencil style={{ width: 16, height: 16 }} />
                        </button>
                        <button onClick={() => setDeletingId(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 10, minHeight: 44, minWidth: 44 }}>
                          <Trash2 style={{ width: 16, height: 16 }} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-table { display: none !important; }
          .mobile-cards { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-cards { display: none !important; }
        }
      `}</style>
    </div>
  );
}
