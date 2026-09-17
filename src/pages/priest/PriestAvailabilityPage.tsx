import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { priestService, DEFAULT_MUHURTHAM_SLOTS } from '../../services/priestService';
import { bookingService } from '../../services/bookingService';
import { Priest, Booking, PriestEventAvailability } from '../../types';
import { getTodayDateString } from '../../utils';
import { Calendar } from '../../components/Calendar';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import {
  Clock,
  Plus,
  Trash2,
  Save,
  CalendarCheck,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  Ban,
  Sparkles,
  Layers,
  Info,
  Calendar as CalendarIcon,
  ChevronRight,
  User,
  MapPin,
  Flame,
  RotateCcw
} from 'lucide-react';

export const PriestAvailabilityPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const [priest, setPriest] = useState<Priest | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [customDateSlots, setCustomDateSlots] = useState<{ [date: string]: string[] }>({});
  const [eventAvailability, setEventAvailability] = useState<{ [eventId: string]: PriestEventAvailability }>({});
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[]>([]);

  const [newSlot, setNewSlot] = useState('');
  const [newCustomSlot, setNewCustomSlot] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'eventSpecific' | 'bulk'>('schedule');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const priestId = currentUser?.id || 'priest-1';
        const [data, bookings] = await Promise.all([
          priestService.getPriestById(priestId),
          bookingService.getBookings()
        ]);

        if (data) {
          setPriest(data);
          setAvailableDates(data.availableDates || []);
          setBlockedDates(data.blockedDates || []);
          setTimeSlots(data.timeSlots && data.timeSlots.length > 0 ? data.timeSlots : DEFAULT_MUHURTHAM_SLOTS);
          setCustomDateSlots(data.customDateSlots || {});
          setEventAvailability(data.eventAvailability || {});
          if (data.services && data.services.length > 0) {
            setSelectedEventId(data.services[0].eventId);
          }
        }

        // Filter bookings for this priest
        const priestBookings = bookings.filter(b => 
          b.priestId === priestId &&
          (b.bookingStatus === 'CONFIRMED' || b.status === 'confirmed')
        );
        setConfirmedBookings(priestBookings);

        // Select today's date by default
        setSelectedDate(getTodayDateString());
      } catch (err) {
        console.error('Error loading priest availability:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser]);

  // Booked dates list for calendar badges
  const bookedDatesList = Array.from(new Set(confirmedBookings.map(b => b.date)));

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const handleToggleDateAvailability = (dateStr: string, targetState: 'available' | 'blocked' | 'default') => {
    if (targetState === 'available') {
      setBlockedDates(prev => prev.filter(d => d !== dateStr));
      if (!availableDates.includes(dateStr)) {
        setAvailableDates(prev => [...prev, dateStr]);
      }
    } else if (targetState === 'blocked') {
      setAvailableDates(prev => prev.filter(d => d !== dateStr));
      if (!blockedDates.includes(dateStr)) {
        setBlockedDates(prev => [...prev, dateStr]);
      }
    } else {
      // default / unassigned
      setAvailableDates(prev => prev.filter(d => d !== dateStr));
      setBlockedDates(prev => prev.filter(d => d !== dateStr));
    }
  };

  const handleAddTimeSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSlot.trim();
    if (!trimmed) return;
    if (timeSlots.includes(trimmed)) {
      error('Muhurtham slot already exists.');
      return;
    }
    setTimeSlots([...timeSlots, trimmed]);
    setNewSlot('');
    success(`Added slot ${trimmed}`);
  };

  const handleRemoveSlot = (slot: string) => {
    setTimeSlots(timeSlots.filter(s => s !== slot));
  };

  const handleAddCustomDateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    const trimmed = newCustomSlot.trim();
    if (!trimmed) return;

    const currentCustom = customDateSlots[selectedDate] || [...timeSlots];
    if (currentCustom.includes(trimmed)) {
      error('Slot already configured for this date.');
      return;
    }
    setCustomDateSlots({
      ...customDateSlots,
      [selectedDate]: [...currentCustom, trimmed]
    });
    setNewCustomSlot('');
    success(`Custom slot ${trimmed} added for ${selectedDate}`);
  };

  const handleRemoveCustomDateSlot = (date: string, slot: string) => {
    const currentCustom = customDateSlots[date] || [...timeSlots];
    setCustomDateSlots({
      ...customDateSlots,
      [date]: currentCustom.filter(s => s !== slot)
    });
  };

  const handleApplyPreset = (presetName: string) => {
    if (presetName === 'standard') {
      setTimeSlots(DEFAULT_MUHURTHAM_SLOTS);
      success('Applied Standard Auspicious Muhurthams preset (6 slots)');
    } else if (presetName === 'morning_evening') {
      setTimeSlots(['06:30 AM', '08:30 AM', '05:00 PM', '07:00 PM']);
      success('Applied Morning & Evening Puja Timings preset (4 slots)');
    } else if (presetName === 'full_vedic') {
      setTimeSlots(['05:30 AM', '07:30 AM', '09:30 AM', '11:30 AM', '04:00 PM', '06:00 PM', '08:00 PM']);
      success('Applied Full Vedic Auspicious Routine preset (7 slots)');
    }
  };

  const handleBulkMarkNext30Days = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    setAvailableDates(Array.from(new Set([...availableDates, ...dates])));
    setBlockedDates(prev => prev.filter(d => !dates.includes(d)));
    success('Marked next 30 days as Available for booking!');
  };

  const handleBulkMarkWeekends = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() === 0 || d.getDay() === 6) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    setAvailableDates(Array.from(new Set([...availableDates, ...dates])));
    setBlockedDates(prev => prev.filter(d => !dates.includes(d)));
    success('Marked all weekend dates for the next 2 months as Available!');
  };

  const handleToggleEventSlot = (eventId: string, slot: string) => {
    const existing = eventAvailability[eventId] || {
      eventId,
      allowedSlots: [...timeSlots],
      isActive: true
    };

    const currentSlots = existing.allowedSlots || [...timeSlots];
    const updatedSlots = currentSlots.includes(slot)
      ? currentSlots.filter(s => s !== slot)
      : [...currentSlots, slot];

    setEventAvailability({
      ...eventAvailability,
      [eventId]: {
        ...existing,
        allowedSlots: updatedSlots
      }
    });
  };

  const handleSaveAvailability = async () => {
    setIsSaving(true);
    try {
      const priestId = currentUser?.id || 'priest-1';
      await priestService.updatePriestSchedule(priestId, {
        availableDates,
        blockedDates,
        timeSlots,
        customDateSlots,
        eventAvailability
      });
      success('Availability schedule, dates, and muhurtham slots saved to Firestore!');
    } catch (err) {
      console.error('Error saving availability:', err);
      error('Failed to update availability. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your muhurtham calendar and bookings..." fullHeight />;
  }

  // Selected date info
  const isSelectedDateAvailable = availableDates.includes(selectedDate);
  const isSelectedDateBlocked = blockedDates.includes(selectedDate);
  const bookingsForSelectedDate = confirmedBookings.filter(b => b.date === selectedDate);
  const customSlotsForSelectedDate = customDateSlots[selectedDate];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
            <CalendarCheck className="w-4 h-4 text-amber-600" />
            Acharya Scheduling & Muhurtham Console
          </div>
          <h1 className="font-heading text-2xl font-bold text-stone-900">
            Priest Availability & Slot Management
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Manage your working calendar, block personal dates, define ceremony slots, and avoid double bookings in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleSaveAvailability}
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
            className="shadow-sm shadow-amber-600/30"
          >
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Quick Statistics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Available Days
          </span>
          <div className="text-xl font-bold text-amber-600 mt-1 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            {availableDates.length > 0 ? availableDates.length : 'All Open'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Blocked Dates
          </span>
          <div className="text-xl font-bold text-rose-600 mt-1 flex items-center gap-2">
            <Ban className="w-5 h-5 text-rose-500" />
            {blockedDates.length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Standard Slots
          </span>
          <div className="text-xl font-bold text-stone-900 mt-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            {timeSlots.length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Active Bookings
          </span>
          <div className="text-xl font-bold text-indigo-600 mt-1 flex items-center gap-2">
            <Flame className="w-5 h-5 text-indigo-500" />
            {confirmedBookings.length}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'schedule'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Calendar & Day Inspector
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('eventSpecific')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'eventSpecific'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Puja Event Specific Slots
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bulk')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'bulk'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Bulk Presets & Quick Tools
        </button>
      </div>

      {/* TAB 1: Main Calendar & Day Inspector */}
      {activeTab === 'schedule' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Interactive Calendar (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-amber-600" />
                    Interactive Vedic Calendar
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Click any date to inspect details, toggle availability, or customize time slots
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600" /> Available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Blocked
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Booked ({confirmedBookings.length})
                  </span>
                </div>
              </div>

              <Calendar
                selectedDate={selectedDate}
                onSelectDate={handleDateClick}
                availableDates={availableDates}
                blockedDates={blockedDates}
                bookedDates={bookedDatesList}
              />

              <div className="mt-4 p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> Confirmed customer bookings automatically reserve the chosen slot in Firestore. Devotees cannot book overlapping rituals.
                </span>
              </div>
            </div>

            {/* Daily Standard Muhurtham Slots Config */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Standard Daily Muhurtham Slots
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Default slots offered to devotees on regular available days
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('standard')}
                    className="text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {timeSlots.map((slot) => (
                  <div
                    key={slot}
                    className="flex items-center justify-between px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  >
                    <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {slot}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(slot)}
                      title="Remove this slot"
                      className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Slot Form */}
              <form onSubmit={handleAddTimeSlot} className="flex gap-2 pt-2 border-t border-stone-100">
                <input
                  type="text"
                  placeholder="e.g. 04:00 PM or 09:30 AM"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <Button type="submit" variant="outline" size="sm">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Slot
                </Button>
              </form>
            </div>
          </div>

          {/* Right: Selected Day Inspector (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5 sticky top-24">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-stone-900 text-sm">
                    Day Inspector: {selectedDate || 'Select a date'}
                  </h3>
                </div>

                {isSelectedDateBlocked ? (
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                    <Ban className="w-3 h-3" /> Blocked
                  </span>
                ) : isSelectedDateAvailable ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Available
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                    Default Open
                  </span>
                )}
              </div>

              {/* Status Toggles for this date */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-700 block">
                  Set Status for {selectedDate}:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleDateAvailability(selectedDate, 'available')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelectedDateAvailable
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-amber-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Available
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleDateAvailability(selectedDate, 'blocked')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelectedDateBlocked
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-rose-50'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Block Day
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleDateAvailability(selectedDate, 'default')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      !isSelectedDateAvailable && !isSelectedDateBlocked
                        ? 'bg-stone-800 text-white border-stone-800 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Booked Ceremonies for this date */}
              <div className="space-y-2 pt-3 border-t border-stone-100">
                <label className="text-xs font-semibold text-stone-700 flex items-center justify-between">
                  <span>Confirmed Bookings on this Day:</span>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {bookingsForSelectedDate.length} Booked
                  </span>
                </label>

                {bookingsForSelectedDate.length === 0 ? (
                  <p className="text-xs text-stone-400 p-3 bg-stone-50 rounded-xl text-center italic">
                    No confirmed bookings on this day yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {bookingsForSelectedDate.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                          <span>{b.eventName}</span>
                          <span className="text-indigo-700 bg-white px-2 py-0.5 rounded text-[11px] border border-indigo-200">
                            {b.time || b.timeSlot}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-stone-600">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-stone-400" /> {b.customerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-stone-400" /> {b.location}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Date Slots (Overrides standard slots for this day) */}
              <div className="space-y-3 pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block">
                      Custom Slots for {selectedDate}
                    </label>
                    <p className="text-[11px] text-stone-400">
                      Override standard daily slots for festivals or special dates
                    </p>
                  </div>

                  {customSlotsForSelectedDate && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...customDateSlots };
                        delete next[selectedDate];
                        setCustomDateSlots(next);
                        success(`Restored standard slots for ${selectedDate}`);
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:underline"
                    >
                      Clear Custom
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(customSlotsForSelectedDate || timeSlots).map((slot) => {
                    const isCustom = Boolean(customSlotsForSelectedDate);
                    return (
                      <span
                        key={slot}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          isCustom
                            ? 'bg-amber-100/70 text-amber-900 border-amber-300'
                            : 'bg-stone-50 text-stone-700 border-stone-200'
                        }`}
                      >
                        <Clock className="w-3 h-3 text-stone-500" />
                        {slot}
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomDateSlot(selectedDate, slot)}
                            className="hover:text-rose-600 ml-0.5"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>

                {/* Add Custom Slot Input */}
                <form onSubmit={handleAddCustomDateSlot} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Custom slot e.g. 03:00 PM"
                    value={newCustomSlot}
                    onChange={(e) => setNewCustomSlot(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 bg-white border border-stone-200 rounded-xl outline-none focus:border-amber-500"
                  />
                  <Button type="submit" variant="secondary" size="sm">
                    Add
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Puja / Event Specific Availability */}
      {activeTab === 'eventSpecific' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              Ceremony-Specific Availability Rules
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Some pujas (such as Gruhapravesham or Homams) require specific auspicious morning hours. Customize which slots devotees can book per ceremony.
            </p>
          </div>

          {/* Service Selector */}
          <div className="flex flex-wrap gap-2">
            {(priest?.services || []).map((srv) => {
              const isSelected = selectedEventId === srv.eventId;
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => setSelectedEventId(srv.eventId)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-amber-600'}`} />
                  <span>{srv.name || srv.eventName}</span>
                </button>
              );
            })}
          </div>

          {selectedEventId && (
            <div className="p-5 bg-stone-50/80 border border-stone-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">
                    Allowed Muhurtham Slots for:{' '}
                    <span className="text-amber-700">
                      {priest?.services.find(s => s.eventId === selectedEventId)?.name || priest?.services.find(s => s.eventId === selectedEventId)?.eventName}
                    </span>
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Click any slot to toggle whether it is eligible for this ceremony
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {timeSlots.map((slot) => {
                  const allowedSlots = eventAvailability[selectedEventId]?.allowedSlots || timeSlots;
                  const isAllowed = allowedSlots.includes(slot);

                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => handleToggleEventSlot(selectedEventId, slot)}
                      className={`p-3 rounded-xl text-xs font-bold border transition flex items-center justify-between cursor-pointer ${
                        isAllowed
                          ? 'bg-white text-stone-900 border-amber-500 shadow-2xs ring-1 ring-amber-500/20'
                          : 'bg-stone-100/60 text-stone-400 border-stone-200 line-through'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {slot}
                      </span>
                      {isAllowed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Ban className="w-3.5 h-3.5 text-stone-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Bulk Presets & Quick Tools */}
      {activeTab === 'bulk' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Automated Scheduling Presets & Quick Actions
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Quickly populate your working calendar across the upcoming weeks in one click
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Open Next 30 Days</h4>
                <p className="text-xs text-stone-500 mt-1">
                  Marks all dates from today for the next month as Available for devotees.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkMarkNext30Days}
                className="w-full"
              >
                Apply 30-Day Open
              </Button>
            </div>

            <div className="p-5 bg-[#fdf2f4] border border-[#f5ccd2] rounded-2xl space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Weekend Vedic Seva</h4>
                <p className="text-xs text-stone-500 mt-1">
                  Marks all Saturdays and Sundays for the next 2 months as Available.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkMarkWeekends}
                className="w-full border-[#f5ccd2] text-[#701a28] hover:bg-[#f9dde2]"
              >
                Apply Weekend Schedule
              </Button>
            </div>

            <div className="p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Reset to Standard Vedic</h4>
                <p className="text-xs text-stone-500 mt-1">
                  Restores default muhurtham slots (6 daily auspicious windows).
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApplyPreset('standard')}
                className="w-full"
              >
                Restore Defaults
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

