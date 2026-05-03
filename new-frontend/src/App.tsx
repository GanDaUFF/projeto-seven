import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PublicCliente from './pages/PublicCliente';
import Setup from './pages/Setup';
import Settings from './pages/Settings';
import { api } from './services/api';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return localStorage.getItem('token') ? <>{children}</> : <Navigate to="/login" replace />;
}

type SetupState = 'loading' | 'needs-setup' | 'ready';

function SetupGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SetupState>('loading');
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    api.getSetupStatus()
      .then(res => { if (alive) setState(res.needsSetup ? 'needs-setup' : 'ready'); })
      .catch(() => { if (alive) setState('ready'); });
    return () => { alive = false; };
  }, []);

  if (state === 'loading') {
    return (
      <div className="bg-[#0d0d12] min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state === 'needs-setup' && location.pathname !== '/setup' && !location.pathname.startsWith('/cliente/')) {
    return <Navigate to="/setup" replace />;
  }

  if (state === 'ready' && location.pathname === '/setup') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <SetupGate>
        <Routes>
          <Route path="/setup"           element={<Setup />} />
          <Route path="/login"           element={<Login />} />
          <Route path="/cliente/:token"  element={<PublicCliente />} />
          <Route path="/configuracoes"   element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/"                element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="*"                element={<Navigate to="/" replace />} />
        </Routes>
      </SetupGate>
    </BrowserRouter>
  );
}
