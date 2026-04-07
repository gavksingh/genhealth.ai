import axios from 'axios';
import type { Order, UploadResponse, ActivityLog, OrderStatus } from './types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

export async function uploadPDF(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<UploadResponse>('/api/v1/orders/upload', formData);
  return data;
}

export async function getOrders(): Promise<Order[]> {
  const { data } = await api.get<Order[]>('/api/v1/orders/');
  return data;
}

export async function createOrder(order: {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  notes?: string;
  status?: OrderStatus;
}): Promise<Order> {
  const { data } = await api.post<Order>('/api/v1/orders/', order);
  return data;
}

export async function updateOrder(id: number, update: { status?: OrderStatus }): Promise<Order> {
  const { data } = await api.put<Order>(`/api/v1/orders/${id}`, update);
  return data;
}

export async function deleteOrder(id: number): Promise<void> {
  await api.delete(`/api/v1/orders/${id}`);
}

export async function getLogs(skip = 0, limit = 10): Promise<{ logs: ActivityLog[]; total: number; skip: number; limit: number }> {
  const { data } = await api.get('/api/v1/logs/', { params: { skip, limit } });
  return data;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const { data } = await api.get('/health');
    return data.status === 'ok';
  } catch {
    return false;
  }
}
