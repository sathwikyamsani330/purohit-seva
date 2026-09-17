import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { bookingService } from '../../services/bookingService';
import { Booking } from '../../types';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { formatCurrency, formatDate } from '../../utils';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  ArrowDownToLine,
  ShieldCheck
} from 'lucide-react';

export const PriestEarningsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { success } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Bank Info State
  const [bankInfo, setBankInfo] = useState({
    accountName: 'Pandit Raghavendra Sharma',
    accountNumber: '••••••••8901',
    ifsc: 'HDFC0001234',
    upiId: 'raghavendra.sharma@okhdfcbank'
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const priestId = currentUser?.id || 'priest-1';
        const data = await bookingService.getPriestBookings(priestId);
        setBookings(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  if (loading) {
    return <LoadingState message="Calculating earnings and settlement records..." fullHeight />;
  }

  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const totalGross = completedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const platformFee = totalGross * 0.05; // 5%
  const netEarnings = totalGross - platformFee;
  const pendingPayout = 8500;

  const handleRequestPayout = () => {
    success('Payout request of ₹8,500 submitted to accounts team!');
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-stone-900">
            Earnings & Dakshina Settlements
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Transparent breakdown of puja dakshina, payouts, and bank settlement history
          </p>
        </div>

        <Button
          variant="gold"
          size="sm"
          onClick={handleRequestPayout}
          leftIcon={<ArrowDownToLine className="w-4 h-4" />}
        >
          Withdraw Available Balance
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Net Earnings</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-stone-900">{formatCurrency(netEarnings || 38250)}</p>
          <span className="text-xs text-emerald-700 font-medium block mt-1">Across {completedBookings.length || 4} completed rituals</span>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Available for Payout</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-900">{formatCurrency(pendingPayout)}</p>
          <span className="text-xs text-amber-700 font-medium block mt-1">Settles every Monday & Thursday</span>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Platform Seva Fee</span>
            <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-stone-900">5.0%</p>
          <span className="text-xs text-stone-400 font-medium block mt-1">Lowest in India Vedic sector</span>
        </div>
      </div>

      {/* Main Grid: Transactions & Bank Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-heading text-lg font-bold text-stone-900">
            Recent Puja Settlements
          </h3>

          {completedBookings.length === 0 ? (
            <p className="text-xs text-stone-500 py-6 text-center">No completed bookings recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase font-semibold">
                    <th className="pb-3">Booking ID</th>
                    <th className="pb-3">Event</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Client</th>
                    <th className="pb-3 text-right">Net Dakshina</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {completedBookings.map((b) => (
                    <tr key={b.id} className="text-stone-700">
                      <td className="py-3 font-mono font-bold text-stone-900">{b.id}</td>
                      <td className="py-3 font-semibold text-amber-900">{b.eventName}</td>
                      <td className="py-3">{formatDate(b.date)}</td>
                      <td className="py-3">{b.customerName}</td>
                      <td className="py-3 text-right font-extrabold text-emerald-700">
                        {formatCurrency(b.totalAmount * 0.95)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bank & UPI Account Settings */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h3 className="font-heading text-lg font-bold text-stone-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            Verified Bank Account
          </h3>

          <div className="bg-stone-50 rounded-2xl p-4 text-xs space-y-2 text-stone-700 border border-stone-200">
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Account Holder</span>
              <span className="font-bold text-stone-900">{bankInfo.accountName}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Bank Account Number</span>
              <span className="font-mono text-stone-900">{bankInfo.accountNumber}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">IFSC Code</span>
              <span className="font-mono text-stone-900">{bankInfo.ifsc}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Direct UPI ID</span>
              <span className="font-mono text-amber-900 font-semibold">{bankInfo.upiId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Bank KYC Verified for instant NEFT/IMPS transfers</span>
          </div>
        </div>
      </div>
    </div>
  );
};
