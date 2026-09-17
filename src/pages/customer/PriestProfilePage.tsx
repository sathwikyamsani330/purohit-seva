import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { priestService } from '../../services/priestService';
import { Priest, Review, SlotAvailabilityInfo } from '../../types';
import { Avatar } from '../../components/Avatar';
import { Rating } from '../../components/Rating';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Calendar } from '../../components/Calendar';
import { TimeSlotPicker } from '../../components/TimeSlotPicker';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { formatCurrency, getTodayDateString } from '../../utils';
import {
  CheckCircle,
  MapPin,
  Award,
  Languages,
  BookOpen,
  CalendarCheck,
  ShieldCheck,
  Star,
  Clock,
  ArrowRight,
  Phone,
  Flame
} from 'lucide-react';

export const PriestProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [priest, setPriest] = useState<Priest | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [slotInfos, setSlotInfos] = useState<SlotAvailabilityInfo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const loadPriest = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await priestService.getPriestById(id);
        setPriest(data || null);
        if (data) {
          const revs = await priestService.getPriestReviews(data.id);
          setReviews(revs);
          setSelectedDate(getTodayDateString());
          if (data.services && data.services.length > 0) {
            setSelectedServiceId(data.services[0].id);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    loadPriest();
  }, [id]);

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
      } catch (e) {
        console.error('Failed to load slots', e);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [priest?.id, selectedDate, selectedServiceId]);

  if (loading) {
    return <LoadingState message="Loading Acharya profile and sacred credentials..." fullHeight />;
  }

  if (!priest) {
    return (
      <ErrorState
        title="Priest Not Found"
        message="The requested priest profile does not exist or has been removed."
        onRetry={() => navigate('/priests')}
      />
    );
  }

  const handleProceedBooking = () => {
    const params = new URLSearchParams();
    if (selectedServiceId) params.set('service', selectedServiceId);
    if (selectedDate) params.set('date', selectedDate);
    if (selectedSlot) params.set('slot', selectedSlot);
    navigate(`/booking/${priest.id}?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. HERO HEADER PROFILE CARD */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
          {/* Avatar / Photo */}
          <div className="relative shrink-0 mx-auto md:mx-0">
            <Avatar
              src={priest.avatarUrl}
              name={priest.name}
              size="2xl"
              className="ring-4 ring-[#701a28]/20 shadow-lg"
            />
            {priest.isVerified && (
              <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                <CheckCircle className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>

          {/* Info Details */}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
                {priest.name}
              </h1>
              {priest.badge && (
                <Badge variant="gold" size="md">
                  {priest.badge}
                </Badge>
              )}
            </div>

            <p className="text-sm font-semibold text-[#701a28]">
              {priest.title}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-stone-600 pt-1">
              <Rating value={priest.rating} reviewCount={priest.reviewCount} size="md" />
              <span>•</span>
              <span className="flex items-center gap-1">
                <Award className="w-4 h-4 text-[#701a28]" />
                <strong>{priest.experienceYears}+ Years</strong> Experience
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-stone-400" />
                {priest.location}, <strong className="text-stone-800">{priest.city}</strong>
              </span>
            </div>

            {/* Tags: Languages, Tradition, Gotra */}
            <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
              <div className="bg-[#faf8f5] text-stone-700 border border-[#eadfd9] px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-stone-500" />
                <span>Languages: <strong>{priest.languages.join(', ')}</strong></span>
              </div>
              <div className="bg-[#fdf2f4] text-[#701a28] border border-[#f5ccd2] px-3 py-1 rounded-full text-xs font-medium">
                Tradition: <strong>{priest.tradition}</strong>
              </div>
              {priest.gotra && (
                <div className="bg-[#faf8f5] text-stone-700 border border-[#eadfd9] px-3 py-1 rounded-full text-xs font-medium">
                  Gotra: <strong>{priest.gotra}</strong>
                </div>
              )}
            </div>

            {/* Bio */}
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pt-2">
              {priest.about}
            </p>
          </div>
        </div>

        {/* Qualifications Highlight */}
        {priest.qualifications && priest.qualifications.length > 0 && (
          <div className="mt-6 pt-6 border-t border-stone-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#701a28]" />
              Gurukula & Vedic Qualifications
            </h4>
            <div className="flex flex-wrap gap-2">
              {priest.qualifications.map((q, idx) => (
                <span key={idx} className="bg-[#fdf2f4] border border-[#f5ccd2] text-[#701a28] text-xs px-3 py-1 rounded-lg">
                  ✓ {q}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. MAIN TWO-COLUMN CONTENT: SERVICES & BOOKING DATES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Services Offered & Devotee Reviews */}
        <div className="lg:col-span-2 space-y-8">
          {/* Services List */}
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading text-xl font-bold text-stone-900">
                  Services & Puja Dakshina
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Select a ritual to customize your booking
                </p>
              </div>
              <Flame className="w-5 h-5 text-[#701a28]" />
            </div>

            <div className="space-y-4">
              {priest.services.map((srv) => {
                const isSelected = selectedServiceId === srv.id;
                return (
                  <div
                    key={srv.id}
                    onClick={() => setSelectedServiceId(srv.id)}
                    className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-[#701a28] bg-[#fdf2f4] ring-1 ring-[#701a28]'
                        : 'border-[#eadfd9] hover:border-[#701a28]/50 hover:bg-[#faf8f5]'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="serviceOption"
                          checked={isSelected}
                          onChange={() => setSelectedServiceId(srv.id)}
                          className="accent-[#701a28] cursor-pointer"
                        />
                        <h3 className="font-bold text-stone-900 text-base">
                          {srv.name}
                        </h3>
                      </div>
                      <p className="text-xs text-stone-600 pl-5">
                        {srv.description}
                      </p>
                      <div className="flex items-center gap-4 pl-5 text-xs text-stone-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#701a28]" />
                          {srv.duration}
                        </span>
                        {srv.includesSamagri && (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                            Includes basic samagri guidance
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="sm:text-right pl-5 sm:pl-0 shrink-0">
                      <span className="text-xs text-stone-400 block font-semibold uppercase">Dakshina</span>
                      <span className="text-lg font-extrabold text-stone-900">
                        {formatCurrency(srv.price)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Devotee Reviews */}
          <div className="bg-white rounded-3xl border border-[#eadfd9] p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading text-xl font-bold text-stone-900">
                  Devotee Feedback & Reviews ({reviews.length})
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Real experiences from families who booked {priest.name}
                </p>
              </div>
              <Rating value={priest.rating} size="md" />
            </div>

            {reviews.length === 0 ? (
              <p className="text-xs text-stone-500 italic">No reviews yet for this priest.</p>
            ) : (
              <div className="space-y-4 divide-y divide-stone-100">
                {reviews.map((rev) => (
                  <div key={rev.id} className="pt-4 first:pt-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900">{rev.customerName}</span>
                        <span className="text-[10px] text-stone-400">• {rev.location}</span>
                      </div>
                      <Rating value={rev.rating} size="sm" showNumber={false} />
                    </div>
                    <p className="text-[11px] font-semibold text-[#701a28] mb-1">{rev.eventName}</p>
                    <p className="text-xs text-stone-600 leading-relaxed italic">"{rev.comment}"</p>
                    <span className="text-[10px] text-stone-400 block mt-1">{rev.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Booking Selector Widget Sticky Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-[#f5ccd2] p-6 shadow-md sticky top-24 space-y-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#701a28] block">
                Quick Auspicious Booking
              </span>
              <h3 className="font-heading text-lg font-bold text-stone-900 mt-0.5">
                Reserve Muhurtham Slot
              </h3>
            </div>

            {/* Calendar for Date Selection */}
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-2">
                1. Select Ceremony Date
              </label>
              <Calendar
                selectedDate={selectedDate}
                onSelectDate={(d) => setSelectedDate(d)}
                availableDates={priest.availableDates}
                blockedDates={priest.blockedDates}
                minDate={getTodayDateString()}
              />
            </div>

            {/* Time Slot Picker */}
            <div>
              <TimeSlotPicker
                slotInfos={slotInfos}
                selectedSlot={selectedSlot}
                onSelectSlot={(s) => setSelectedSlot(s)}
                title="2. Select Auspicious Muhurtham"
                isLoading={loadingSlots}
              />
            </div>

            {/* Action CTA Button */}
            <div className="pt-2 border-t border-stone-100">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                rightIcon={<ArrowRight className="w-5 h-5" />}
                onClick={handleProceedBooking}
                disabled={!selectedDate || !selectedSlot}
              >
                Request Priest
              </Button>
              <p className="text-[11px] text-stone-400 text-center mt-2">
                Priest confirms availability • Pay after acceptance
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
