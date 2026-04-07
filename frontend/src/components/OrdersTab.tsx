import { useState, useEffect } from 'react';
import { getOrders, updateOrder, deleteOrder } from '../api';
import type { Order, OrderStatus } from '../types';

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#6b7280',
  processing: '#3b82f6',
  complete: '#22c55e',
  failed: '#ef4444',
};

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      setOrders(await getOrders());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleStatusChange = async (id: number, status: OrderStatus) => {
    await updateOrder(id, { status });
    fetchOrders();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this order?')) return;
    await deleteOrder(id);
    fetchOrders();
  };

  if (loading) return <div className="spinner" />;

  if (orders.length === 0) return <p className="empty">No orders yet. Upload a PDF to create one.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Patient Name</th>
            <th>Date of Birth</th>
            <th>Status</th>
            <th>Document</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.first_name} {o.last_name}</td>
              <td>{o.date_of_birth}</td>
              <td>
                <select
                  value={o.status}
                  onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
                  className="status-select"
                  style={{ borderColor: STATUS_COLORS[o.status] }}
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="complete">Complete</option>
                  <option value="failed">Failed</option>
                </select>
              </td>
              <td>{o.document_filename || '—'}</td>
              <td>{new Date(o.created_at).toLocaleString()}</td>
              <td>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(o.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
