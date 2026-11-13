import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { repo } from './repo';
import './styles.css';

repo.seed();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support. Only works when served from a real web address (not inside a preview frame).
if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window.self) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
