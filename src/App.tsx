import React from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useLocation 
} from 'react-router-dom';
import { Toaster } from 'sonner';
import { TopNav, Sidebar } from './components/Navigation';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import VaultPage from './pages/Vault';
import AgentConfigPage from './pages/AgentConfig';
import AnalyticsPage from './pages/Analytics';
import DecisionLogPage from './pages/DecisionLog';
import ArchitecturePage from './pages/Architecture';
import HowItWorksPage from './pages/HowItWorks';
import DocsPage from './pages/Docs';
import SettingsPage from './pages/Settings';
import { DemoProvider } from './components/DemoProvider';
import { useStore } from './store';
import { cn } from './lib/utils';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const { isDemoMode, setDemoMode } = useStore();

  return (
    <DemoProvider>
      <div className="min-h-screen flex flex-col bg-bg-base">
        <TopNav />
        
        {isDemoMode && (
          <div className="h-9 bg-bg-elevated border-b border-border-subtle flex items-center justify-center gap-4 px-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-warning" />
              <span className="text-[11px] text-text-secondary font-medium">Demo Mode Active · Viewing simulated live data</span>
            </div>
            <button 
              onClick={() => setDemoMode(false)}
              className="text-[11px] text-accent hover:underline font-semibold"
            >
              Exit Demo
            </button>
          </div>
        )}

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
    </DemoProvider>
  );
};

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/agent-config" element={<AgentConfigPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/decisions" element={<DecisionLogPage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
