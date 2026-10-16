import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './AppShell';
import { createAppServices } from './composition';
import './styles/app.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('画面を表示する要素（#root）が見つかりません');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppShell services={createAppServices()} />
  </StrictMode>,
);
