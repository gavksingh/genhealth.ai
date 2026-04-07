import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { Upload, ClipboardList, Activity, Cross, Loader2 } from 'lucide-react';
import { checkHealth } from './api';
import UploadTab from './components/UploadTab';
import OrdersTab from './components/OrdersTab';
import LogsTab from './components/LogsTab';
import './App.css';

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
  const [showEntrance, setShowEntrance] = useState(!hasAnimated.current);

  useEffect(() => {
    checkHealth().then((ok) => setHealthStatus(ok ? 'ok' : 'error'));
  }, []);

  useEffect(() => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      setTimeout(() => setShowEntrance(false), 600);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#0f172a',
            fontSize: '14px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
          success: {
            style: { borderLeft: '3px solid #10b981' },
          },
          error: {
            style: { borderLeft: '3px solid #f43f5e' },
          },
        }}
      />

      {/* Navigation */}
      <motion.nav
        initial={showEntrance ? { y: -64, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
      >
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-0.5">
            <Cross className="w-5 h-5 text-blue-600 rotate-45" />
            <span className="font-semibold text-slate-900">GenHealth</span>
            <span className="font-semibold text-blue-600">AI</span>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex items-center gap-1 relative">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                  tab === t.key ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                {tab === t.key && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-600 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Health indicator */}
          <div className="flex items-center gap-1.5">
            {healthStatus === 'loading' && (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            )}
            {healthStatus === 'ok' && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-sm text-emerald-600 font-medium hidden sm:inline">Live</span>
              </>
            )}
            {healthStatus === 'error' && (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-sm text-rose-500 font-medium hidden sm:inline">Offline</span>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Mobile Bottom Tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-14 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-full">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                tab === t.key ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <t.icon className="w-5 h-5" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <motion.main
        initial={showEntrance ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
        className="pt-16 pb-20 md:pb-8"
      >
        <div className="max-w-5xl mx-auto px-4">
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

        {/* Footer */}
        <footer className="text-center py-8 text-sm text-slate-400">
          Built by Gaurav Singh for GenHealth AI
        </footer>
      </motion.main>
    </div>
  );
}

export default App;
