import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PriestRequest } from '../types';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { formatCurrency, formatDate } from '../utils';
import { canShowContactDetails, formatDisplayPhone, getCleanTelUrl } from '../utils/contactVisibility';
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  User,
  ShieldCheck,
  Phone,
  Lock
} from 'lucide-react';

export interface RequestCardProps {
  request: PriestRequest;
  isPriestView?: boolean;
  onAccept?: (requestId: string) => void;
  onReject?: (request: PriestRequest) => void;
  onCancel?: (requestId: string) => void;
  onPay?: (request: PriestRequest) => void;
}

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  isPriestView = false,
  onAccept,
  onReject,
  onCancel,
  onPay
}) => {
  const navigate = useNavigate();

  const getStatusBadge = () => {
    switch (request.status) {
      case 'PENDING':
        return {
          label: 'Pending Priest Response',
          bg: 'bg-[#fdf2f4] text-[#701a28] border-[#f5ccd2]',
          dot: 'bg-[#701a28]'
        };
      case 'ACCEPTED':
      case 'PAYMENT_PENDING':
        return {
          label: 'Request Accepted • Payment Pending',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
          dot: 'bg-emerald-500'
        };
      case 'CONFIRMED':
      case 'PAYMENT_COMPLETED':
        return {
          label: 'Confirmed Booking',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'REJECTED':
        return {
          label: 'Priest Unavailable',
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500'
        };
      case 'CANCELLED':
        return {
          label: 'Request Cancelled',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400'
        };
      default:
        return {
          label: request.status,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400'
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 p-5 flex flex-col justify-between ${
      request.status === 'ACCEPTED' ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:shadow-md'
    }`}>
      <div className="space-y-4">
        {/* Top bar with Request ID & Status Badge */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200">
              {request.id}
            </span>
            <span className="text-[11px] text-slate-400">
              {new Date(request.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>

        {/* Counterpart Info Header */}
        <div className="flex items-start gap-3.5">
          <Avatar
            src={isPriestView ? undefined : (request.priestImage || request.priestAvatar)}
            name={isPriestView ? request.customerName : request.priestName}
            size="lg"
            className="rounded-xl"
          />

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-900 text-base truncate">
              {request.eventName}
            </h4>
            <p className="text-xs text-slate-600 truncate mt-0.5">
              {isPriestView ? (
                <span>Client: <strong className="text-slate-800">{request.customerName}</strong></span>
              ) : (
                <span>Officiating Acharya: <strong className="text-slate-800">{request.priestName}</strong></span>
              )}
            </p>
            <p className="text-[11px] text-[#701a28] font-semibold truncate mt-0.5">
              {request.serviceName}
            </p>
          </div>
        </div>

        {/* Contact Visibility Notice / Info */}
        <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {canShowContactDetails(request) ? (
              <>
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-slate-600 font-medium">
                  Contact: <strong className="text-slate-900 font-mono">{formatDisplayPhone(isPriestView ? request.customerPhone : request.priestPhone)}</strong>
                </span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-[#701a28] shrink-0" />
                <span className="text-stone-500 text-[11px]">
                  Contact details available after payment confirmation.
                </span>
              </>
            )}
          </div>
          {canShowContactDetails(request) && (
            <a
              href={getCleanTelUrl(isPriestView ? request.customerPhone : request.priestPhone)}
              className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold inline-flex items-center gap-1 hover:bg-emerald-700 transition"
            >
              <Phone className="w-3 h-3" />
              <span>Call</span>
            </a>
          )}
        </div>

        {/* Ceremony Specifics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[#faf8f5] rounded-xl p-3.5 text-xs text-stone-600 border border-[#eadfd9]">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#701a28] shrink-0" />
            <span className="font-medium text-stone-900">{formatDate(request.date)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#701a28] shrink-0" />
            <span className="font-medium text-stone-900">{request.time || request.timeSlot}</span>
          </div>

          <div className="flex items-start gap-2 sm:col-span-2 pt-1 border-t border-[#eadfd9]">
            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
            <span className="text-stone-700 text-[11px] leading-tight line-clamp-2">
              {request.location}
            </span>
          </div>

          {(request.notes || request.specialNotes) && (
            <div className="flex items-start gap-2 sm:col-span-2 pt-1 border-t border-[#eadfd9]">
              <FileText className="w-3.5 h-3.5 text-[#701a28] shrink-0 mt-0.5" />
              <span className="text-stone-700 text-[11px] italic line-clamp-2">
                "{request.notes || request.specialNotes}"
              </span>
            </div>
          )}
        </div>

        {/* Status specific guidance banners */}
        {!isPriestView && request.status === 'ACCEPTED' && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Your priest request has been accepted!</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Acharya {request.priestName} is available for this slot. Please complete payment to confirm your sacred booking.
            </p>
          </div>
        )}

        {!isPriestView && request.status === 'PENDING' && (
          <div className="p-2.5 bg-[#fdf2f4] rounded-xl border border-[#f5ccd2] text-[11px] text-[#701a28] flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#701a28] shrink-0" />
            <span>Awaiting Acharya confirmation. You will be notified once reviewed.</span>
          </div>
        )}

        {!isPriestView && request.status === 'REJECTED' && (
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Priest Unavailable</span>
            </div>
            <p className="text-[11px] text-rose-700">
              Reason: <strong>{request.rejectionReason || 'Slot unavailable'}</strong>
              {request.rejectionNotes && ` - "${request.rejectionNotes}"`}
            </p>
          </div>
        )}
      </div>

      {/* Footer Pricing & Dynamic Actions */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight block">
            Requested Dakshina
          </span>
          <span className="text-base font-extrabold text-slate-900">
            {formatCurrency(request.totalAmount)}
          </span>
          <span className="text-[10px] text-slate-400 block">
            Includes platform fee
          </span>
        </div>

        {/* PRIEST ACTION BUTTONS */}
        {isPriestView && request.status === 'PENDING' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-rose-600 hover:bg-rose-50 border-rose-200"
              onClick={() => onReject && onReject(request)}
              leftIcon={<XCircle className="w-3.5 h-3.5" />}
            >
              Reject Request
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAccept && onAccept(request.id)}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Accept Request
            </Button>
          </div>
        )}

        {/* CUSTOMER ACTION BUTTONS */}
        {!isPriestView && request.status === 'ACCEPTED' && (
          <Button
            variant="primary"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
            onClick={() => onPay ? onPay(request) : navigate(`/payment?requestId=${request.id}`)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Proceed to Payment
          </Button>
        )}

        {!isPriestView && request.status === 'REJECTED' && (
          <Link to="/priests">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Find Another Priest
            </Button>
          </Link>
        )}

        {!isPriestView && request.status === 'CONFIRMED' && request.bookingId && (
          <Link to={`/booking-confirmation/${request.bookingId}`}>
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              View Booking ({request.bookingId})
            </Button>
          </Link>
        )}

        {!isPriestView && request.status === 'PENDING' && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-rose-600"
            onClick={() => onCancel(request.id)}
          >
            Cancel Request
          </Button>
        )}
      </div>
    </div>
  );
};
