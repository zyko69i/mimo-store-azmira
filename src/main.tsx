import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initStore } from './lib/store';

initStore();
createRoot(document.getElementById('root')!).render(<App />);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
