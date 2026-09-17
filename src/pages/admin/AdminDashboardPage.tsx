import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { priestService } from '../../services/priestService';
import { bookingService } from '../../services/bookingService';
import { authService } from '../../services/authService';
import { Priest, Booking, Customer } from '../../types';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { formatCurrency, formatDate, getStatusBadgeStyle } from '../../utils';
import { normalizeBookingStatus, getStatusDisplayMeta } from '../../utils/bookingStatus';
import { useToast } from '../../context/ToastContext';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  Flame,
  Award,
  Layers
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { success, error } = useToast();
  const [priests, setPriests] = useState<Priest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPriests, allBookings, allCustomers] = await Promise.all([
        priestService.getPriests(),
        bookingService.getAllBookings(),
        authService.getAllCustomers()
      ]);
      setPriests(allPriests);
      setBookings(allBookings);
      setCustomers(allCustomers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerifyPriest = async (priestId: string, status: boolean) => {
    try {
      await priestService.toggleVerification(priestId, status);
      success(status ? 'Priest verified and credentials approved!' : 'Verification removed.');
      loadData();
    } catch {
      error('Failed to update verification status.');
    }
  };

  if (loading) {
    return <LoadingState message="Aggregating platform intelligence..." fullHeight />;
  }

  const unverifiedPriests = priests.filter((p) => !p.isVerified);
  const totalGrossRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const platformRevenue = totalGrossRevenue * 0.05;

  return (
    <div className="space-y-8">
      {/* 1. TOP BANNER */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-stone-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-1">
            Operations Command Center
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold">
            Platform Master Overview
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-1">
            Real-time analytics across <strong className="text-amber-300">10 Verified Priests</strong> and <strong className="text-amber-300">10 Devotee Households</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/priests">
            <Button variant="gold" size="sm" leftIcon={<ShieldCheck className="w-4 h-4" />}>
              Verify Priests
            </Button>
          </Link>
          <Link to="/admin/events">
            <Button variant="outline" size="sm" className="text-white border-stone-700 hover:bg-stone-800" leftIcon={<Layers className="w-4 h-4" />}>
              Catalog Manager
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500">Active Priests</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-stone-900">{priests.length}</p>
          <span className="text-[11px] text-emerald-600 font-medium block mt-1">
            {priests.filter(p => p.isVerified).length} Verified Acharyas
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500">Registered Devotees</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-stone-900">{customers.length}</p>
          <span className="text-[11px] text-stone-500 font-medium block mt-1">Across 7 Indian Metros</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500">Total Bookings</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-stone-900">{bookings.length}</p>
          <span className="text-[11px] text-stone-500 font-medium block mt-1">
            {bookings.filter(b => b.status === 'confirmed').length} Scheduled / Live
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500">Total GMV Transacted</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-stone-900">{formatCurrency(totalGrossRevenue)}</p>
          <span className="text-[11px] text-emerald-700 font-bold block mt-1">
            Platform Fee: {formatCurrency(platformRevenue)}
          </span>
        </div>
      </div>

      {/* Platform Protection & Anti-Bypass Desk */}
      <div className="bg-[#fdf2f4] rounded-3xl border border-[#f5ccd2] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white text-[#701a28] flex items-center justify-center border border-[#f5ccd2] shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-stone-900">
              Purohit Seva Protection & Anti-Bypass Console
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">
              Zero unauthorized off-platform bookings. Triage confidential incident reports and maintain Verified Priest Trust Tiers.
            </p>
          </div>
        </div>
        <Link to="/admin/protection">
          <Button variant="primary" size="sm" className="bg-[#701a28] hover:bg-[#59131e]" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Open Protection Desk
          </Button>
        </Link>
      </div>

      {/* 3. PRIEST APPROVAL QUEUE (IF ANY UNVERIFIED) */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span>Acharya Credentials & Verification Center</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Review Veda Pathashala qualifications and approve priests for instant booking
            </p>
          </div>

          <Link to="/admin/priests">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              All Priests
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {priests.slice(0, 4).map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl border border-stone-200 flex items-start justify-between gap-3 bg-stone-50/50"
            >
              <div className="flex items-start gap-3">
                <Avatar src={p.avatarUrl} name={p.name} size="lg" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-stone-900 text-sm">{p.name}</h4>
                    {p.isVerified && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />}
                  </div>
                  <p className="text-xs text-amber-800 font-medium">{p.title}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">{p.city} • {p.tradition} • {p.experienceYears}+ yrs</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleVerifyPriest(p.id, !p.isVerified)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  p.isVerified
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700 shadow-xs'
                }`}
              >
                {p.isVerified ? 'Verified' : 'Approve'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. RECENT PLATFORM BOOKINGS TABLE */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-stone-900">
              Live Platform Bookings Flow
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Chronological log of customer ceremonies across India
            </p>
          </div>

          <Link to="/admin/bookings">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Full Booking Registry
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 uppercase font-semibold">
                <th className="pb-3">ID</th>
                <th className="pb-3">Ceremony</th>
                <th className="pb-3">Client</th>
                <th className="pb-3">Officiating Priest</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {bookings.slice(0, 6).map((b) => {
                const s = normalizeBookingStatus(b.bookingStatus || b.status);
                const meta = getStatusDisplayMeta(s);
                return (
                  <tr key={b.id} className="text-stone-700 hover:bg-stone-50/60 transition">
                    <td className="py-3 font-mono font-bold text-stone-900">{b.id}</td>
                    <td className="py-3 font-semibold text-amber-900">{b.eventName}</td>
                    <td className="py-3 font-medium text-stone-900">{b.customerName}</td>
                    <td className="py-3">{b.priestName}</td>
                    <td className="py-3">{formatDate(b.date)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.badgeBg} ${meta.badgeBorder} ${meta.badgeText}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 text-right font-extrabold text-stone-900">
                      {formatCurrency(b.totalAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
