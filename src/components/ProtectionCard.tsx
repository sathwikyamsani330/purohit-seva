import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  CalendarCheck,
  FileText,
  RefreshCw,
  UserCheck,
  Scale,
  Sparkles,
  Star,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { PUROHIT_PROTECTION_FEATURES } from '../services/protectionService';

interface ProtectionCardProps {
  bookingId?: string;
  isConfirmed?: boolean;
  className?: string;
  onReportClick?: () => void;
  variant?: 'full' | 'compact' | 'badge-only';
}

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldCheck,
  Lock,
  CalendarCheck,
  FileText,
  RefreshCw,
  UserCheck,
  Scale,
  Sparkles,
  Star
};

export const ProtectionCard: React.FC<ProtectionCardProps> = ({
  bookingId,
  isConfirmed = true,
  className = '',
  onReportClick,
  variant = 'full'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (variant === 'badge-only') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fdf2f4] border border-[#f5ccd2] text-[#701a28] text-xs font-semibold ${className}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-[#701a28]" />
        <span>Purohit Seva Protected Booking</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-[#ebdcd3] bg-gradient-to-b from-[#fffcf9] to-[#faf6f0] p-4 shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fdf2f4] border border-[#f5ccd2] flex items-center justify-center shrink-0 text-[#701a28]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading font-bold text-stone-900 text-sm sm:text-base">
                Purohit Seva Protected Booking
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Escrow
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
              Your ceremony is backed by Vedic lineage verification, dakshina escrow, and dispute mediation.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-stone-500 hover:text-stone-800 p-1 rounded-lg hover:bg-stone-100 transition shrink-0 cursor-pointer"
          title={isExpanded ? 'Collapse guarantees' : 'View all 9 protection guarantees'}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Grid of Highlights (Always shows 4 core, expands to all 9) */}
      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-stone-100">
        {(isExpanded
          ? PUROHIT_PROTECTION_FEATURES
          : PUROHIT_PROTECTION_FEATURES.slice(0, 4)
        ).map((item) => {
          const IconComp = ICON_MAP[item.icon] || ShieldCheck;
          return (
            <div
              key={item.id}
              className="flex items-start gap-2 p-2 rounded-xl bg-white/80 border border-stone-100"
            >
              <IconComp className="w-4 h-4 text-[#701a28] shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-stone-800 block">
                  {item.title}
                </span>
                <span className="text-[11px] text-stone-500 leading-tight block">
                  {item.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer controls & Report trigger */}
      <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[#701a28] font-semibold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
        >
          {isExpanded ? 'Show less' : `+ Show ${PUROHIT_PROTECTION_FEATURES.length - 4} more protection benefits`}
        </button>

        {onReportClick && (
          <button
            type="button"
            onClick={onReportClick}
            className="text-stone-500 hover:text-rose-700 text-[11px] font-medium flex items-center gap-1 hover:underline cursor-pointer ml-auto"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Report off-platform request</span>
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Small professional notice for off-platform warning
 */
export const OffPlatformNotice: React.FC<{
  className?: string;
  onReportClick?: () => void;
}> = ({ className = '', onReportClick }) => {
  return (
    <div
      className={`p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start justify-between gap-3 text-xs ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
        <p className="text-amber-900 leading-relaxed text-[11px] sm:text-xs">
          <strong>For your safety and booking protection:</strong> Always complete bookings and payments through Purohit Seva. Direct settlements void escrow protection.
        </p>
      </div>
      {onReportClick && (
        <button
          type="button"
          onClick={onReportClick}
          className="text-amber-900/80 hover:text-rose-700 text-[10px] sm:text-[11px] font-bold underline whitespace-nowrap shrink-0 cursor-pointer"
        >
          Report
        </button>
      )}
    </div>
  );
};

/**
 * Short customer safety notice
 */
export const CustomerSafetyNotice: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div
      className={`p-2.5 rounded-xl bg-[#fdf2f4] border border-[#f5ccd2] flex items-center gap-2 text-xs text-[#701a28] ${className}`}
    >
      <ShieldCheck className="w-4 h-4 shrink-0 text-[#701a28]" />
      <span className="text-[11px] sm:text-xs font-medium">
        To keep your booking protected, always complete payment through Purohit Seva.
      </span>
    </div>
  );
};
