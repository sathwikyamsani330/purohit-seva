import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { BottomNavigation } from '../components/BottomNavigation';
import { OfflineBanner } from '../components/OfflineBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5] text-[#22060a] selection:bg-[#701a28] selection:text-white">
      <OfflineBanner />
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <ErrorBoundary fallbackTitle="Page could not be loaded" fallbackMessage="An issue occurred while rendering this view. Your session and bookings remain secure.">
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <BottomNavigation />
    </div>
  );
};
