import { useState, useCallback } from 'react';
import { uploadPDF } from '../api';
import type { UploadResponse } from '../types';

export default function UploadTab() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted');
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const onSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await uploadPDF(file);
      setResult(data);
      setFile(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const confidenceColor = (c: number) =>
    c >= 0.8 ? '#22c55e' : c >= 0.5 ? '#eab308' : '#ef4444';

  return (
    <div>
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="drop-icon">📄</div>
        <p>Drag & drop a PDF here, or click to browse</p>
        {file && <p className="file-name">Selected: {file.name}</p>}
      </div>

      {file && (
        <button className="btn btn-primary" onClick={onSubmit} disabled={loading}>
          {loading ? 'Extracting...' : 'Upload & Extract'}
        </button>
      )}

      {loading && <div className="spinner" />}

      {error && <div className="error-msg">{error}</div>}

      {result && (
        <div className="result-card">
          <h3>Extracted Patient Data</h3>
          <div className="result-grid">
            <div className="result-field">
              <label>First Name</label>
              <span>{result.extracted_data.first_name}</span>
            </div>
            <div className="result-field">
              <label>Last Name</label>
              <span>{result.extracted_data.last_name}</span>
            </div>
            <div className="result-field">
              <label>Date of Birth</label>
              <span>{result.extracted_data.date_of_birth}</span>
            </div>
            <div className="result-field">
              <label>Confidence</label>
              <span
                className="badge"
                style={{ backgroundColor: confidenceColor(result.extracted_data.confidence) }}
              >
                {(result.extracted_data.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <p className="order-id">Order #{result.order.id} created</p>
        </div>
      )}
    </div>
  );
}
