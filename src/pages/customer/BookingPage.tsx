import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useBooking } from '../../context/BookingContext';
import { priestService } from '../../services/priestService';
import { eventService } from '../../services/eventService';
import { Priest, PujaEvent, SlotAvailabilityInfo } from '../../types';
import { Calendar } from '../../components/Calendar';
import { TimeSlotPicker } from '../../components/TimeSlotPicker';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { formatCurrency, getTodayDateString } from '../../utils';
import {
  CheckCircle,
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  ShieldCheck,
  ArrowRight,
  Flame,
  ArrowLeft,
  FileText,
  Sparkles
} from 'lucide-react';

export const BookingPage: React.FC = () => {
  const { priestId } = useParams<{ priestId: string }>();
  const [searchParams] = useSearchParams();
  const effectivePriestId = priestId || searchParams.get('priestId') || 'pr-101';
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { error } = useToast();
  const { draft, setDraft } = useBooking();
  const planIdParam = searchParams.get('planId') || draft?.planId;

  const [priest, setPriest] = useState<Priest | null>(null);
  const [events, setEvents] = useState<PujaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking Form State - restored from existing draft if available
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [slotInfos, setSlotInfos] = useState<SlotAvailabilityInfo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [includeSamagri, setIncludeSamagri] = useState<boolean>(true);

  // Address & Notes
  const [address, setAddress] = useState({
    street: 'Flat 402, Shanti Nilayam Apartments',
    area: 'Indiranagar 12th Main',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038'
  });
  const [notes, setNotes] = useState('Kashyapa Gotra. Please bring complete Homa Kundam and dry coconut offerings.');

  useEffect(() => {
    const load = async () => {
      if (!effectivePriestId) return;
      setLoading(true);
      try {
        const [priestData, allEvents] = await Promise.all([
          priestService.getPriestById(effectivePriestId),
          eventService.getEvents()
        ]);
        setPriest(priestData || null);
        setEvents(allEvents);

        // Check if we have an existing draft for this priest to preserve form state
        if (draft && draft.priestId === effectivePriestId) {
          if (draft.serviceId) setSelectedServiceId(draft.serviceId);
          if (draft.date) setSelectedDate(draft.date);
          if (draft.time || draft.timeSlot) setSelectedSlot(draft.time || draft.timeSlot || '');
          if (typeof draft.includeSamagri === 'boolean') setIncludeSamagri(draft.includeSamagri);
          if (draft.location && typeof draft.location === 'object') {
            setAddress({
              street: draft.location.street || '',
              area: draft.location.area || '',
              city: draft.location.city || '',
              state: draft.location.state || 'Karnataka',
              pincode: draft.location.pincode || ''
            });
          }
          if (draft.notes || draft.specialNotes) {
            setNotes(draft.notes || draft.specialNotes || '');
          }
        } else {
          // Otherwise, check URL query params or defaults
          const paramService = searchParams.get('service');
          const paramDate = searchParams.get('date');
          const paramSlot = searchParams.get('slot');

          if (paramService) {
            setSelectedServiceId(paramService);
          } else if (priestData && priestData.services.length > 0) {
            setSelectedServiceId(priestData.services[0].id);
          }

          if (paramDate) {
            setSelectedDate(paramDate);
          } else {
            setSelectedDate(getTodayDateString());
          }

          const slots = priestData?.availableTimeSlots || priestData?.timeSlots || [];
          if (paramSlot) {
            setSelectedSlot(paramSlot);
          } else if (slots.length > 0) {
            setSelectedSlot(slots[0]);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [priestId]);

  // Load real-time slot availability whenever selectedDate, priest, or selectedServiceId changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!priest?.id || !selectedDate) {
        setSlotInfos([]);
        return;
      }

      setLoadingSlots(true);
      try {
        const selectedSrv = priest.services.find(s => s.id === selectedServiceId);
        const slots = await priestService.getPriestAvailableSlotsForDate(
          priest.id,
          selectedDate,
          selectedSrv?.eventId
        );
        setSlotInfos(slots);

        // If currently selected slot is booked or not available, re-select
        if (selectedSlot) {
          const matched = slots.find(s => s.slot.toLowerCase().replace(/\s+/g, '') === selectedSlot.toLowerCase().replace(/\s+/g, ''));
          if (!matched || !matched.isAvailable) {
            const firstAvail = slots.find(s => s.isAvailable);
            setSelectedSlot(firstAvail ? firstAvail.slot : '');
          }
        } else {
          const firstAvail = slots.find(s => s.isAvailable);
          if (firstAvail) {
            setSelectedSlot(firstAvail.slot);
          }
        }
      } catch (err) {
        console.error('Error fetching real-time slots:', err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [priest?.id, selectedDate, selectedServiceId]);

  if (loading) {
    return <LoadingState message="Preparing booking configuration..." fullHeight />;
  }

  if (!priest) {
    return (
      <ErrorState
        title="Priest Not Available"
        message="Could not find the priest selected for booking."
        onRetry={() => navigate('/priests')}
      />
    );
  }

  const selectedService = priest.services.find(s => s.id === selectedServiceId) || priest.services[0];
  const servicePrice = selectedService ? selectedService.price : priest.startingPrice;
  const platformFee = 250;
  const totalAmount = servicePrice + platformFee;

  const handleProceedToSummary = async () => {
    // 1. Validate Priest
    if (!priest) {
      error('Please select a valid priest.');
      return;
    }

    // 2. Validate Event / Service
    if (!selectedService) {
      error('Please select a puja ceremony or service.');
      return;
    }

    // 3. Validate Date
    if (!selectedDate || selectedDate.trim() === '') {
      error('Please select an auspicious ceremony date.');
      return;
    }

    // 4. Validate Time Slot
    if (!selectedSlot || selectedSlot.trim() === '') {
      error('Please select a muhurtham time slot.');
      return;
    }

    // 5. Pre-check real-time slot availability before proceeding
    const check = await priestService.checkSlotAvailability(
      priest.id,
      selectedDate,
      selectedSlot,
      selectedService.eventId
    );

    if (!check.available) {
      error(check.reason || 'This time slot is unavailable or already booked. Please choose another slot.');
      return;
    }

    // 6. Validate Location
    if (!address.street.trim()) {
      error('Please enter the venue / street address.');
      return;
    }
    if (!address.area.trim()) {
      error('Please enter the area / locality.');
      return;
    }
    if (!address.city.trim()) {
      error('Please enter the city for the ceremony.');
      return;
    }
    if (!address.pincode.trim()) {
      error('Please enter a valid pincode.');
      return;
    }

    // Match Event
    const matchedEvent = events.find(e => e.id === selectedService?.eventId) || events[0];

    // Save complete booking draft state
    setDraft({
      customerId: currentUser?.id || '',
      customerName: currentUser?.name || 'Devotee',
      customerPhone: currentUser?.phone || '',
      customerEmail: currentUser?.email || '',
      priestId: priest.id,
      priestName: priest.name,
      priestImage: priest.avatarUrl,
      priestAvatar: priest.avatarUrl,
      priestTitle: priest.title,
      priestRating: priest.rating,
      priestReviewCount: priest.reviewCount,
      priestExperienceYears: priest.experienceYears,
      priestIsVerified: priest.isVerified,
      priestLanguages: priest.languages,
      eventId: selectedService.eventId || matchedEvent?.id || 'evt-1',
      eventName: matchedEvent?.name || selectedService.name || 'Puja Ceremony',
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      serviceDescription: selectedService.description,
      servicePrice: servicePrice,
      serviceCharge: servicePrice,
      includeSamagri,
      samagriPrice: includeSamagri ? 1500 : 0,
      date: selectedDate,
      time: selectedSlot,
      timeSlot: selectedSlot,
      location: {
        street: address.street.trim(),
        area: address.area.trim(),
        city: address.city.trim(),
        state: address.state.trim() || 'Karnataka',
        pincode: address.pincode.trim(),
        fullAddress: `${address.street.trim()}, ${address.area.trim()}, ${address.city.trim()} - ${address.pincode.trim()}`
      },
      notes: notes.trim(),
      specialNotes: notes.trim(),
      platformFee,
      totalAmount,
      planId: planIdParam || undefined
    });

    // Navigate to Booking Summary (does NOT create booking yet)
    navigate('/booking-summary');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
          <Link to={`/priests/${priest.id}`} className="hover:text-[#701a28] flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Priest Profile
          </Link>
          <span>/</span>
          <span className="text-[#701a28] font-semibold">Step 1: Booking Details</span>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#701a28] block mb-1">
          Auspicious Booking Flow
        </span>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
          Book Puja Ceremony
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
          Select ritual, auspicious muhurtham, and ceremony location with Acharya {priest.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Form Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Linked AI Ceremony Plan Notice */}
          {planIdParam && (
            <div className="bg-[#701a28]/5 border border-[#701a28]/20 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#701a28] text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-[#e5b869]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#701a28] uppercase tracking-wider">
                    Linked AI Ceremony Plan Active
                  </h4>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Your ritual notes, Vedic preferences, and samagri requirements have been pre-filled from your plan.
                  </p>
                </div>
              </div>
              <Link
                to={`/ceremony-planner?planId=${planIdParam}`}
                className="text-xs text-[#701a28] font-bold hover:underline shrink-0 hidden sm:inline"
              >
                View Plan Details
              </Link>
            </div>
          )}

          {/* 1. Priest Overview Header Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-4 shadow-xs">
            <Avatar src={priest.avatarUrl} name={priest.name} size="xl" className="rounded-xl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900 text-base sm:text-lg truncate">
                  {priest.name}
                </h3>
                {priest.isVerified && (
                  <CheckCircle className="w-4 h-4 text-emerald-600 fill-emerald-100 shrink-0" />
                )}
              </div>
              <p className="text-xs text-[#701a28] font-medium truncate">{priest.title}</p>
              <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
                <span>{priest.experienceYears}+ yrs exp</span>
                <span>•</span>
                <span>{priest.location}, {priest.city}</span>
              </div>
            </div>
          </div>

          {/* 2. Select Puja / Ritual Service */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-xs">
            <h2 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#701a28]" />
              1. Select Ceremony / Service
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {priest.services.map((srv) => {
                const isSelected = selectedServiceId === srv.id;
                return (
                  <div
                    key={srv.id}
                    onClick={() => setSelectedServiceId(srv.id)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#701a28] bg-[#fdf2f4] ring-1 ring-[#701a28]'
                        : 'border-stone-200 hover:border-[#701a28]/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-stone-900">{srv.name}</h4>
                        <span className="font-extrabold text-xs text-[#701a28]">{formatCurrency(srv.price)}</span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2">{srv.description}</p>
                    </div>
                    <span className="text-[11px] text-stone-500 mt-2 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-[#701a28]" /> {srv.duration}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Auspicious Date & Time Slot */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5 shadow-xs">
            <h2 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#701a28]" />
              2. Select Date & Auspicious Muhurtham
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Calendar
                  selectedDate={selectedDate}
                  onSelectDate={(d) => setSelectedDate(d)}
                  availableDates={priest.availableDates}
                  blockedDates={priest.blockedDates}
                  minDate={getTodayDateString()}
                />
              </div>

              <div className="space-y-4">
                <TimeSlotPicker
                  slotInfos={slotInfos}
                  selectedSlot={selectedSlot}
                  onSelectSlot={(s) => setSelectedSlot(s)}
                  isLoading={loadingSlots}
                />

                {selectedDate && selectedSlot && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Auspicious Window Selected
                    </div>
                    <p className="text-emerald-800">
                      {selectedDate} at <strong>{selectedSlot}</strong> (Verified available on Acharya's real-time schedule)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Ceremony Venue & Family Details */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-xs">
            <h2 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#701a28]" />
              3. Ceremony Location & Sankalpam Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="House / Flat / Venue Name *"
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                placeholder="e.g. Flat 402, Shanti Nilayam Apartments"
                required
              />
              <Input
                label="Area / Street / Locality *"
                value={address.area}
                onChange={(e) => setAddress({ ...address, area: e.target.value })}
                placeholder="e.g. Indiranagar 12th Main"
                required
              />
              <Input
                label="City *"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                placeholder="e.g. Bengaluru"
                required
              />
              <Input
                label="Pincode *"
                value={address.pincode}
                onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                placeholder="e.g. 560038"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                Special Notes, Family Gotra & Nakshatra (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Mention Gotra, Nakshatra, or any special ritual requests..."
                className="w-full text-xs text-stone-900 bg-white border border-[#eadfd9] rounded-xl p-3 outline-none focus:border-[#701a28] focus:ring-1 focus:ring-[#701a28]"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Preview & Continue CTA */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-[#eadfd9] p-6 shadow-md sticky top-24 space-y-6">
            <h3 className="font-heading text-lg font-bold text-stone-900 pb-3 border-b border-stone-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#701a28]" />
              Booking Details
            </h3>

            {/* Summary Item Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Priest:</span>
                <span className="font-bold text-stone-900">{priest.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Ceremony:</span>
                <span className="font-bold text-stone-900">{selectedService?.name || 'Not selected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Date:</span>
                <span className="font-bold text-stone-900">{selectedDate || 'Not selected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Muhurtham:</span>
                <span className="font-bold text-stone-900">{selectedSlot || 'Not selected'}</span>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Service Charge:</span>
                <span className="font-semibold text-stone-900">{formatCurrency(servicePrice)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Platform Fee:</span>
                <span className="font-semibold text-stone-900">{formatCurrency(platformFee)}</span>
              </div>

              <div className="flex justify-between text-base font-extrabold text-stone-900 pt-3 border-t border-stone-100">
                <span>Total Amount:</span>
                <span className="text-[#701a28] font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Trust badge */}
            <div className="bg-[#faf8f5] p-3 rounded-xl border border-[#eadfd9] text-[11px] text-stone-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Shastra Compliant Seva</span>
              </div>
              <p className="text-stone-500">
                Free cancellation up to 24 hours prior to muhurtham time.
              </p>
            </div>

            {/* Action CTA Button */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              rightIcon={<ArrowRight className="w-5 h-5" />}
              onClick={handleProceedToSummary}
            >
              Continue to Summary
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

