import React, { Suspense, lazy } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useLocation 
} from 'react-router-dom';
import { Toaster } from 'sonner';
import { TopNav, Sidebar } from './components/Navigation';
import { cn } from './lib/utils';
import { useLanguage } from './i18n';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const VaultPage = lazy(() => import('./pages/Vault'));
const AutopilotPage = lazy(() => import('./pages/Autopilot'));
const AgentConfigPage = lazy(() => import('./pages/AgentConfig'));
const AnalyticsPage = lazy(() => import('./pages/Analytics'));
const DecisionLogPage = lazy(() => import('./pages/DecisionLog'));
const ArchitecturePage = lazy(() => import('./pages/Architecture'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorks'));
const DocsPage = lazy(() => import('./pages/Docs'));
const SettingsPage = lazy(() => import('./pages/Settings'));

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
        <TopNav />

        <div className={cn("flex flex-1", !isLanding ? "pt-16" : "")}>
          {!isLanding && <Sidebar />}
          <main className={cn("flex-1", isLanding ? "w-full" : "")}>
            {children}
          </main>
        </div>
        
        <Toaster 
          theme="dark" 
          position="top-right"
          toastOptions={{
            style: {
              background: '#141418',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#FAFAFA',
            }
          }}
        />
    </div>
  );
};

export default function App() {
  const { tr } = useLanguage();
  return (
    <Router>
      <Layout>
        <Suspense fallback={<div className="p-8 text-sm text-text-muted">{tr('Loading Solvex…', 'Загрузка Solvex…')}</div>}>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/autopilot" element={<AutopilotPage />} />
          <Route path="/agent-config" element={<AgentConfigPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/decisions" element={<DecisionLogPage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}
