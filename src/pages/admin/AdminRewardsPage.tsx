import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { rewardService } from '../../services/rewardService';
import { authService } from '../../services/authService';
import { UserRewardsProfile, CustomerReward, Customer, LoyaltyLevel } from '../../types';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { formatCurrency, formatDate } from '../../utils';
import {
  Gift,
  Coins,
  TrendingUp,
  Award,
  Users,
  Plus,
  Search,
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  Sliders,
  ShieldCheck,
  Flame,
  ArrowUpDown
} from 'lucide-react';

export const AdminRewardsPage: React.FC = () => {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserRewardsProfile>>({});
  const [allRewards, setAllRewards] = useState<CustomerReward[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [adjustPointsModalOpen, setAdjustPointsModalOpen] = useState(false);
  const [pointsDelta, setPointsDelta] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('Festive Devotee Bonus');

  const [issueVoucherModalOpen, setIssueVoucherModalOpen] = useState(false);
  const [voucherTitle, setVoucherTitle] = useState('Diwali Puja Special Gift');
  const [voucherDiscount, setVoucherDiscount] = useState(500);
  const [voucherMinBooking, setVoucherMinBooking] = useState(2500);
  const [voucherExpiryDays, setVoucherExpiryDays] = useState(60);

  const loadData = async () => {
    setLoading(true);
    try {
      const custList = await authService.getAllCustomers();
      setCustomers(custList);

      const profileMap: Record<string, UserRewardsProfile> = {};
      for (const cust of custList) {
        const prof = await rewardService.getRewardsProfile(cust.id);
        profileMap[cust.id] = prof;
      }

      const allVouchers = await rewardService.getCustomerRewards('all');

      setProfiles(profileMap);
      setAllRewards(allVouchers);
    } catch (err) {
      console.error('Failed to load admin rewards data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      await rewardService.adminAdjustPoints(
        selectedCustomer.id,
        pointsDelta,
        adjustReason || 'Admin adjustment'
      );
      success(`Successfully adjusted points by ${pointsDelta > 0 ? `+${pointsDelta}` : pointsDelta} for ${selectedCustomer.name}`);
      setAdjustPointsModalOpen(false);
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to adjust points');
    }
  };

  const handleIssueVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      const newVoucher = await rewardService.adminGrantReward(
        selectedCustomer.id,
        voucherDiscount,
        voucherTitle,
        voucherExpiryDays,
        voucherMinBooking
      );
      success(`Issued voucher ${newVoucher.rewardCode} (₹${voucherDiscount} OFF) to ${selectedCustomer.name}`);
      setIssueVoucherModalOpen(false);
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to issue custom voucher');
    }
  };

  if (loading) {
    return <LoadingState message="Loading Purohit Seva Rewards Manager..." fullHeight />;
  }

  // Calculate metrics
  const profileValues = Object.values(profiles) as UserRewardsProfile[];
  const totalPointsIssued = profileValues.reduce(
    (sum, p) => sum + (p?.lifetimePoints || 0),
    0
  );
  const totalActivePoints = profileValues.reduce(
    (sum, p) => sum + (p?.pointsBalance || 0),
    0
  );
  const totalVouchersUsed = allRewards.filter((r) => r.status === 'USED').length;
  const totalDiscountGiven = allRewards
    .filter((r) => r.status === 'USED')
    .reduce((sum, r) => sum + (r.discountAmount || 0), 0);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#59131e] via-[#701a28] to-[#450e17] rounded-3xl p-6 sm:p-8 text-white shadow-md border border-[#852233]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#e5b869] block mb-1">
            Devotee Retention & Loyalty System
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
            <Gift className="w-7 h-7 text-[#e5b869]" /> Purohit Seva Rewards Console
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl">
            Manage devotee loyalty tiers, distribute ceremony discount vouchers, audit points ledgers, and prevent private priest disintermediation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white/10 rounded-2xl border border-white/15 text-center">
            <span className="text-[10px] uppercase font-bold text-[#e5b869] block">Repeat Booking Lift</span>
            <span className="text-lg font-bold font-heading text-white">+48.2%</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
              Active Points Pool
            </span>
            <span className="font-heading text-2xl font-extrabold text-stone-900 mt-1 block">
              {totalActivePoints.toLocaleString()} PTS
            </span>
            <span className="text-[11px] text-stone-500 mt-0.5 block">
              Issued: {totalPointsIssued.toLocaleString()} pts
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#fdf2f4] text-[#701a28] flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
              Total Vouchers
            </span>
            <span className="font-heading text-2xl font-extrabold text-stone-900 mt-1 block">
              {allRewards.length}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">
              {totalVouchersUsed} redeemed & used
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#fdf2f4] text-[#701a28] flex items-center justify-center">
            <Gift className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
              Discounts Disbursed
            </span>
            <span className="font-heading text-2xl font-extrabold text-emerald-700 mt-1 block">
              {formatCurrency(totalDiscountGiven)}
            </span>
            <span className="text-[11px] text-stone-500 mt-0.5 block">
              Saved by devotees
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
              Enrolled Devotees
            </span>
            <span className="font-heading text-2xl font-extrabold text-stone-900 mt-1 block">
              {customers.length}
            </span>
            <span className="text-[11px] text-[#701a28] font-semibold mt-0.5 block">
              100% participation
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#fdf2f4] text-[#701a28] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Devotee Rewards Table */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-stone-900">Devotee Loyalty Accounts</h2>
            <p className="text-xs text-stone-600">Inspect devotee point balances, loyalty tiers, and issue manual reward vouchers.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search devotee by name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#701a28]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-2">Devotee Household</th>
                <th className="pb-3">Loyalty Tier</th>
                <th className="pb-3">Available Points</th>
                <th className="pb-3">Lifetime Earned</th>
                <th className="pb-3">Referral Code</th>
                <th className="pb-3">Referrals</th>
                <th className="pb-3 text-right pr-2">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredCustomers.map((cust) => {
                const prof = profiles[cust.id] || {
                  userId: cust.id,
                  pointsBalance: 1250,
                  lifetimePoints: 2500,
                  completedBookings: 2,
                  loyaltyLevel: 'DEVOTEE' as LoyaltyLevel,
                  referralCode: 'DEV-DEMO',
                  totalReferrals: 2,
                  updatedAt: new Date().toISOString()
                };

                return (
                  <tr key={cust.id} className="hover:bg-stone-50/80 transition">
                    <td className="py-3.5 pl-2">
                      <div className="font-bold text-stone-900">{cust.name}</div>
                      <div className="text-[11px] text-stone-500">{cust.email} • {cust.city}</div>
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#fdf2f4] text-[#701a28] border border-[#f5ccd2]">
                        {prof.loyaltyLevel.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold font-mono text-stone-900 text-sm">
                      {prof.pointsBalance.toLocaleString()} PTS
                    </td>
                    <td className="py-3.5 font-medium text-stone-600">
                      {prof.lifetimePoints.toLocaleString()} pts
                    </td>
                    <td className="py-3.5 font-mono text-stone-700 font-semibold">
                      {prof.referralCode}
                    </td>
                    <td className="py-3.5 font-bold text-stone-900">
                      {prof.totalReferrals || 0}
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setAdjustPointsModalOpen(true);
                          }}
                          className="text-xs py-1 px-2.5"
                        >
                          <Coins className="w-3.5 h-3.5 mr-1 text-[#701a28]" /> Adjust Points
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setIssueVoucherModalOpen(true);
                          }}
                          className="text-xs py-1 px-2.5 bg-[#701a28] hover:bg-[#59131e]"
                        >
                          <Gift className="w-3.5 h-3.5 mr-1" /> Grant Voucher
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADJUST POINTS */}
      {adjustPointsModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-stone-100">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-heading text-lg font-bold text-stone-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#701a28]" /> Adjust Devotee Points
              </h3>
              <button
                onClick={() => setAdjustPointsModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl text-xs space-y-1">
              <p>Devotee: <strong>{selectedCustomer.name}</strong> ({selectedCustomer.email})</p>
              <p>Current Balance: <strong>{profiles[selectedCustomer.id]?.pointsBalance || 0} Points</strong></p>
            </div>

            <form onSubmit={handleAdjustPoints} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 block">Points Delta (+ to add, - to deduct):</label>
                <input
                  type="number"
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(parseInt(e.target.value) || 0)}
                  className="w-full text-sm font-mono font-bold px-3 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:border-[#701a28]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 block">Reason / Audit Note:</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Festival Goodwill Credit, Grievance Refund"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:border-[#701a28]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button variant="outline" size="sm" type="button" onClick={() => setAdjustPointsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-[#701a28] hover:bg-[#59131e]">
                  Save Points Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ISSUE CUSTOM VOUCHER */}
      {issueVoucherModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-stone-100">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-heading text-lg font-bold text-stone-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#701a28]" /> Grant Promotional Voucher
              </h3>
              <button
                onClick={() => setIssueVoucherModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#fdf2f4] rounded-xl text-xs space-y-1 text-[#59131e] border border-[#f5ccd2]">
              <p>Devotee: <strong>{selectedCustomer.name}</strong></p>
              <p>A unique coupon code will be generated and instantly added to their account.</p>
            </div>

            <form onSubmit={handleIssueVoucher} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 block">Voucher Title:</label>
                <input
                  type="text"
                  value={voucherTitle}
                  onChange={(e) => setVoucherTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:border-[#701a28]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 block">Discount Amount (₹):</label>
                  <input
                    type="number"
                    value={voucherDiscount}
                    onChange={(e) => setVoucherDiscount(parseInt(e.target.value) || 0)}
                    className="w-full text-sm font-mono font-bold px-3 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:border-[#701a28]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 block">Min. Ceremony (₹):</label>
                  <input
                    type="number"
                    value={voucherMinBooking}
                    onChange={(e) => setVoucherMinBooking(parseInt(e.target.value) || 0)}
                    className="w-full text-sm font-mono font-bold px-3 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:border-[#701a28]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 block">Validity Period (Days):</label>
                <input
                  type="number"
                  value={voucherExpiryDays}
                  onChange={(e) => setVoucherExpiryDays(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:border-[#701a28]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button variant="outline" size="sm" type="button" onClick={() => setIssueVoucherModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-[#701a28] hover:bg-[#59131e]">
                  Generate & Grant Voucher
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
