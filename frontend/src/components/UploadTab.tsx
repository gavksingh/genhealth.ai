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

  const removeFile = () => {
    setFile(null);
    setState('idle');
  };

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

  const reset = () => {
    setFile(null);
    setState('idle');
    setResult(null);
    setErrorMsg('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const confidenceColor = (c: number) =>
    c >= 0.9 ? 'text-emerald-600' : c >= 0.7 ? 'text-amber-600' : 'text-rose-600';
  const confidenceBg = (c: number) =>
    c >= 0.9 ? 'bg-emerald-500' : c >= 0.7 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-8">
      <div className="w-full max-w-[560px]">
        <AnimatePresence mode="wait">
          {/* IDLE / SELECTED STATE */}
          {(state === 'idle' || state === 'selected' || state === 'extracting') && (
            <motion.div
              key="upload-card"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className={`bg-white rounded-2xl p-12 md:p-12 border shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-200 ${
                dragOver
                  ? 'border-2 border-solid border-blue-600 bg-blue-50/50'
                  : state === 'extracting'
                  ? 'border border-blue-200'
                  : 'border border-dashed border-slate-300'
              }`}
              style={state === 'extracting' ? { animation: 'borderPulse 2s ease-in-out infinite' } : {}}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => state === 'idle' && document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              <AnimatePresence mode="wait">
                {(state === 'idle') && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center cursor-pointer"
                  >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 transition-transform duration-200 ${
                      dragOver ? 'bg-blue-100 scale-110' : 'bg-blue-50'
                    }`}>
                      <CloudUpload className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-900 mb-2">Upload Medical Document</h2>
                    <p className="text-slate-500 text-sm max-w-[380px] mb-6">
                      Drag and drop a PDF file, or click to browse. Patient information is extracted automatically using Gemini AI.
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById('file-input')?.click();
                      }}
                      className="border border-blue-600 text-blue-600 rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-blue-50 transition-colors"
                    >
                      Choose File
                    </button>
                  </motion.div>
                )}

                {(state === 'selected' || state === 'extracting') && file && (
                  <motion.div
                    key="selected"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-5">
                      <FileText className="w-6 h-6 text-rose-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 font-medium truncate">{file.name}</p>
                        <p className="text-slate-500 text-sm">{formatFileSize(file.size)}</p>
                      </div>
                      {state === 'selected' && (
                        <button onClick={removeFile} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={onSubmit}
                      disabled={state === 'extracting'}
                      className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {state === 'extracting' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Extracting with Gemini AI...
                        </>
                      ) : (
                        'Extract Patient Data →'
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* SUCCESS STATE */}
          {state === 'success' && result && (
            <motion.div
              key="success-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-10 border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            >
              <div className="flex flex-col items-center text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4"
                >
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </motion.div>
                <h2 className="text-xl font-semibold text-slate-900">Data Extracted Successfully</h2>
              </div>

              {/* Data cards */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                {[
                  { label: 'First Name', value: result.extracted_data.first_name },
                  { label: 'Last Name', value: result.extracted_data.last_name },
                  { label: 'Date of Birth', value: result.extracted_data.date_of_birth },
                ].map((f) => (
                  <div key={f.label} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-4">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{f.label}</p>
                    <p className="text-lg font-semibold text-slate-900">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Confidence */}
              <div className="mb-6">
                <div className={`flex items-center gap-1.5 text-sm font-medium mb-2 ${confidenceColor(result.extracted_data.confidence)}`}>
                  <Sparkles className="w-4 h-4" />
                  Extraction Confidence: {(result.extracted_data.confidence * 100).toFixed(0)}%
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.extracted_data.confidence * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`h-full rounded-full ${confidenceBg(result.extracted_data.confidence)}`}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => onNavigate('orders')}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  View in Orders
                </button>
                <button
                  onClick={reset}
                  className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Upload Another
                </button>
              </div>
            </motion.div>
          )}

          {/* ERROR STATE */}
          {state === 'error' && (
            <motion.div
              key="error-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-rose-50 rounded-2xl p-10 border border-rose-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            >
              <div className="flex flex-col items-center text-center">
                <AlertCircle className="w-8 h-8 text-rose-500 mb-4" />
                <h2 className="text-xl font-semibold text-rose-700 mb-2">Extraction Failed</h2>
                <p className="text-sm text-slate-600 mb-6">{errorMsg}</p>
                <button
                  onClick={reset}
                  className="bg-rose-600 text-white rounded-lg px-6 py-2.5 text-sm font-semibold hover:bg-rose-700 transition-colors"
                >
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
