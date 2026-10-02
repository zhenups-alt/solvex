import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { WalletContextProvider } from './components/WalletContextProvider.tsx';
import { LanguageProvider } from './i18n.tsx';
import { Buffer } from 'buffer';

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <WalletContextProvider>
        <App />
      </WalletContextProvider>
    </LanguageProvider>
  </StrictMode>,
);
