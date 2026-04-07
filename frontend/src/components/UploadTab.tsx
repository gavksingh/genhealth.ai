import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CloudUpload, FileText, X, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { uploadPDF } from '../api';
import type { UploadResponse } from '../types';

type UploadState = 'idle' | 'selected' | 'extracting' | 'success' | 'error';

export default function UploadTab({ onNavigate }: { onNavigate: (tab: 'upload' | 'orders' | 'logs') => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are accepted');
      return;
    }
    setFile(f);
    setState('selected');
    setResult(null);
    setErrorMsg('');
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const removeFile = () => { setFile(null); setState('idle'); };

  const onSubmit = async () => {
    if (!file) return;
    setState('extracting');
    try {
      const data = await uploadPDF(file);
      setResult(data);
      setState('success');
      toast.success('Patient data extracted successfully');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } }; message?: string })
        .response?.data?.detail || (err as { message?: string }).message || 'Upload failed';
      setErrorMsg(msg);
      setState('error');
      toast.error('Extraction failed');
    }
  };

  const reset = () => { setFile(null); setState('idle'); setResult(null); setErrorMsg(''); };

  const formatSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  const confColor = (c: number) => c >= 0.9 ? '#059669' : c >= 0.7 ? '#d97706' : '#e11d48';
  const confBg = (c: number) => c >= 0.9 ? '#10b981' : c >= 0.7 ? '#f59e0b' : '#f43f5e';

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: '16px', maxWidth: '540px',
    margin: '0 auto', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 220px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
      <div style={{ width: '100%', maxWidth: '540px' }}>
        <AnimatePresence mode="wait">

          {/* IDLE / SELECTED / EXTRACTING */}
          {(state === 'idle' || state === 'selected' || state === 'extracting') && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              style={{
                ...card, padding: '48px 40px',
                border: dragOver ? '2px solid #2563eb' : '2px dashed #cbd5e1',
                background: dragOver ? '#eff6ff' : '#fff',
                cursor: state === 'idle' ? 'pointer' : 'default',
                transition: 'border 200ms, background 200ms',
                ...(state === 'extracting' ? { animation: 'borderPulse 2s ease-in-out infinite', border: '2px solid #93c5fd' } : {}),
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => state === 'idle' && document.getElementById('file-input')?.click()}
            >
              <input id="file-input" type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

              <AnimatePresence mode="wait">
                {state === 'idle' && (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#eff6ff', marginBottom: 20, transition: 'transform 200ms',
                      transform: dragOver ? 'scale(1.1)' : 'scale(1)',
                    }}>
                      <CloudUpload style={{ width: 32, height: 32, color: '#2563eb' }} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
                      Upload Medical Document
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '14px', maxWidth: 380, marginBottom: 24, lineHeight: '1.5' }}>
                      Drag and drop a PDF file, or click to browse. Patient information is extracted automatically using Gemini AI.
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); document.getElementById('file-input')?.click(); }}
                      style={{
                        border: '2px solid #2563eb', color: '#2563eb', background: 'transparent',
                        borderRadius: '8px', padding: '10px 28px', fontSize: '14px', fontWeight: 600,
                        cursor: 'pointer', transition: 'background 150ms',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Choose File
                    </button>
                  </motion.div>
                )}

                {(state === 'selected' || state === 'extracting') && file && (
                  <motion.div key="selected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', marginBottom: 20,
                    }}>
                      <FileText style={{ width: 24, height: 24, color: '#e11d48', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#1e293b', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</p>
                        <p style={{ color: '#94a3b8', fontSize: '13px' }}>{formatSize(file.size)}</p>
                      </div>
                      {state === 'selected' && (
                        <button onClick={removeFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                          <X style={{ width: 18, height: 18 }} />
                        </button>
                      )}
                    </div>
                    <button onClick={onSubmit} disabled={state === 'extracting'}
                      style={{
                        width: '100%', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                        background: state === 'extracting' ? '#93c5fd' : '#2563eb', color: '#fff',
                        border: 'none', cursor: state === 'extracting' ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'background 150ms',
                      }}>
                      {state === 'extracting' ? (
                        <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />Extracting with Gemini AI...</>
                      ) : 'Extract Patient Data →'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* SUCCESS */}
          {state === 'success' && result && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ ...card, padding: '40px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 28 }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={{ width: 56, height: 56, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <CheckCircle2 style={{ width: 28, height: 28, color: '#059669' }} />
                </motion.div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>Data Extracted Successfully</h2>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                {[
                  { label: 'First Name', value: result.extracted_data.first_name },
                  { label: 'Last Name', value: result.extracted_data.last_name },
                  { label: 'Date of Birth', value: result.extracted_data.date_of_birth },
                ].map((f) => (
                  <div key={f.label} style={{ flex: '1 1 140px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '14px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{f.label}</p>
                    <p style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{f.value}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '14px', fontWeight: 500, color: confColor(result.extracted_data.confidence), marginBottom: 8 }}>
                  <Sparkles style={{ width: 16, height: 16 }} />
                  Extraction Confidence: {(result.extracted_data.confidence * 100).toFixed(0)}%
                </div>
                <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${result.extracted_data.confidence * 100}%` }}
                    transition={{ duration: 0.6 }}
                    style={{ height: '100%', borderRadius: 4, background: confBg(result.extracted_data.confidence) }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => onNavigate('orders')}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  View in Orders
                </button>
                <button onClick={reset}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, background: '#fff', color: '#475569', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                  Upload Another
                </button>
              </div>
            </motion.div>
          )}

          {/* ERROR */}
          {state === 'error' && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ ...card, padding: '40px', background: '#fff1f2', border: '1px solid #fecdd3' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <AlertCircle style={{ width: 32, height: 32, color: '#e11d48', marginBottom: 16 }} />
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#be123c', marginBottom: 8 }}>Extraction Failed</h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: 24 }}>{errorMsg}</p>
                <button onClick={reset}
                  style={{ padding: '12px 32px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, background: '#e11d48', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  Try Again
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
