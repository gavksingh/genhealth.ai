import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { Upload, ClipboardList, Activity, Cross, Loader2 } from 'lucide-react';
import { checkHealth } from './api';
import UploadTab from './components/UploadTab';
import OrdersTab from './components/OrdersTab';
import LogsTab from './components/LogsTab';

type Tab = 'upload' | 'orders' | 'logs';

const tabs: { key: Tab; label: string; icon: typeof Upload }[] = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'orders', label: 'Orders', icon: ClipboardList },
  { key: 'logs', label: 'Logs', icon: Activity },
];

function App() {
  const [tab, setTab] = useState<Tab>('upload');
  const [healthStatus, setHealthStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const hasAnimated = useRef(false);
  const shouldAnimate = !hasAnimated.current;

  useEffect(() => {
    hasAnimated.current = true;
    checkHealth().then((ok) => setHealthStatus(ok ? 'ok' : 'error'));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#fff', color: '#0f172a', fontSize: '14px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
          success: { style: { borderLeft: '3px solid #10b981' } },
          error: { style: { borderLeft: '3px solid #f43f5e' } },
        }}
      />

      {/* TOP NAV */}
      <motion.header
        initial={shouldAnimate ? { y: -64, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          height: '64px', background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{
          maxWidth: '1024px', margin: '0 auto', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cross style={{ width: 20, height: 20, color: '#2563eb', transform: 'rotate(45deg)' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', lineHeight: 1.1 }}>
                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '16px' }}>GenHealth</span>
                <span style={{ fontWeight: 600, color: '#2563eb', fontSize: '16px' }}>AI</span>
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500, marginTop: '1px' }}>
                by Gaurav Singh
              </div>
            </div>
          </div>

          {/* Desktop Tabs */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="desktop-tabs">
            {tabs.map((t) => {
              const isActive = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    position: 'relative',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px',
                    fontSize: '14px', fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#2563eb' : '#64748b',
                    background: 'none', border: 'none', cursor: 'pointer',
                    transition: 'color 150ms',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#334155'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#64748b'; }}
                >
                  <t.icon style={{ width: 16, height: 16 }} />
                  {t.label}
                  {isActive && (
                    <motion.div
                      layoutId="tab-underline"
                      style={{
                        position: 'absolute', bottom: -1, left: 8, right: 8,
                        height: '2px', background: '#2563eb', borderRadius: '1px',
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Health Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {healthStatus === 'loading' && <Loader2 style={{ width: 16, height: 16, color: '#94a3b8', animation: 'spin 1s linear infinite' }} />}
            {healthStatus === 'ok' && (
              <>
                <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
                  <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#34d399', opacity: 0.75, animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
                  <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                </span>
                <span style={{ fontSize: '13px', color: '#059669', fontWeight: 500 }}>Live</span>
              </>
            )}
            {healthStatus === 'error' && (
              <>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }} />
                <span style={{ fontSize: '13px', color: '#f43f5e', fontWeight: 500 }}>Offline</span>
              </>
            )}
          </div>
        </div>
      </motion.header>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-tabs" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: '#ffffff',
        borderTop: '1px solid #d1d5db',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.08)',
        display: 'none', /* shown via CSS media query */
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          width: '100%', height: '60px',
        }}>
          {tabs.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '2px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  padding: '8px 0',
                }}
              >
                <t.icon style={{ width: 20, height: 20, color: isActive ? '#2563eb' : '#9ca3af' }} />
                <span style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563eb' : '#9ca3af',
                  lineHeight: '1.2',
                }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <motion.main
        initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
        style={{ paddingTop: '80px', paddingBottom: '80px' }}
      >
        <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '0 16px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {tab === 'upload' && <UploadTab onNavigate={setTab} />}
              {tab === 'orders' && <OrdersTab />}
              {tab === 'logs' && <LogsTab />}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer style={{ textAlign: 'center', padding: '32px 0', fontSize: '13px', color: '#94a3b8' }}>
          Built by Gaurav Singh for GenHealth AI
        </footer>
      </motion.main>

      {/* Responsive CSS */}
      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .desktop-tabs { display: none !important; }
          .mobile-tabs { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-tabs { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default App;
