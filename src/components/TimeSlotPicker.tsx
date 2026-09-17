import React from 'react';
import { Clock, Lock, Check, AlertCircle } from 'lucide-react';
import { SlotAvailabilityInfo } from '../types';

export interface TimeSlotPickerProps {
  slots?: string[];
  slotInfos?: SlotAvailabilityInfo[];
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
  title?: string;
  isLoading?: boolean;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots = [],
  slotInfos,
  selectedSlot,
  onSelectSlot,
  title = 'Select Auspicious Muhurtham / Time Slot',
  isLoading = false
}) => {
  // Normalize items to SlotAvailabilityInfo
  const items: SlotAvailabilityInfo[] = slotInfos && slotInfos.length > 0
    ? slotInfos
    : slots.map(s => ({
        slot: s,
        isBooked: false,
        isBlocked: false,
        isAvailable: true
      }));

  return (
    <div className="w-full space-y-2">
      {title && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider block flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#701a28]" />
            {title}
          </label>
          <div className="flex items-center gap-3 text-[11px] text-stone-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#701a28]" /> Available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-stone-300" /> Booked / Reserved
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="p-6 bg-[#faf8f5] border border-[#eadfd9] rounded-2xl text-center text-xs text-stone-500 animate-pulse">
          Checking priest availability and reserved muhurtham slots...
        </div>
      ) : items.length === 0 ? (
        <div className="p-4 bg-[#faf8f5] border border-[#eadfd9] rounded-xl text-center text-xs text-stone-500 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-stone-400" />
          <span>No muhurtham slots available for this date. Please pick another auspicious day.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {items.map((item) => {
            const isSelected = selectedSlot === item.slot;
            const isDisabled = !item.isAvailable || item.isBooked || item.isBlocked;

            return (
              <button
                key={item.slot}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (!isDisabled) {
                    onSelectSlot(item.slot);
                  }
                }}
                title={isDisabled ? (item.reason || 'This slot is unavailable or already booked') : 'Click to select this muhurtham slot'}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition flex flex-col items-center justify-center gap-1 relative ${
                  isSelected && !isDisabled
                    ? 'bg-[#701a28] text-white border-[#701a28] shadow-sm shadow-[#701a28]/25 ring-2 ring-[#701a28]/20'
                    : isDisabled
                    ? 'bg-stone-100/80 text-stone-400 border-stone-200/80 cursor-not-allowed opacity-80'
                    : 'bg-white text-stone-800 border-[#eadfd9] hover:border-[#701a28] hover:bg-[#fdf2f4] cursor-pointer shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {isDisabled ? (
                    <Lock className="w-3 h-3 text-stone-400" />
                  ) : isSelected ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Clock className="w-3 h-3 text-stone-400" />
                  )}
                  <span className={isDisabled ? 'line-through' : ''}>{item.slot}</span>
                </div>

                {isDisabled && (
                  <span className="text-[10px] font-bold text-rose-600/90 bg-rose-50 px-1.5 py-0.2 rounded">
                    {item.isBooked ? 'Booked' : 'Blocked'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

