import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  rewardService,
  LOYALTY_LEVELS,
  MILESTONE_BENEFITS,
  INITIAL_REWARD_TIERS
} from '../../services/rewardService';
import {
  UserRewardsProfile,
  CustomerReward,
  RewardTransaction,
  RewardTier,
  LoyaltyLevel
} from '../../types';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { formatCurrency, formatDate } from '../../utils';
import {
  Gift,
  Coins,
  TrendingUp,
  Award,
  Sparkles,
  Share2,
  Copy,
  Check,
  Tag,
  Clock,
  ArrowRight,
  Shield,
  CheckCircle2,
  Users,
  Flame,
  Crown,
  Info,
  X,
  MessageCircle,
  Mail,
  ExternalLink
} from 'lucide-react';

export const RewardsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserRewardsProfile | null>(null);
  const [rewards, setRewards] = useState<CustomerReward[]>([]);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [tiers, setTiers] = useState<RewardTier[]>(INITIAL_REWARD_TIERS);

  const [activeTab, setActiveTab] = useState<'vouchers' | 'redeem' | 'history' | 'tiers' | 'referral'>('vouchers');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);

  // Modals for the banner actions
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const [newlyRedeemed, setNewlyRedeemed] = useState<CustomerReward | null>(null);

  const userId = currentUser?.id || '';

  const loadData = async () => {
    setLoading(true);
    try {
      const [userProf, userRewards, userTxns, config] = await Promise.all([
        rewardService.getRewardsProfile(userId),
        rewardService.getCustomerRewards(userId),
        rewardService.getRewardTransactions(userId),
        rewardService.getRewardsConfig()
      ]);

      setProfile(userProf);
      setRewards(userRewards);
      setTransactions(userTxns);
      if (config && config.tiers) {
        setTiers(config.tiers);
      }
    } catch (err) {
      console.error('Failed to load rewards data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleCopy = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    success(label || 'Code copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleOpenRedeem = () => {
    setShowRedeemModal(true);
    setActiveTab('redeem');
  };

  const handleOpenRefer = () => {
    setShowReferModal(true);
    setActiveTab('referral');
  };

  const handleShareWhatsApp = (code: string) => {
    const appUrl = window.location.origin;
    const text = `Namaste! Use my Purohit Seva sacred referral code *${code}* to get ₹250 OFF on your first Vedic ceremony booking:\n${appUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async (code: string) => {
    const appUrl = window.location.origin;
    const text = `Namaste! Use my Purohit Seva sacred referral code *${code}* to get ₹250 OFF on your first Vedic ceremony booking:\n${appUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Purohit Seva - ₹250 Ceremony Discount',
          text,
          url: appUrl
        });
        success('Shared successfully!');
      } catch (e) {
        // User cancelled share
      }
    } else {
      handleCopy(code, 'Referral code copied! Share with your friends & family.');
    }
  };

  const handleRedeemVoucher = async (tierId: string, title: string) => {
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier) return;

    if (!profile || profile.pointsBalance < tier.pointsRequired) {
      error(`You need ${tier.pointsRequired} points to redeem this voucher. You currently have ${profile?.pointsBalance || 0} points.`);
      return;
    }

    setIsRedeeming(tierId);
    try {
      const newReward = await rewardService.redeemReward(userId, tierId);
      setNewlyRedeemed(newReward);
      success(`Successfully unlocked ₹${newReward.discountAmount} OFF! Voucher Code: ${newReward.rewardCode}`);
      await loadData();
      setActiveTab('vouchers');
    } catch (err: any) {
      error(err.message || 'Redemption failed. Please try again.');
    } finally {
      setIsRedeeming(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading Purohit Seva Rewards..." fullHeight />;
  }

  const currentLevel = (profile?.loyaltyLevel || 'DEVOTEE') as LoyaltyLevel;
  const levelInfo = LOYALTY_LEVELS[currentLevel] || LOYALTY_LEVELS.DEVOTEE;
  const points = profile?.pointsBalance || 0;
  const lifetime = profile?.lifetimePoints || 0;
  const completedCount = profile?.completedBookings || 0;

  // Calculate next level progress
  let nextLevelKey: LoyaltyLevel | null = null;
  let nextLevelMinPoints = 1000;

  if (currentLevel === 'DEVOTEE') {
    nextLevelKey = 'SEVA_MEMBER';
    nextLevelMinPoints = 1000;
  } else if (currentLevel === 'SEVA_MEMBER') {
    nextLevelKey = 'SEVA_PLUS';
    nextLevelMinPoints = 2500;
  } else if (currentLevel === 'SEVA_PLUS') {
    nextLevelKey = 'PUROHIT_SEVA_ELITE';
    nextLevelMinPoints = 5000;
  } else {
    nextLevelKey = null;
    nextLevelMinPoints = 5000;
  }

  const pointsToNext = nextLevelKey ? Math.max(0, nextLevelMinPoints - lifetime) : 0;
  const tierProgress = nextLevelKey
    ? Math.min(100, Math.round((lifetime / nextLevelMinPoints) * 100))
    : 100;

  const activeVouchers = rewards.filter((r) => r.status === 'AVAILABLE');
  const pastVouchers = rewards.filter((r) => r.status === 'USED' || r.status === 'EXPIRED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#59131e] via-[#701a28] to-[#450e17] text-white p-6 sm:p-10 shadow-xl border border-[#852233]/40">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 bg-[#e5b869]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-20 w-64 h-64 bg-[#701a28]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-[#e5b869]/40 backdrop-blur-md text-[#e5b869] text-xs font-bold uppercase tracking-wider">
              <span>{levelInfo.icon}</span>
              <span>Purohit Seva Rewards Club</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Sacred Devotee Loyalty & Rewards
            </h1>
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              Earn <strong className="text-[#e5b869]">1 Purohit Point per ₹10</strong> spent on all completed Vedic ceremonies. Redeem for exclusive Dakshina vouchers, priority priest matching, and festive blessings.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenRedeem}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#e5b869] to-[#d4a04e] hover:from-[#d4a04e] hover:to-[#c38c37] text-[#450e17] shadow-md shadow-black/20 active:scale-95 transition-all cursor-pointer"
              >
                <Gift className="w-4 h-4 mr-2 text-[#450e17]" /> Redeem Points
              </button>
              <button
                type="button"
                onClick={handleOpenRefer}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white border border-white/25 backdrop-blur-md active:scale-95 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 mr-2 text-[#e5b869]" /> Refer Devotees & Earn ₹250
              </button>
            </div>
          </div>

          {/* User Score Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-3xl p-6 sm:p-7 min-w-[280px] sm:min-w-[320px] text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#e5b869]">
                Available Balance
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#e5b869] text-[#450e17] shadow-xs flex items-center gap-1">
                <span>{levelInfo.icon}</span>
                <span>{levelInfo.name}</span>
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-heading text-white">
                {points.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-[#e5b869]">Purohit Points</span>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex justify-between text-xs text-stone-300">
                <span>
                  Next Tier:{' '}
                  <strong className="text-white">
                    {nextLevelKey ? LOYALTY_LEVELS[nextLevelKey].name : 'Max Level'}
                  </strong>
                </span>
                <span>{nextLevelKey ? `${pointsToNext} pts away` : 'Top Tier'}</span>
              </div>
              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-[#e5b869] to-[#c38c37] rounded-full transition-all duration-500"
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-stone-400 pt-0.5">
                <span>Completed Ceremonies: <strong>{completedCount}</strong></span>
                <span>Lifetime: <strong>{lifetime.toLocaleString()} pts</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Value Proposition Bar */}
      <div className="bg-[#fdf2f4] border border-[#f5ccd2] rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-white text-[#701a28] border border-[#f5ccd2] flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-stone-900">10% Value on Every Puja</h4>
            <p className="text-stone-600 mt-0.5">Earn 1 Purohit Point per ₹10 spent on any completed ceremony.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-white text-[#701a28] border border-[#f5ccd2] flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-stone-900">Verified Acharyas</h4>
            <p className="text-stone-600 mt-0.5">Vedic-certified priests with transparent Dakshina & punctuality.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Instant Checkout Discount</h4>
            <p className="text-slate-600 mt-0.5">Apply your unlocked vouchers on booking payment for direct savings.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Muhurtham Guarantee</h4>
            <p className="text-slate-600 mt-0.5">Priority priest allocation during high-demand festival seasons.</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-stone-200 overflow-x-auto no-scrollbar gap-2">
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'vouchers'
              ? 'border-[#701a28] text-[#701a28]'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <Gift className="w-4 h-4" /> My Vouchers ({activeVouchers.length})
        </button>

        <button
          onClick={() => setActiveTab('redeem')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'redeem'
              ? 'border-[#701a28] text-[#701a28]'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <Coins className="w-4 h-4" /> Redeem Catalog
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'history'
              ? 'border-[#701a28] text-[#701a28]'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <Clock className="w-4 h-4" /> Points Ledger ({transactions.length})
        </button>

        <button
          onClick={() => setActiveTab('tiers')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'tiers'
              ? 'border-[#701a28] text-[#701a28]'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <Award className="w-4 h-4" /> Tier Privileges
        </button>

        <button
          onClick={() => setActiveTab('referral')}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'referral'
              ? 'border-[#701a28] text-[#701a28]'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <Share2 className="w-4 h-4" /> Refer Devotees
        </button>
      </div>

      {/* TAB 1: MY VOUCHERS */}
      {activeTab === 'vouchers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-bold text-stone-900">Your Active Reward Vouchers</h2>
              <p className="text-xs text-stone-600">Copy code and apply on payment checkout when confirming a priest booking.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setActiveTab('redeem')}>
              <Gift className="w-4 h-4 mr-1.5" /> Redeem New Voucher
            </Button>
          </div>

          {activeVouchers.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-stone-300 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#fdf2f4] text-[#701a28] flex items-center justify-center mx-auto">
                <Gift className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold text-stone-900">No Active Vouchers</h3>
                <p className="text-xs text-stone-600 max-w-md mx-auto">
                  You don't have any unused reward vouchers right now. Convert your Purohit Points into ceremony discounts!
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setActiveTab('redeem')}>
                Explore Redemption Catalog
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeVouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className="bg-white rounded-2xl border-2 border-[#f5ccd2] p-5 shadow-xs hover:shadow-md transition relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    Ready to Apply
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-[#fdf2f4] text-[#701a28]">
                        <Tag className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm">{voucher.title}</h3>
                        <p className="text-[11px] text-stone-500">Save {formatCurrency(voucher.discountAmount)} on your next ceremony</p>
                      </div>
                    </div>

                    <div className="bg-[#faf8f5] border border-[#eadfd9] rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 font-bold uppercase block">Coupon Code</span>
                        <span className="font-mono font-bold text-sm text-stone-900 tracking-wider">
                          {voucher.rewardCode}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(voucher.rewardCode, 'Voucher code copied!')}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#eadfd9] text-stone-700 hover:text-[#701a28] text-xs font-semibold flex items-center gap-1 shadow-xs transition cursor-pointer"
                      >
                        {copiedCode === voucher.rewardCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-1 text-[11px] text-stone-600">
                      {voucher.minBookingAmount && (
                        <p>• Min. ceremony value: <strong>{formatCurrency(voucher.minBookingAmount)}</strong></p>
                      )}
                      <p>• Valid till: <strong>{formatDate(voucher.expiresAt)}</strong></p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
                    <Link to="/priests" className="text-xs font-bold text-[#701a28] hover:text-[#59131e] flex items-center gap-1">
                      Book a Priest <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <span className="text-[10px] text-stone-400">Created {formatDate(voucher.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Past Vouchers */}
          {pastVouchers.length > 0 && (
            <div className="pt-8 border-t border-stone-200 space-y-4">
              <h3 className="font-heading text-base font-bold text-stone-700">Past & Redeemed Vouchers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
                {pastVouchers.map((voucher) => (
                  <div
                    key={voucher.id}
                    className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-800">{voucher.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-700 uppercase">
                        {voucher.status}
                      </span>
                    </div>
                    <p className="font-mono text-stone-500 text-[11px]">{voucher.rewardCode}</p>
                    <p className="text-stone-400 text-[10px]">
                      {voucher.usedAt ? `Used on ${formatDate(voucher.usedAt)}` : `Expired on ${formatDate(voucher.expiresAt)}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REDEEM CATALOG */}
      {activeTab === 'redeem' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-bold text-stone-900">Redeem Points for Puja Discounts</h2>
              <p className="text-xs text-stone-600">
                You have <strong className="text-[#701a28]">{points} points</strong> available to convert into vouchers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => {
              const canAfford = points >= tier.pointsRequired;
              const isCurrentRedeeming = isRedeeming === tier.id;

              return (
                <div
                  key={tier.id}
                  className={`bg-white rounded-2xl border-2 p-5 flex flex-col justify-between transition shadow-xs ${
                    canAfford ? 'border-[#f5ccd2] hover:border-[#701a28] hover:shadow-md' : 'border-stone-200 opacity-80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#fdf2f4] text-[#701a28]">
                        {tier.discountAmount >= 3000 ? 'Royal' : tier.discountAmount >= 1500 ? 'Best Value' : 'Popular'}
                      </span>
                      <span className="font-heading text-base font-extrabold text-[#701a28]">
                        {tier.pointsRequired} PTS
                      </span>
                    </div>

                    <h3 className="font-heading text-lg font-bold text-stone-900">{tier.title}</h3>
                    <p className="text-xs text-stone-600 leading-relaxed">{tier.description}</p>

                    <div className="p-3 bg-[#faf8f5] rounded-xl space-y-1 text-xs text-stone-700">
                      <div className="flex justify-between">
                        <span className="text-stone-500">Discount Value:</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(tier.discountAmount)}</span>
                      </div>
                      {tier.minBookingAmount && (
                        <div className="flex justify-between">
                          <span className="text-stone-500">Min. Ceremony:</span>
                          <span className="font-medium text-stone-900">{formatCurrency(tier.minBookingAmount)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-stone-100">
                    <Button
                      variant={canAfford ? 'primary' : 'outline'}
                      size="sm"
                      fullWidth
                      disabled={!canAfford || isCurrentRedeeming}
                      onClick={() => handleRedeemVoucher(tier.id, tier.title)}
                      className={canAfford ? 'bg-[#701a28] hover:bg-[#59131e]' : ''}
                    >
                      {isCurrentRedeeming
                        ? 'Unlocking...'
                        : canAfford
                        ? `Redeem for ${tier.pointsRequired} Pts`
                        : `Need ${tier.pointsRequired - points} More Pts`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: POINTS LEDGER */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900">Points Activity Ledger</h2>
            <p className="text-xs text-slate-600">Audit trail of all points earned from rituals and redeemed for benefits.</p>
          </div>

          {transactions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <Clock className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-800 text-base">No Points History Yet</h3>
              <p className="text-xs text-slate-500">Book and complete your first ceremony to start earning points!</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const isPositive = tx.points > 0;
                  return (
                    <div key={tx.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-[#fdf2f4] text-[#701a28]'
                          }`}
                        >
                          {isPositive ? <TrendingUp className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 text-sm">{tx.description}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                            <span>{formatDate(tx.createdAt)}</span>
                            {tx.bookingId && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-stone-600">Booking: {tx.bookingId}</span>
                              </>
                            )}
                            <span>•</span>
                            <span className="capitalize">{tx.type.toLowerCase().replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-heading text-base font-extrabold ${
                            isPositive ? 'text-emerald-600' : 'text-[#701a28]'
                          }`}
                        >
                          {isPositive ? `+${tx.points}` : tx.points} PTS
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TIER PRIVILEGES */}
      {activeTab === 'tiers' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900">Loyalty Tier Privileges</h2>
            <p className="text-xs text-slate-600">The more sacred rituals you conduct on Purohit Seva, the higher your status and exclusive blessings.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(Object.keys(LOYALTY_LEVELS) as LoyaltyLevel[]).map((levelKey) => {
              const tierInfo = LOYALTY_LEVELS[levelKey];
              const isCurrent = currentLevel === levelKey;

              return (
                <div
                  key={levelKey}
                  className={`bg-white rounded-2xl border-2 p-6 flex flex-col justify-between relative shadow-xs transition ${
                    isCurrent
                      ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                      : 'border-slate-200'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider shadow-xs">
                      Your Active Tier
                    </span>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-2xl flex items-center justify-center">
                        {tierInfo.icon}
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {tierInfo.minPoints.toLocaleString()}+ pts
                      </span>
                    </div>

                    <div>
                      <h3 className="font-heading text-xl font-bold text-slate-900">{tierInfo.name}</h3>
                      <p className="text-xs text-slate-600 mt-1">{tierInfo.tagline}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Included Privileges:
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {tierInfo.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 mt-6 border-t border-slate-100">
                    <p className="text-[11px] text-slate-500 text-center font-medium">
                      {isCurrent
                        ? 'Active tier benefits unlocked'
                        : lifetime < tierInfo.minPoints
                        ? `${tierInfo.minPoints - lifetime} lifetime pts needed`
                        : 'Unlocked'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Milestones Card */}
          <div className="bg-gradient-to-r from-[#fdf2f4] to-[#faf8f5] border border-[#f5ccd2] rounded-2xl p-6 space-y-4">
            <h3 className="font-heading text-lg font-bold text-[#59131e] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#701a28]" /> Ceremony Milestone Rewards
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-white/80 rounded-xl p-4 border border-[#eadfd9] space-y-2">
                <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                  <span>{MILESTONE_BENEFITS.threeBookings.icon}</span>
                  <span>{MILESTONE_BENEFITS.threeBookings.title}</span>
                </div>
                <ul className="space-y-1 text-stone-600">
                  {MILESTONE_BENEFITS.threeBookings.items.map((it, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> {it}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/80 rounded-xl p-4 border border-[#eadfd9] space-y-2">
                <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                  <span>{MILESTONE_BENEFITS.fiveBookings.icon}</span>
                  <span>{MILESTONE_BENEFITS.fiveBookings.title}</span>
                </div>
                <ul className="space-y-1 text-stone-600">
                  {MILESTONE_BENEFITS.fiveBookings.items.map((it, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> {it}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REFER DEVOTEES */}
      {activeTab === 'referral' && (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-stone-200 p-6 sm:p-10 shadow-xs space-y-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#fdf2f4] text-[#701a28] flex items-center justify-center mx-auto shadow-inner">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-stone-900">
              Share Sacred Blessings with Family & Friends
            </h2>
            <p className="text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
              Gift your friends and relatives <strong className="text-[#701a28]">₹250 OFF</strong> their first ceremony booking. You will receive <strong className="text-[#701a28]">250 Purohit Points (250 pts)</strong> once their ceremony is successfully completed!
            </p>
          </div>

          <div className="bg-[#fdf2f4] border border-[#f5ccd2] rounded-2xl p-5 space-y-4">
            <span className="text-xs uppercase font-bold text-[#59131e] block tracking-wider">
              Your Personal Referral Code:
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full bg-white border border-[#eadfd9] rounded-xl px-4 py-3 font-mono font-bold text-lg text-stone-900 text-center sm:text-left shadow-xs">
                {profile?.referralCode || 'PUROHIT-DEVOTEE-99'}
              </div>
              <Button
                variant="primary"
                onClick={() => handleCopy(profile?.referralCode || 'PUROHIT-DEVOTEE-99', 'Referral code copied!')}
                className="w-full sm:w-auto shrink-0 bg-[#701a28] hover:bg-[#59131e]"
              >
                {copiedCode === (profile?.referralCode || 'PUROHIT-DEVOTEE-99') ? (
                  <>
                    <Check className="w-4 h-4 mr-2" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" /> Copy Code
                  </>
                )}
              </Button>
            </div>

            {/* Direct Share on WhatsApp and More */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleShareWhatsApp(profile?.referralCode || 'PUROHIT-DEVOTEE-99')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs active:scale-95"
              >
                <MessageCircle className="w-4 h-4" /> Share on WhatsApp
              </button>
              <button
                type="button"
                onClick={() => handleNativeShare(profile?.referralCode || 'PUROHIT-DEVOTEE-99')}
                className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs active:scale-95"
              >
                <Share2 className="w-4 h-4" /> Share with Friends
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-stone-50 rounded-2xl space-y-1">
              <span className="text-2xl font-bold text-stone-900 font-heading">
                {profile?.totalReferrals || 0}
              </span>
              <p className="text-xs text-stone-600">Friends Referred</p>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl space-y-1">
              <span className="text-2xl font-bold text-emerald-600 font-heading">
                {formatCurrency((profile?.totalReferrals || 0) * 250)}
              </span>
              <p className="text-xs text-stone-600">Earned in Credits</p>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl space-y-1">
              <span className="text-2xl font-bold text-[#701a28] font-heading">
                250 PTS
              </span>
              <p className="text-xs text-stone-600">Reward Per Completed Puja</p>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-6 space-y-3">
            <h4 className="text-xs font-bold uppercase text-stone-400 tracking-wider">How It Works:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-stone-700">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#fdf2f4] text-[#701a28] font-bold flex items-center justify-center shrink-0">1</span>
                <span>Share your referral code via WhatsApp, SMS or Email with your family circle.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#fdf2f4] text-[#701a28] font-bold flex items-center justify-center shrink-0">2</span>
                <span>They apply the code at payment to get instant ₹250 off their ceremony.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#fdf2f4] text-[#701a28] font-bold flex items-center justify-center shrink-0">3</span>
                <span>Once the ceremony is completed, 250 Purohit Points automatically credit to your wallet.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK REDEEM MODAL */}
      {showRedeemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 space-y-6 relative">
            <button
              type="button"
              onClick={() => {
                setShowRedeemModal(false);
                setNewlyRedeemed(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-slate-900">
                  Redeem Purohit Points
                </h3>
                <p className="text-xs text-slate-500">
                  Convert your points into instant Dakshina discounts on your bookings.
                </p>
              </div>
            </div>

            {/* Current Balance Pill */}
            <div className="bg-gradient-to-r from-[#fdf2f4] to-[#faf8f5] border border-[#f5ccd2] rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#59131e] uppercase tracking-wider block">
                  Your Available Balance
                </span>
                <span className="font-heading text-2xl sm:text-3xl font-extrabold text-[#701a28]">
                  {points.toLocaleString()}{' '}
                  <span className="text-sm font-semibold text-[#852233]">PTS</span>
                </span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#e5b869] text-[#450e17] flex items-center gap-1 shadow-xs">
                <span>{levelInfo.icon}</span>
                <span>{levelInfo.name}</span>
              </span>
            </div>

            {/* Newly Redeemed Success Notice */}
            {newlyRedeemed && (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Voucher Redeemed Successfully!</span>
                </div>
                <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Your Coupon Code
                    </span>
                    <span className="font-mono font-bold text-base text-slate-900">
                      {newlyRedeemed.rewardCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(newlyRedeemed.rewardCode, 'Voucher code copied!')
                    }
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedCode === newlyRedeemed.rewardCode ? (
                      <>
                        <Check className="w-4 h-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy Code
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-emerald-700">
                  Use this code during booking payment for an instant{' '}
                  <strong>{formatCurrency(newlyRedeemed.discountAmount)} discount</strong>.
                </p>
              </div>
            )}

            {/* Voucher Tier Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Choose a Voucher Tier:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tiers.map((tier) => {
                  const canRedeem = points >= tier.pointsRequired;
                  const isCurrentRedeeming = isRedeeming === tier.id;

                  return (
                    <div
                      key={tier.id}
                      className={`rounded-2xl border p-4 flex flex-col justify-between space-y-3 transition ${
                        canRedeem
                          ? 'border-[#f5ccd2] bg-white hover:border-[#701a28] shadow-xs'
                          : 'border-stone-200 bg-stone-50/70 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#fdf2f4] text-[#701a28] inline-block mb-1">
                            {tier.pointsRequired} Points
                          </span>
                          <h5 className="font-bold text-stone-900 text-sm">{tier.title}</h5>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {tier.description || `Save ${formatCurrency(tier.discountAmount)} on ceremonies`}
                          </p>
                        </div>
                        <span className="text-base font-extrabold text-[#701a28]">
                          {formatCurrency(tier.discountAmount)}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={!canRedeem || isCurrentRedeeming}
                        onClick={() => handleRedeemVoucher(tier.id, tier.title)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          canRedeem
                            ? 'bg-[#701a28] hover:bg-[#59131e] text-white shadow-xs active:scale-95'
                            : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        }`}
                      >
                        {isCurrentRedeeming ? (
                          'Redeeming...'
                        ) : canRedeem ? (
                          <>
                            <Gift className="w-3.5 h-3.5" /> Redeem Now
                          </>
                        ) : (
                          `Need ${tier.pointsRequired - points} more pts`
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowRedeemModal(false);
                  setNewlyRedeemed(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REFER DEVOTEES MODAL */}
      {showReferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 space-y-6 relative">
            <button
              type="button"
              onClick={() => setShowReferModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#fdf2f4] text-[#701a28] flex items-center justify-center font-bold">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-slate-900">
                  Refer Devotees & Earn ₹250
                </h3>
                <p className="text-xs text-slate-500">
                  Share divine blessings with relatives, neighbors & friends.
                </p>
              </div>
            </div>

            {/* Benefit Highlights */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-[#fdf2f4] border border-[#f5ccd2]">
                <span className="text-[11px] font-bold text-[#59131e] block uppercase">
                  Your Friends Get
                </span>
                <span className="font-heading text-xl font-extrabold text-[#701a28]">
                  ₹250 OFF
                </span>
                <span className="text-[10px] text-[#852233] block">On First Booking</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#faf8f5] border border-[#eadfd9]">
                <span className="text-[11px] font-bold text-[#59131e] block uppercase">
                  You Receive
                </span>
                <span className="font-heading text-xl font-extrabold text-[#701a28]">
                  250 PTS
                </span>
                <span className="text-[10px] text-stone-600 block">Per Completed Ceremony</span>
              </div>
            </div>

            {/* Referral Code Box */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Your Sacred Referral Code
              </span>
              <div className="flex items-center gap-2">
                <div className="w-full bg-white border border-[#f5ccd2] rounded-xl px-4 py-2.5 font-mono font-extrabold text-lg text-stone-900 tracking-wider text-center">
                  {profile?.referralCode || 'PUROHIT-DEVOTEE-99'}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      profile?.referralCode || 'PUROHIT-DEVOTEE-99',
                      'Referral code copied!'
                    )
                  }
                  className="px-4 py-2.5 rounded-xl bg-[#701a28] hover:bg-[#59131e] text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  {copiedCode === (profile?.referralCode || 'PUROHIT-DEVOTEE-99') ? (
                    <>
                      <Check className="w-4 h-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Share Options */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Share Directly:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleShareWhatsApp(profile?.referralCode || 'PUROHIT-DEVOTEE-99')
                  }
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" /> Share on WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleNativeShare(profile?.referralCode || 'PUROHIT-DEVOTEE-99')
                  }
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-95"
                >
                  <Share2 className="w-4 h-4" /> More Options
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>
                Total Referrals:{' '}
                <strong className="text-slate-900 font-bold">
                  {profile?.totalReferrals || 0}
                </strong>
              </span>
              <span>
                Earned:{' '}
                <strong className="text-emerald-600 font-bold">
                  {formatCurrency((profile?.totalReferrals || 0) * 250)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
