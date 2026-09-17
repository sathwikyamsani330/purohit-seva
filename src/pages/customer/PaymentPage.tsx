import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { requestService } from '../../services/requestService';
import { rewardService } from '../../services/rewardService';
import { paymentService } from '../../services/paymentService';
import { PriestRequest, CustomerReward, PaymentUIState } from '../../types';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { formatCurrency, formatDate } from '../../utils';
import { CustomerSafetyNotice, OffPlatformNotice } from '../../components/ProtectionCard';
import {
  CreditCard,
  QrCode,
  Building2,
  Lock,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Loader2,
  Gift,
  Tag,
  X,
  Check,
  RefreshCw,
  Info
} from 'lucide-react';

export const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { requestId: paramRequestId } = useParams<{ requestId?: string }>();
  const [searchParams] = useSearchParams();
  const queryRequestId = searchParams.get('requestId') || searchParams.get('id');
  const targetId = paramRequestId || queryRequestId;

  const { requests, payAndConfirmRequest, getRequestById } = useBooking();
  const { success, error } = useToast();

  const [activeRequest, setActiveRequest] = useState<PriestRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [upiId, setUpiId] = useState('devotee@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('884');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [paymentUIState, setPaymentUIState] = useState<PaymentUIState>('PAYMENT_REQUIRED');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);
  const [isDemoModeDetected, setIsDemoModeDetected] = useState<boolean>(true);

  const isProcessing =
    paymentUIState === 'ORDER_CREATING' ||
    paymentUIState === 'GATEWAY_OPEN' ||
    paymentUIState === 'VERIFYING' ||
    paymentUIState === 'CONFIRMING';

  // Rewards & Discounts state
  const [availableRewards, setAvailableRewards] = useState<CustomerReward[]>([]);
  const [appliedReward, setAppliedReward] = useState<CustomerReward | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingReward, setIsApplyingReward] = useState(false);

  useEffect(() => {
    const fetchTargetRequest = async () => {
      setLoading(true);
      try {
        if (targetId) {
          const req = await getRequestById(targetId);
          setActiveRequest(req);
        } else {
          // If no param, check if there is an ACCEPTED request or any latest request in context
          const allReqs = await requestService.getRequests();
          const accepted = allReqs.find(r => r.status === 'ACCEPTED' || r.status === 'PAYMENT_PENDING');
          if (accepted) {
            setActiveRequest(accepted);
          } else if (allReqs.length > 0) {
            setActiveRequest(allReqs[0]);
          }
        }

        // Fetch user rewards
        const userRewards = await rewardService.getCustomerRewards(currentUser?.id || '');
        const activeOnly = userRewards.filter((r) => r.status === 'AVAILABLE');
        setAvailableRewards(activeOnly);
      } finally {
        setLoading(false);
      }
    };
    fetchTargetRequest();
  }, [targetId, getRequestById, currentUser]);

  if (loading) {
    return <LoadingState message="Loading payment checkout..." fullHeight />;
  }

  // If no request found
  if (!activeRequest) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-[#fdf2f4] rounded-full flex items-center justify-center mx-auto text-[#701a28]">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold text-stone-900">No Accepted Request Found</h2>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            You don't have an active accepted request awaiting payment. Please submit a request to a verified priest first.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/priests')}>
          Browse Verified Priests
        </Button>
      </div>
    );
  }

  // CONSTRAINT: Do NOT allow payment while request status is PENDING
  if (activeRequest.status === 'PENDING') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <div className="bg-[#fdf2f4] rounded-3xl border border-[#f5ccd2] p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-[#f5ccd2] text-[#701a28] rounded-full flex items-center justify-center mx-auto">
            <Clock3 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 bg-[#f5ccd2] text-[#701a28] border border-[#f5ccd2] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Request Status: PENDING
            </span>
            <h2 className="font-heading text-2xl font-bold text-stone-900">
              Payment Not Permitted Yet
            </h2>
            <p className="text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
              Your request for <strong>{activeRequest.eventName}</strong> with <strong>Acharya {activeRequest.priestName}</strong> is currently pending priest confirmation.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#eadfd9] text-xs text-left text-stone-700 space-y-2">
            <div className="flex justify-between">
              <span className="text-stone-400 font-medium">Request Reference:</span>
              <span className="font-mono font-bold text-stone-900">{activeRequest.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400 font-medium">Auspicious Date:</span>
              <span className="font-semibold text-stone-900">{formatDate(activeRequest.date)} ({activeRequest.time})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400 font-medium">Estimated Dakshina:</span>
              <span className="font-bold text-[#701a28]">{formatCurrency(activeRequest.totalAmount)}</span>
            </div>
          </div>

          <p className="text-xs text-[#701a28] italic">
            You will be notified once the priest accepts the request. Payment is only enabled after acceptance.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link to="/bookings">
              <Button variant="primary">View My Requests</Button>
            </Link>
            <Link to="/priests">
              <Button variant="outline">Browse Other Priests</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If request is REJECTED
  if (activeRequest.status === 'REJECTED') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <div className="bg-rose-50 rounded-3xl border border-rose-200 p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Request Status: REJECTED
            </span>
            <h2 className="font-heading text-2xl font-bold text-slate-900">
              Priest Unavailable for this Slot
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Acharya {activeRequest.priestName} is unable to accept this request:
              <br />
              <strong>{activeRequest.rejectionReason || 'Unavailable for this timing'}</strong>
              {activeRequest.rejectionNotes && ` ("${activeRequest.rejectionNotes}")`}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link to="/priests">
              <Button variant="primary">Find Another Priest</Button>
            </Link>
            <Link to="/bookings">
              <Button variant="outline">Back to My Bookings</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If request is ALREADY CONFIRMED
  if (activeRequest.status === 'CONFIRMED' && activeRequest.bookingId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6 text-center">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-5 shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">
            Payment Already Completed
          </h2>
          <p className="text-sm text-slate-600">
            This request has already been paid for and confirmed under Booking ID: <strong>{activeRequest.bookingId}</strong>
          </p>
          <Button variant="primary" onClick={() => navigate(`/booking-confirmation/${activeRequest.bookingId}`)}>
            View Confirmed Booking
          </Button>
        </div>
      </div>
    );
  }

  // Active Request is ACCEPTED -> Ready to Pay!
  const serviceCharge = activeRequest.servicePrice || 5000;
  const platformFee = activeRequest.platformFee || 250;
  const rewardDiscount = appliedReward ? Math.min(appliedReward.discountAmount, serviceCharge + platformFee - 100) : 0;
  const finalTotalAmount = Math.max(0, serviceCharge + platformFee - rewardDiscount);

  const handleApplyRewardVoucher = (reward: CustomerReward) => {
    setCouponError(null);
    if (reward.minBookingAmount && serviceCharge < reward.minBookingAmount) {
      setCouponError(`Minimum ceremony value of ₹${reward.minBookingAmount} required for this reward.`);
      return;
    }
    setAppliedReward(reward);
    success(`Applied ${reward.title} (-₹${reward.discountAmount})`);
  };

  const handleApplyCustomCode = async () => {
    if (!couponCodeInput.trim()) return;
    setIsApplyingReward(true);
    setCouponError(null);

    try {
      const res = await rewardService.validateAndApplyReward(
        currentUser?.id || '',
        couponCodeInput.trim(),
        serviceCharge + platformFee
      );

      if (!res.isValid || !res.reward) {
        setCouponError(res.error || 'Invalid or expired reward coupon code.');
      } else {
        setAppliedReward(res.reward);
        success(`Applied reward coupon ${res.reward.rewardCode} (-₹${res.discountAmount})!`);
        setCouponCodeInput('');
      }
    } catch (err: any) {
      setCouponError(err.message || 'Failed to validate reward coupon code.');
    } finally {
      setIsApplyingReward(false);
    }
  };

  const handleRemoveReward = () => {
    setAppliedReward(null);
    setCouponError(null);
    success('Reward discount removed.');
  };

  const handlePayNow = async () => {
    if (!activeRequest) return;
    setPaymentErrorMessage(null);
    setPaymentUIState('ORDER_CREATING');

    try {
      // 1. Request server-authoritative order creation
      const rewardInfo = appliedReward
        ? {
            appliedRewardId: appliedReward.id,
            appliedRewardCode: appliedReward.rewardCode,
            rewardDiscount
          }
        : undefined;

      const orderData = await paymentService.createPaymentOrder({
        request: activeRequest,
        rewardDiscount
      });

      setIsDemoModeDetected(orderData.isDemoMode);
      setPaymentUIState('GATEWAY_OPEN');

      // 2. Open Razorpay Standard Checkout modal or trigger simulated checkout
      await paymentService.openCheckout({
        orderData,
        request: activeRequest,
        customerName: currentUser?.name || activeRequest.customerName,
        customerEmail: currentUser?.email || activeRequest.customerEmail,
        customerPhone: activeRequest.customerPhone,
        onSuccess: async (payResponse) => {
          setPaymentUIState('VERIFYING');

          try {
            // 3. Authoritative server verification
            const verifyResult = await paymentService.verifyPayment({
              orderId: payResponse.orderId,
              paymentId: payResponse.paymentId,
              signature: payResponse.signature,
              requestId: activeRequest.id,
              customerId: activeRequest.customerId
            });

            if (!verifyResult.verified) {
              throw new Error('Payment signature verification could not be validated.');
            }

            // 4. Server-confirmed transition to confirmed booking
            setPaymentUIState('CONFIRMING');
            const { booking } = await payAndConfirmRequest(
              activeRequest.id,
              paymentMethod,
              rewardInfo,
              {
                orderId: verifyResult.orderId,
                isDemoPayment: verifyResult.isDemoMode,
                platformCommission: verifyResult.platformCommission,
                priestPayableAmount: verifyResult.priestPayableAmount,
                escrowStatus: verifyResult.escrowStatus,
                serverCalculatedTotal: verifyResult.totalAmount
              }
            );

            setPaymentUIState('CONFIRMED');
            success('Sacred booking confirmed! Dakshina held securely in 100% Escrow Protection.');
            navigate(`/booking-confirmation/${booking.id}`);
          } catch (verifyErr: any) {
            console.error('Verification error:', verifyErr);
            setPaymentUIState('FAILED');
            setPaymentErrorMessage(
              verifyErr.message || 'Payment signature verification failed. Please contact support if your account was charged.'
            );
          }
        },
        onDismiss: () => {
          setPaymentUIState('CANCELLED');
          setPaymentErrorMessage('Payment process was cancelled. You can retry whenever you are ready.');
        },
        onError: (gatewayErr: Error) => {
          setPaymentUIState('FAILED');
          setPaymentErrorMessage(gatewayErr.message || 'Payment gateway encountered an error.');
        }
      });
    } catch (err: any) {
      setPaymentUIState('FAILED');
      setPaymentErrorMessage(err.message || 'Unable to initiate payment with the gateway. Please retry.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
          <button
            onClick={() => navigate('/bookings')}
            disabled={isProcessing}
            className="hover:text-[#701a28] flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Bookings
          </button>
          <span>/</span>
          <span className="text-[#701a28] font-semibold">Payment for Accepted Request</span>
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block mb-1">
          Priest Accepted • Complete Payment
        </span>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
          Confirm Sacred Ceremony
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
          Acharya <strong>{activeRequest.priestName}</strong> has confirmed availability. Complete payment to secure your booking ID.
        </p>
      </div>

      {/* Mandatory Customer Safety Notice */}
      <CustomerSafetyNotice />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Payment Methods */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Method Selector Tabs */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-5">
            <h2 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#701a28]" />
              Choose Payment Method
            </h2>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                disabled={isProcessing}
                className={`p-4 rounded-xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                  paymentMethod === 'UPI'
                    ? 'border-[#701a28] bg-[#fdf2f4] text-[#701a28] font-bold ring-1 ring-[#701a28]'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700'
                }`}
              >
                <QrCode className="w-6 h-6 text-[#701a28]" />
                <span className="text-xs">UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Card')}
                disabled={isProcessing}
                className={`p-4 rounded-xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                  paymentMethod === 'Card'
                    ? 'border-[#701a28] bg-[#fdf2f4] text-[#701a28] font-bold ring-1 ring-[#701a28]'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700'
                }`}
              >
                <CreditCard className="w-6 h-6 text-[#701a28]" />
                <span className="text-xs">Debit / Credit Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('NetBanking')}
                disabled={isProcessing}
                className={`p-4 rounded-xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                  paymentMethod === 'NetBanking'
                    ? 'border-[#701a28] bg-[#fdf2f4] text-[#701a28] font-bold ring-1 ring-[#701a28]'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700'
                }`}
              >
                <Building2 className="w-6 h-6 text-[#701a28]" />
                <span className="text-xs">Net Banking</span>
              </button>
            </div>

            {/* TAB 1: UPI / QR Payment */}
            {paymentMethod === 'UPI' && (
              <div className="pt-4 border-t border-stone-100 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-[#faf8f5] rounded-2xl border border-[#eadfd9]">
                  <div className="w-36 h-36 bg-white p-2 rounded-xl border border-[#eadfd9] shadow-xs flex flex-col items-center justify-center shrink-0">
                    <div className="w-full h-full bg-[#701a28] rounded-lg flex flex-col items-center justify-center text-white p-2 text-center">
                      <QrCode className="w-12 h-12 text-[#e5b869] mb-1" />
                      <span className="text-[9px] font-mono tracking-tighter text-[#eadfd9]">
                        SCAN TO PAY
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1 w-full text-center sm:text-left">
                    <div>
                      <span className="text-xs font-semibold text-stone-900 block">
                        Scan with any UPI App
                      </span>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        GPay, PhonePe, Paytm, BHIM or any banking app
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-stone-700 block">
                        Or enter UPI Virtual Payment Address (VPA):
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@okhdfcbank"
                        className="w-full text-xs text-stone-900 bg-white border border-[#eadfd9] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#701a28] focus:ring-1 focus:ring-[#701a28] font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Debit / Credit Card */}
            {paymentMethod === 'Card' && (
              <div className="pt-4 border-t border-stone-100 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-stone-700 block mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full text-xs text-stone-900 bg-[#faf8f5] border border-[#eadfd9] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#701a28] focus:ring-1 focus:ring-[#701a28] font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-stone-700 block mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full text-xs text-stone-900 bg-[#faf8f5] border border-[#eadfd9] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#701a28] focus:ring-1 focus:ring-[#701a28] font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-stone-700 block mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full text-xs text-stone-900 bg-[#faf8f5] border border-[#eadfd9] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#701a28] focus:ring-1 focus:ring-[#701a28] font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Net Banking */}
            {paymentMethod === 'NetBanking' && (
              <div className="pt-4 border-t border-stone-100 space-y-3">
                <label className="text-xs font-medium text-stone-700 block">
                  Select Bank:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra', 'Other Banks'].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        selectedBank === bank
                          ? 'border-[#701a28] bg-[#fdf2f4] text-[#701a28] font-bold'
                          : 'border-stone-200 hover:bg-[#faf8f5] text-stone-700'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Summary & Pay CTA */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md sticky top-24 space-y-6">
            <h3 className="font-heading text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
              Accepted Puja Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                  Accepted Priest
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {activeRequest.priestName}
                </p>
                <p className="text-emerald-800 text-xs">
                  {activeRequest.eventName}
                </p>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Date:</span>
                <span className="font-semibold text-slate-900">{formatDate(activeRequest.date)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Muhurtham:</span>
                <span className="font-semibold text-slate-900">{activeRequest.time || activeRequest.timeSlot}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Dakshina:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(serviceCharge)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Platform Fee:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(platformFee)}</span>
              </div>

              {/* Purohit Seva Rewards Voucher / Coupon Section */}
              <div className="pt-2 border-t border-dashed border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
                  <span className="flex items-center gap-1.5 text-[#701a28] font-bold">
                    <Gift className="w-3.5 h-3.5" /> Purohit Seva Rewards
                  </span>
                  {appliedReward && (
                    <button
                      type="button"
                      onClick={handleRemoveReward}
                      className="text-rose-600 hover:text-rose-700 text-[11px] font-medium flex items-center gap-0.5"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>

                {appliedReward ? (
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        {appliedReward.rewardCode}
                      </span>
                      <span className="font-bold text-emerald-700 text-xs">
                        -{formatCurrency(rewardDiscount)}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800">{appliedReward.title}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Available reward vouchers dropdown / chips */}
                    {availableRewards.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                          Your Active Vouchers:
                        </span>
                        <div className="space-y-1">
                          {availableRewards.map((rew) => (
                            <div
                              key={rew.id}
                              className="p-2 bg-[#fdf2f4] border border-[#f5ccd2] rounded-lg flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-[11px] text-stone-900 truncate">
                                  {rew.title}
                                </p>
                                <p className="text-[10px] text-[#701a28] font-mono">
                                  {rew.rewardCode} • Save ₹{rew.discountAmount}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApplyRewardVoucher(rew)}
                                className="px-2 py-1 bg-[#701a28] hover:bg-[#59131e] text-white rounded-md text-[10px] font-bold shrink-0 transition"
                              >
                                Apply
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Or enter custom promo code */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Tag className="w-3 h-3 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={couponCodeInput}
                          onChange={(e) => {
                            setCouponCodeInput(e.target.value.toUpperCase());
                            setCouponError(null);
                          }}
                          placeholder="Coupon or Promo Code"
                          className="w-full text-xs uppercase font-mono pl-7 pr-2 py-1.5 bg-[#faf8f5] border border-[#eadfd9] rounded-lg outline-none focus:border-[#701a28] focus:ring-1 focus:ring-[#701a28]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCustomCode}
                        disabled={!couponCodeInput.trim() || isApplyingReward}
                        className="px-3 py-1.5 bg-[#701a28] hover:bg-[#59131e] disabled:opacity-40 text-white text-xs font-bold rounded-lg transition shrink-0"
                      >
                        {isApplyingReward ? '...' : 'Apply'}
                      </button>
                    </div>

                    {couponError && (
                      <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {couponError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {rewardDiscount > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-semibold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Reward Discount:
                  </span>
                  <span>-{formatCurrency(rewardDiscount)}</span>
                </div>
              )}

              {/* Customer Loyalty Incentive */}
              <div className="p-3 bg-[#fdf2f4] border border-[#f5ccd2] rounded-xl flex items-center gap-2 text-xs text-[#701a28]">
                <Sparkles className="w-4 h-4 shrink-0 text-[#e5b869]" />
                <span className="text-[11px] font-medium leading-tight">
                  Book through Purohit Seva and earn <strong>Purohit Points</strong> upon ceremony completion.
                </span>
              </div>

              <div className="border-t border-stone-200 pt-3 flex justify-between items-center text-base font-bold text-stone-900">
                <span>Total Payable:</span>
                <span className="text-[#701a28] text-xl font-extrabold">
                  {formatCurrency(finalTotalAmount)}
                </span>
              </div>
            </div>

            {/* Error or Cancel Banner */}
            {(paymentUIState === 'FAILED' || paymentUIState === 'CANCELLED') && paymentErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentUIState === 'CANCELLED' ? 'Payment Cancelled' : 'Payment Failed'}</span>
                </div>
                <p className="text-rose-600 leading-tight">{paymentErrorMessage}</p>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handlePayNow}
              disabled={paymentUIState === 'ORDER_CREATING' || paymentUIState === 'GATEWAY_OPEN' || paymentUIState === 'VERIFYING' || paymentUIState === 'CONFIRMING'}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
            >
              {paymentUIState === 'ORDER_CREATING' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Preparing Gateway Order...
                </span>
              ) : paymentUIState === 'GATEWAY_OPEN' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Awaiting Gateway Checkout...
                </span>
              ) : paymentUIState === 'VERIFYING' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Verifying Security Signature...
                </span>
              ) : paymentUIState === 'CONFIRMING' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Confirming Sacred Booking...
                </span>
              ) : paymentUIState === 'FAILED' || paymentUIState === 'CANCELLED' ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Retry Payment ({formatCurrency(finalTotalAmount)})
                </span>
              ) : (
                `Pay ${formatCurrency(finalTotalAmount)} & Confirm`
              )}
            </Button>

            <div className="space-y-1.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>PCI-DSS Compliant Razorpay Standard Checkout</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Cryptographic HMAC verification with PCI-DSS compliant secure order processing.
              </p>
            </div>

            <OffPlatformNotice className="mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
};
