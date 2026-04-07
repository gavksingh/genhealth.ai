export type OrderStatus = 'pending' | 'processing' | 'complete' | 'failed';

export interface Order {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  document_filename: string | null;
  status: OrderStatus;
  notes: string | null;
  extracted_from_document: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface ExtractedPatientData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  confidence: number;
}

export interface UploadResponse {
  order: Order;
  extracted_data: ExtractedPatientData;
}

export interface ActivityLog {
  id: number;
  method: string;
  path: string;
  client_ip: string | null;
  user_agent: string | null;
  request_body: string | null;
  status_code: number | null;
  duration_ms: number | null;
  timestamp: string;
}
