import React from 'react';
import { CeremonyPlan } from '../../types';
import { Clock, CheckCircle2, Flame, Sparkles, BookOpen } from 'lucide-react';

interface Props {
  plan: CeremonyPlan;
}

export const RitualSequenceTimeline: React.FC<Props> = ({ plan }) => {
  const sequence = plan.rituals?.sequence || [];
  const mainRituals = plan.rituals?.mainRituals || [];
  const optionalRituals = plan.rituals?.optionalRituals || [];

  return (
    <div className="bg-white border border-[#eadfd9] rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#eadfd9] pb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-[#22060a] flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#701a28]" />
            Sacred Ritual Sequence & Vidhana
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Authentic Vedic order of rites with recommended timings and spiritual significance.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5 text-[#701a28]" />
          <span>Total: {plan.estimatedDuration || '3 - 4 Hours'}</span>
        </div>
      </div>

      {/* Main Rituals Highlights */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
          Key Ceremonial Invocations
        </h4>
        <div className="flex flex-wrap gap-2">
          {mainRituals.map((r, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#701a28]/5 border border-[#701a28]/15 text-[#701a28] text-xs font-semibold"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#e5b869]" />
              {r}
            </span>
          ))}
          {optionalRituals.map((r, idx) => (
            <span
              key={`opt-${idx}`}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-600 text-xs font-medium"
            >
              <span className="text-[10px] uppercase font-bold text-stone-400">Optional:</span>
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Step-by-Step Chronological Sequence */}
      {sequence.length > 0 && (
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Suggested Vidhana Sequence
          </h4>

          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#eadfd9]">
            {sequence.map((step, idx) => (
              <div key={idx} className="relative group">
                {/* Step Marker */}
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#701a28] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  {step.step || idx + 1}
                </div>

                <div className="bg-stone-50/70 border border-[#eadfd9] rounded-xl p-3.5 hover:bg-white transition">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-sm font-bold text-[#22060a]">
                      {step.name}
                    </h5>
                    {step.durationMinutes && (
                      <span className="text-[11px] font-medium text-stone-500 bg-white border border-stone-200 px-2 py-0.5 rounded-md shrink-0">
                        ~{step.durationMinutes} mins
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
