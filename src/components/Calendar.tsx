import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { getTodayDateString } from '../utils';

export interface CalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  availableDates?: string[];
  blockedDates?: string[];
  bookedDates?: string[];
  minDate?: string;
}

export const Calendar: React.FC<CalendarProps> = ({
  selectedDate,
  onSelectDate,
  availableDates = [],
  blockedDates = [],
  bookedDates = [],
  minDate
}) => {
  const todayStr = getTodayDateString();

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    return selectedDate ? new Date(selectedDate) : new Date();
  });

  // When selectedDate changes, keep month view in sync
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  }, [selectedDate]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectDate(todayStr);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatDateStr = (d: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs">
      {/* Month Navigation & Today Shortcut */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-stone-900 text-sm">
            {monthNames[month]} {year}
          </h4>
          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#fdf2f4] text-[#701a28] border border-[#f5ccd2] hover:bg-[#fae4e7] transition cursor-pointer flex items-center gap-1"
            title="Select Today's Date"
          >
            <CalendarIcon className="w-3 h-3 text-[#701a28]" />
            Today
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center mb-2">
        {weekDays.map((wd) => (
          <span key={wd} className="text-[11px] font-semibold text-stone-400">
            {wd}
          </span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading empty days */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9" />
        ))}

        {/* Days of month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = formatDateStr(dayNum);
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === todayStr;
          const isBlocked = blockedDates.includes(dateStr);
          const isAvailable = availableDates.length === 0 || availableDates.includes(dateStr);
          const isPast = minDate ? dateStr < minDate : false;
          const isDisabled = isBlocked || !isAvailable || isPast;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectDate(dateStr)}
              className={`h-9 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition cursor-pointer relative ${
                isSelected
                  ? 'bg-[#701a28] text-white shadow-sm shadow-[#701a28]/30 font-bold'
                  : isToday
                  ? 'border-2 border-[#701a28] bg-[#fdf2f4] text-[#701a28] font-bold hover:bg-[#fae4e7]'
                  : isDisabled
                  ? 'text-stone-300 bg-stone-50/50 cursor-not-allowed line-through'
                  : 'text-stone-700 hover:bg-[#fdf2f4] hover:text-[#701a28]'
              }`}
            >
              <span>{dayNum}</span>
              {isToday && !isSelected && (
                <span className="text-[8px] leading-none uppercase font-extrabold text-[#701a28] tracking-tighter">
                  Today
                </span>
              )}
              {isAvailable && !isDisabled && !isSelected && !isToday && (
                <span className="w-1 h-1 rounded-full bg-[#e5b869] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
