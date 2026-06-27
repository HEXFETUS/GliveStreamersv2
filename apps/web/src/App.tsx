import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPageV2';
import StreamPage from './pages/StreamPage';

export default function App() {
  const { isInitialized, restoreSession } = useAuthStore();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isLandingPage = location.pathname === '/';
  const isDashboardPage = location.pathname === '/dashboard';

  useEffect(() => {
    if (!isInitialized) {
      restoreSession();
    }
  }, [isInitialized, restoreSession]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {!isAuthPage && !isLandingPage && !isDashboardPage && <Navbar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/stream/:streamId" element={<StreamPage />} />
      </Routes>
    </div>
  );
}
