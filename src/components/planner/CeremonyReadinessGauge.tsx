import React from 'react';
import { CeremonyPlan } from '../../types';
import { CheckCircle2, Circle, Sparkles, UserCheck, Calendar, PackageCheck, AlertCircle } from 'lucide-react';

interface Props {
  plan: CeremonyPlan;
  onFindPriest?: () => void;
}

export const CeremonyReadinessGauge: React.FC<Props> = ({ plan, onFindPriest }) => {
  const percentage = Math.min(100, Math.max(10, plan.readinessPercentage || 40));
  const reqItems = plan.samagri?.requiredItems || [];
  const checkedItems = reqItems.filter(i => i.checked).length;
  const samagriComplete = reqItems.length > 0 && checkedItems === reqItems.length;
  const isPriestBooked = plan.status === 'confirmed' || plan.status === 'completed';
  const isPriestRequested = plan.status === 'priest_requested' || !!plan.bookingId;

  return (
    <div className="bg-gradient-to-br from-[#faf7f2] via-white to-[#f5eee6] border border-[#eadfd9] rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Score & Meter */}
        <div className="flex items-center gap-5">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center shrink-0">
            {/* SVG Circle Progress */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="text-stone-200 stroke-current"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className="text-[#701a28] stroke-current transition-all duration-700 ease-out"
                strokeWidth="8"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#22060a] leading-none">
                {percentage}%
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 mt-0.5">
                Ready
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#701a28]/10 text-[#701a28] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#e5b869]" />
              <span>Smart Ceremony Readiness</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#22060a]">
              {percentage >= 90
                ? 'Ceremony Fully Prepared'
                : percentage >= 70
                ? 'Ceremony Well On Track'
                : 'Planning in Progress'}
            </h3>
            <p className="text-xs text-stone-600 max-w-sm">
              {percentage >= 90
                ? 'All critical preparations, samagri items, and ritual timelines are organized.'
                : `${checkedItems} of ${reqItems.length} samagri items arranged. Confirm your priest to finalize your date.`}
            </p>
          </div>
        </div>

        {/* Right: Milestone Breakdown Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border-t md:border-t-0 md:border-l border-[#eadfd9] pt-4 md:pt-0 md:pl-6">
          <div className="flex items-center gap-2 text-[#22060a]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Date & Location Identified</span>
          </div>

          <div className="flex items-center gap-2 text-[#22060a]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Vedic Ritual Sequence Structured</span>
          </div>

          <div className="flex items-center gap-2">
            {samagriComplete ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : checkedItems > 0 ? (
              <PackageCheck className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-stone-300 shrink-0" />
            )}
            <span className={samagriComplete ? 'text-[#22060a]' : 'text-stone-700'}>
              Samagri: <strong>{checkedItems}/{reqItems.length}</strong> items arranged
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isPriestBooked ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : isPriestRequested ? (
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-stone-300 shrink-0" />
            )}
            <span className={isPriestBooked ? 'text-[#22060a]' : 'text-stone-700'}>
              {isPriestBooked
                ? 'Priest Confirmed'
                : isPriestRequested
                ? 'Priest Request Pending'
                : 'Priest Not Yet Selected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
