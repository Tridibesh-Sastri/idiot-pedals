import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {initRuntimeSecurity} from './lib/security';

// Initialize client-side runtime security guards (Anti-Clickjacking, immutable ledgers)
initRuntimeSecurity();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
