import React, { useState } from 'react';
import { Outlet, Link, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { DemoBanner } from '../components/DemoBanner';
import { OfflineBanner } from '../components/OfflineBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Menu, X } from 'lucide-react';
import { NotificationBell } from '../components/NotificationBell';

export const AdminLayout: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { currentUser, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#701a28] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-stone-600">Verifying administrator credentials...</span>
        </div>
      </div>
    );
  }

  const currentRole = role || currentUser?.role;
  if (!currentUser || currentRole !== 'admin') {
    return <Navigate to="/admin/login" state={{ from: location, unauthorized: true, reason: 'Super Admin privileges required.' }} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5] text-[#22060a]">
      <OfflineBanner />
      <DemoBanner />

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
          <Sidebar type="admin" />
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
                <ShieldCheck className="w-5 h-5 text-[#701a28]" />
                <span className="font-heading font-bold text-[#22060a] text-sm">Admin Console</span>
              </div>
              <span className="hidden lg:inline text-xs font-semibold text-stone-600">
                Purohit Seva Platform Master Operations • <span className="text-emerald-700 font-bold">Live System</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell role="admin" />

              <div className="flex items-center gap-2 text-xs font-semibold text-[#701a28] bg-[#fdf2f4] px-3 py-1.5 rounded-full border border-[#f5ccd2]">
                <ShieldCheck className="w-4 h-4 text-[#701a28]" />
                <span>Super Admin</span>
              </div>
            </div>
          </header>

          {/* Mobile navigation overlay */}
          {mobileNavOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div className="fixed inset-0 bg-[#200609]/70 backdrop-blur-xs" onClick={() => setMobileNavOpen(false)} />
              <div className="relative w-64 max-w-xs bg-[#200609] z-10 flex flex-col shadow-2xl">
                <Sidebar type="admin" />
              </div>
            </div>
          )}

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <ErrorBoundary fallbackTitle="Admin Console view error" fallbackMessage="Could not display this administration view. System records and audit logs are secure.">
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
};
