import React from 'react';
import { PreparationTimeline } from '../../types';
import { Calendar, Clock, Sun, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  timeline: PreparationTimeline;
}

export const PreparationTimelineCard: React.FC<Props> = ({ timeline }) => {
  const { sevenDaysBefore = [], oneOrTwoDaysBefore = [], ceremonyDay = [] } = timeline || {};

  return (
    <div className="bg-white border border-[#eadfd9] rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
      <div className="border-b border-[#eadfd9] pb-4">
        <h3 className="text-lg sm:text-xl font-bold text-[#22060a] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#701a28]" />
          Preparation Timeline & Milestones
        </h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Structured roadmap to ensure seamless ritual readiness without last-minute haste.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Phase 1: 7 Days Before */}
        <div className="bg-stone-50/70 border border-[#eadfd9] rounded-xl p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#701a28]/10 text-[#701a28] flex items-center justify-center font-bold text-xs">
                7D
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#22060a]">
                  7 Days Before
                </h4>
                <span className="text-[10px] text-stone-500">Foundation & Logistics</span>
              </div>
            </div>

            <ul className="space-y-2 text-xs text-stone-700">
              {sevenDaysBefore.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
              {sevenDaysBefore.length === 0 && (
                <li className="text-stone-400 italic">No specific pre-requisites recorded.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Phase 2: 1-2 Days Before */}
        <div className="bg-[#701a28]/3 border border-[#701a28]/15 rounded-xl p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#701a28] text-white flex items-center justify-center font-bold text-xs">
                1-2D
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#701a28]">
                  1–2 Days Before
                </h4>
                <span className="text-[10px] text-stone-500">Fresh Samagri & Altar Setup</span>
              </div>
            </div>

            <ul className="space-y-2 text-xs text-stone-700">
              {oneOrTwoDaysBefore.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#701a28]/60 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
              {oneOrTwoDaysBefore.length === 0 && (
                <li className="text-stone-400 italic">Procure fresh flowers, fruits, and milk.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Phase 3: Ceremony Day */}
        <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#e5b869] text-[#22060a] flex items-center justify-center font-bold text-xs">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#22060a]">
                  Ceremony Day
                </h4>
                <span className="text-[10px] text-amber-700 font-medium">Brahma Muhurtham & Rituals</span>
              </div>
            </div>

            <ul className="space-y-2 text-xs text-stone-700">
              {ceremonyDay.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
              {ceremonyDay.length === 0 && (
                <li className="text-stone-400 italic">Wear traditional attire and receive Acharya with respect.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
