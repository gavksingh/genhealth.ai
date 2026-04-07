import { useState } from 'react';
import UploadTab from './components/UploadTab';
import OrdersTab from './components/OrdersTab';
import LogsTab from './components/LogsTab';
import './App.css';

type Tab = 'upload' | 'orders' | 'logs';

function App() {
  const [tab, setTab] = useState<Tab>('upload');

  return (
    <div className="app">
      <header>
        <h1>GenHealth AI</h1>
        <p className="subtitle">Medical Document Processing</p>
      </header>
      <nav className="tabs">
        <button className={tab === 'upload' ? 'active' : ''} onClick={() => setTab('upload')}>
          Upload
        </button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>
          Orders
        </button>
        <button className={tab === 'logs' ? 'active' : ''} onClick={() => setTab('logs')}>
          Logs
        </button>
      </nav>
      <main>
        {tab === 'upload' && <UploadTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'logs' && <LogsTab />}
      </main>
    </div>
  );
}

export default App;
