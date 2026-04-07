import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, Plus, FileText, Pencil, Trash2, FileSearch } from 'lucide-react';
import { getOrders, createOrder, updateOrder, deleteOrder } from '../api';
import type { Order, OrderStatus } from '../types';

const STATUS_CONFIG: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  pending:    { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  processing: { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  complete:   { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  failed:     { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500' },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-3"><div className="h-4 w-8 bg-slate-200 rounded" /></td>
          <td className="px-4 py-3"><div className="h-4 w-32 bg-slate-200 rounded" /></td>
          <td className="px-4 py-3"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
          <td className="px-4 py-3"><div className="h-5 w-20 bg-slate-200 rounded-full" /></td>
          <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
          <td className="px-4 py-3"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
          <td className="px-4 py-3"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
        </tr>
      ))}
    </>
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

  const fetchOrders = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setOrders(await getOrders());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const firstName = (fd.get('first_name') as string).trim();
    const lastName = (fd.get('last_name') as string).trim();
    const dob = (fd.get('date_of_birth') as string).trim();
    const notes = (fd.get('notes') as string).trim();

    if (!firstName || !lastName || !dob) {
      toast.error('First name, last name, and date of birth are required');
      return;
    }

    try {
      const order = await createOrder({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob,
        notes: notes || undefined,
      });
      setShowForm(false);
      formRef.current?.reset();
      setNewIds((prev) => new Set(prev).add(order.id));
      setTimeout(() => setNewIds((prev) => { const n = new Set(prev); n.delete(order.id); return n; }), 2000);
      await fetchOrders();
      toast.success('Order created successfully');
    } catch {
      toast.error('Failed to create order');
    }
  };

  const handleStatusChange = async (id: number, status: OrderStatus) => {
    try {
      await updateOrder(id, { status });
      setEditingId(null);
      await fetchOrders();
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteOrder(id);
      setDeletingId(null);
      await fetchOrders();
      toast.success('Order deleted');
    } catch {
      toast.error('Failed to delete order');
    }
  };

  return (
    <div className="py-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Orders</h2>
            {!loading && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-slate-100 text-slate-600">
                {orders.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Order
            </button>
            <button
              onClick={() => fetchOrders(true)}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* New Order Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-100"
            >
              <form ref={formRef} onSubmit={handleCreate} className="p-5 bg-slate-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <input
                    name="first_name"
                    placeholder="First Name *"
                    required
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    name="last_name"
                    placeholder="Last Name *"
                    required
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    name="date_of_birth"
                    placeholder="Date of Birth (MM/DD/YYYY) *"
                    required
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <textarea
                  name="notes"
                  placeholder="Notes (optional)"
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Create Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="border border-slate-200 text-slate-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        {loading ? (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80">
                {['ID', 'Patient Name', 'Date of Birth', 'Status', 'Source', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody><SkeletonRows /></tbody>
          </table>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <FileSearch className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-900 font-medium mb-1">No orders yet</p>
            <p className="text-slate-500 text-sm">Upload a medical document or create an order manually.</p>
          </div>
        ) : (
          /* Desktop table */
          <div className="overflow-x-auto">
            <table className="w-full hidden md:table">
              <thead>
                <tr className="bg-slate-50/80">
                  {['ID', 'Patient Name', 'Date of Birth', 'Status', 'Source', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {orders.map((o) => (
                    <motion.tr
                      key={o.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, backgroundColor: deletingId === o.id ? '#fff1f2' : newIds.has(o.id) ? '#eff6ff' : 'transparent' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-sm text-slate-400">{o.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{o.first_name} {o.last_name}</td>
                      <td className="px-4 py-3 text-slate-600">{o.date_of_birth}</td>
                      <td className="px-4 py-3">
                        {editingId === o.id ? (
                          <select
                            autoFocus
                            defaultValue={o.status}
                            onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
                            onBlur={() => setEditingId(null)}
                            className="border border-slate-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="complete">Complete</option>
                            <option value="failed">Failed</option>
                          </select>
                        ) : (
                          <StatusBadge status={o.status} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {o.extracted_from_document ? (
                          <span className="flex items-center gap-1.5 text-sm text-slate-500">
                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                            PDF Upload
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Pencil className="w-3.5 h-3.5 text-slate-400" />
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span title={new Date(o.created_at).toISOString()} className="text-slate-500 text-sm">
                          {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {deletingId === o.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDelete(o.id)}
                              className="bg-rose-600 text-white px-2.5 py-1 rounded text-xs font-medium hover:bg-rose-700 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="border border-slate-200 text-slate-500 px-2.5 py-1 rounded text-xs font-medium hover:bg-slate-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingId(o.id)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors rounded"
                              title="Edit status"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingId(o.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3 p-4">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className={`bg-white border rounded-lg p-4 ${deletingId === o.id ? 'bg-rose-50 border-rose-200' : 'border-slate-200'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-slate-900">{o.first_name} {o.last_name}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-slate-400 text-xs">DOB</p>
                      <p className="text-slate-600">{o.date_of_birth}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Source</p>
                      <p className="text-slate-600">{o.extracted_from_document ? 'PDF Upload' : 'Manual'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">
                      {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                    </span>
                    {deletingId === o.id ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleDelete(o.id)} className="bg-rose-600 text-white px-3 py-1.5 rounded text-xs font-medium">
                          Confirm
                        </button>
                        <button onClick={() => setDeletingId(null)} className="border border-slate-200 px-3 py-1.5 rounded text-xs">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => setEditingId(o.id)} className="p-2 text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeletingId(o.id)} className="p-2 text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
