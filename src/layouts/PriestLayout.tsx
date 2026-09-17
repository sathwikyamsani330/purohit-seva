import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { DemoBanner } from '../components/DemoBanner';
import { OfflineBanner } from '../components/OfflineBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuth } from '../context/AuthContext';
import { Flame, Menu, X, Bell, User } from 'lucide-react';
import { NotificationBell } from '../components/NotificationBell';

export const PriestLayout: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const { currentUser, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#701a28] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-stone-600">Verifying Acharya credentials...</span>
        </div>
      </div>
    );
  }

  const currentRole = role || currentUser?.role;
  const isAuthorized = currentUser && (currentRole === 'priest' || currentRole === 'admin');
  if (!isAuthorized) {
    return <Navigate to="/priest/login" state={{ from: location, unauthorized: true, reason: 'Acharya portal access required.' }} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5] text-[#22060a]">
      <OfflineBanner />
      <DemoBanner />

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
          <Sidebar type="priest" />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="bg-[#faf8f5]/95 backdrop-blur-md border-b border-[#eadfd9] px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-9 z-30 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="lg:hidden p-2 rounded-xl text-stone-700 hover:bg-[#f8eee8]"
              >
                {mobileNavOpen ? <X className="w-5 h-5 text-[#701a28]" /> : <Menu className="w-5 h-5 text-[#701a28]" />}
              </button>
              <div className="flex items-center gap-2 lg:hidden">
                <Flame className="w-5 h-5 text-[#701a28]" />
                <span className="font-heading font-bold text-[#22060a] text-sm">Priest Portal</span>
              </div>
              <span className="hidden lg:inline text-xs font-semibold text-stone-600">
                Welcome, <strong className="text-[#701a28]">{currentUser?.name || 'Pandit ji'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell role="priest" />

              <Link
                to="/priest/profile"
                className="flex items-center gap-2 text-xs font-semibold bg-[#fdf2f4] hover:bg-[#fae4e7] text-[#701a28] px-3 py-1.5 rounded-full border border-[#f5ccd2] transition"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Verified Acharya</span>
              </Link>
            </div>
          </header>

          {/* Mobile navigation overlay */}
          {mobileNavOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div className="fixed inset-0 bg-[#200609]/70 backdrop-blur-xs" onClick={() => setMobileNavOpen(false)} />
              <div className="relative w-64 max-w-xs bg-[#200609] z-10 flex flex-col shadow-2xl">
                <Sidebar type="priest" />
              </div>
            </div>
          )}

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <ErrorBoundary fallbackTitle="Acharya Portal view error" fallbackMessage="Could not display this portal view. Your bookings and schedule are preserved.">
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
};
