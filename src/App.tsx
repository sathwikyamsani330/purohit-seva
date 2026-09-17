import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { BookingProvider } from './context/BookingContext';

// Layouts
import { MainLayout } from './layouts/MainLayout';
import { PriestLayout } from './layouts/PriestLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Customer Pages
import { LandingPage } from './pages/customer/LandingPage';
import { HomePage } from './pages/customer/HomePage';
import { EventsPage } from './pages/customer/EventsPage';
import { PriestSearchPage } from './pages/customer/PriestSearchPage';
import { PriestProfilePage } from './pages/customer/PriestProfilePage';
import { BookingPage } from './pages/customer/BookingPage';
import { BookingSummaryPage } from './pages/customer/BookingSummaryPage';
import { PaymentPage } from './pages/customer/PaymentPage';
import { BookingConfirmationPage } from './pages/customer/BookingConfirmationPage';
import { RequestSentPage } from './pages/customer/RequestSentPage';
import { RequestsPage } from './pages/customer/RequestsPage';
import { MyBookingsPage } from './pages/customer/MyBookingsPage';
import { BookingDetailPage } from './pages/customer/BookingDetailPage';
import { NotificationsPage } from './pages/customer/NotificationsPage';
import { CustomerProfilePage } from './pages/customer/CustomerProfilePage';
import { RewardsPage } from './pages/customer/RewardsPage';
import { CeremonyPlannerPage } from './pages/customer/CeremonyPlannerPage';
import { LoginPage } from './pages/customer/LoginPage';
import { RegisterPage } from './pages/customer/RegisterPage';

// Priest Pages
import { PriestLoginPage } from './pages/priest/PriestLoginPage';
import { PriestRegisterPage } from './pages/priest/PriestRegisterPage';
import { PriestDashboardPage } from './pages/priest/PriestDashboardPage';
import { PriestBookingsPage } from './pages/priest/PriestBookingsPage';
import { PriestServicesPage } from './pages/priest/PriestServicesPage';
import { PriestAvailabilityPage } from './pages/priest/PriestAvailabilityPage';
import { PriestEarningsPage } from './pages/priest/PriestEarningsPage';
import { PriestProfileEditPage } from './pages/priest/PriestProfileEditPage';
import { PriestNotificationsPage } from './pages/priest/PriestNotificationsPage';

// Admin Pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminPriestsPage } from './pages/admin/AdminPriestsPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { AdminEventsPage } from './pages/admin/AdminEventsPage';
import { AdminRewardsPage } from './pages/admin/AdminRewardsPage';
import { AdminProtectionReportsPage } from './pages/admin/AdminProtectionReportsPage';
import { AdminNotificationsPage } from './pages/admin/AdminNotificationsPage';

// Scroll to top helper
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export default function App() {
  return (
    <AuthProvider>
      <BookingProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              {/* Customer Routes (Wrapped in MainLayout) */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:id" element={<EventsPage />} />
                <Route path="/priests" element={<PriestSearchPage />} />
                <Route path="/priests/:id" element={<PriestProfilePage />} />
                
                {/* Request & Booking Flow Routes */}
                <Route path="/book" element={<BookingPage />} />
                <Route path="/book/:priestId" element={<BookingPage />} />
                <Route path="/booking/:priestId" element={<BookingPage />} />
                <Route path="/priests/:priestId/book" element={<BookingPage />} />
                <Route path="/booking-summary" element={<BookingSummaryPage />} />
                <Route path="/request-summary" element={<BookingSummaryPage />} />
                <Route path="/payment/:requestId" element={<PaymentPage />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/request-sent/:requestId" element={<RequestSentPage />} />
                <Route path="/request-sent" element={<RequestSentPage />} />
                <Route path="/booking-confirmation/:id" element={<BookingConfirmationPage />} />
                <Route path="/booking-confirmation" element={<BookingConfirmationPage />} />
                <Route path="/booking/confirmation/:id" element={<BookingConfirmationPage />} />
                
                {/* AI Ceremony Planner */}
                <Route path="/ceremony-planner" element={<CeremonyPlannerPage />} />
                <Route path="/planner" element={<CeremonyPlannerPage />} />
                <Route path="/ai-planner" element={<CeremonyPlannerPage />} />
                
                {/* Auth Entry Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Customer Authenticated Protected Routes */}
                <Route element={<ProtectedRoute allowedRoles={['customer', 'admin']} redirectTo="/login" />}>
                  <Route path="/requests" element={<RequestsPage />} />
                  <Route path="/my-bookings" element={<MyBookingsPage />} />
                  <Route path="/bookings" element={<MyBookingsPage />} />
                  <Route path="/bookings/:id" element={<BookingDetailPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/rewards" element={<RewardsPage />} />
                  <Route path="/loyalty" element={<RewardsPage />} />
                  <Route path="/profile" element={<CustomerProfilePage />} />
                </Route>
              </Route>

              {/* Standalone Auth Pages for Priest & Admin */}
              <Route path="/priest/login" element={<PriestLoginPage />} />
              <Route path="/priest/register" element={<PriestRegisterPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* Priest Portal Routes (Wrapped in ProtectedRoute and PriestLayout) */}
              <Route
                path="/priest"
                element={
                  <ProtectedRoute allowedRoles={['priest', 'admin']} redirectTo="/priest/login">
                    <PriestLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/priest/dashboard" replace />} />
                <Route path="dashboard" element={<PriestDashboardPage />} />
                <Route path="bookings" element={<PriestBookingsPage />} />
                <Route path="notifications" element={<PriestNotificationsPage />} />
                <Route path="services" element={<PriestServicesPage />} />
                <Route path="availability" element={<PriestAvailabilityPage />} />
                <Route path="earnings" element={<PriestEarningsPage />} />
                <Route path="profile" element={<PriestProfileEditPage />} />
              </Route>

              {/* Admin Console Routes (Wrapped in ProtectedRoute and AdminLayout) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="notifications" element={<AdminNotificationsPage />} />
                <Route path="priests" element={<AdminPriestsPage />} />
                <Route path="customers" element={<AdminCustomersPage />} />
                <Route path="bookings" element={<AdminBookingsPage />} />
                <Route path="protection" element={<AdminProtectionReportsPage />} />
                <Route path="events" element={<AdminEventsPage />} />
                <Route path="rewards" element={<AdminRewardsPage />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </BookingProvider>
    </AuthProvider>
  );
}
