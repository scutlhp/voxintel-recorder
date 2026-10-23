import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import VConsole from 'vconsole';

// Mobile in-app console debugger
if (typeof window !== 'undefined') {
  try {
    new VConsole();
  } catch {}
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
