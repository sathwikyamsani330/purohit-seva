import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { priestService } from '../../services/priestService';
import { eventService } from '../../services/eventService';
import { bookingService } from '../../services/bookingService';
import { Priest, PujaEvent, Booking } from '../../types';
import { SearchBar } from '../../components/SearchBar';
import { PriestCard } from '../../components/PriestCard';
import { EventCard } from '../../components/EventCard';
import { BookingCard } from '../../components/BookingCard';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import {
  Sparkles,
  Calendar,
  MapPin,
  Flame,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ListChecks
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<PujaEvent[]>([]);
  const [recommendedPriests, setRecommendedPriests] = useState<Priest[]>([]);
  const [nearbyPriests, setNearbyPriests] = useState<Priest[]>([]);
  const [upcomingBooking, setUpcomingBooking] = useState<Booking | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [allEvents, allPriests, bookings] = await Promise.all([
          eventService.getEvents(),
          priestService.getPriests(),
          bookingService.getCustomerBookings(currentUser?.id || '')
        ]);

        setEvents(allEvents);
        setRecommendedPriests(allPriests.slice(0, 4));

        // Filter nearby based on user city (e.g. Bengaluru)
        const userCity = currentUser?.city || 'Bengaluru';
        const nearby = allPriests.filter(p => p.city.toLowerCase() === userCity.toLowerCase());
        setNearbyPriests(nearby.length > 0 ? nearby.slice(0, 2) : allPriests.slice(2, 4));

        const upcoming = bookings.find(b => b.status === 'confirmed' || b.status === 'pending');
        setUpcomingBooking(upcoming || null);
        setRecentBookings(bookings.slice(0, 3));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const handleSearch = (query: string, city: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (city && city !== 'All Cities') params.set('city', city);
    navigate(`/priests?${params.toString()}`);
  };

  if (loading) {
    return <LoadingState message="Loading your personalized Vedic dashboard..." fullHeight />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* 1. GREETING & HERO SEARCH */}
      <section className="bg-gradient-to-r from-[#701a28] via-[#54131e] to-[#200609] rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden border border-[#8c2433]/30">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#e5b869]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#701a28]/60 border border-[#f5ccd2]/30 px-3 py-1 rounded-full text-xs font-semibold text-[#f5ccd2]">
            <Sparkles className="w-3.5 h-3.5 text-[#e5b869]" />
            <span>Namaste & Welcome</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Namaskaram, {currentUser?.name || 'Devotee'}
          </h1>

          <p className="text-xs sm:text-sm text-stone-200 max-w-xl leading-relaxed">
            Ready to organize your upcoming puja, homa, or wedding sanskar? Find trusted acharyas in{' '}
            <strong className="text-[#e5b869]">{currentUser?.city || 'Bengaluru'}</strong> with authentic Vedic guidance.
          </p>

          <div className="pt-2">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* 2. UPCOMING BOOKING ALERT CARD (IF ANY) */}
      {upcomingBooking && (
        <section className="bg-white border border-[#eadfd9] rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#701a28] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#701a28]/20">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#701a28] block">
                  Your Next Scheduled Puja
                </span>
                <h3 className="font-bold text-[#22060a] text-lg">
                  {upcomingBooking.eventName}
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  With <strong className="text-[#22060a]">{upcomingBooking.priestName}</strong> on{' '}
                  <strong className="text-[#22060a]">{upcomingBooking.date}</strong> at{' '}
                  <strong className="text-[#22060a]">{upcomingBooking.timeSlot}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link to={`/bookings/${upcomingBooking.id}`}>
                <Button variant="primary" size="sm">
                  View Booking Details
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 2B. AI CEREMONY PLANNER PROMINENT FEATURE ENTRY */}
      <section className="bg-gradient-to-br from-[#faf7f2] via-white to-[#f5eee6] border border-[#eadfd9] rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-[#701a28]/10 text-[#701a28] px-3 py-1 rounded-full text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#e5b869]" />
              <span>Smart Vedic Guidance</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#22060a] tracking-tight">
                AI Ceremony Planner
              </h2>
              <p className="text-sm font-semibold text-[#701a28] mt-0.5">
                Plan your ceremony with confidence.
              </p>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Unsure which rituals to perform or what samagri to gather? Tell our Vedic AI what you are celebrating. It structures a personalized vidhana sequence, interactive samagri checklist, readiness score, and prepares you to book an authentic Acharya.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-stone-700 pt-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Personalized Ritual Sequence</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Interactive Samagri Checklist</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Readiness Score & Timeline</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <Link to="/ceremony-planner">
              <Button
                variant="primary"
                size="lg"
                className="w-full bg-[#701a28] text-white hover:bg-[#54131e] font-bold text-sm shadow-md shadow-[#701a28]/25"
              >
                <Sparkles className="w-4 h-4 mr-2 text-[#e5b869]" />
                Launch Ceremony Planner
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>

            <Link to="/ceremony-planner">
              <Button
                variant="outline"
                size="md"
                className="w-full text-xs font-bold border-[#eadfd9] text-stone-700 hover:bg-stone-50"
              >
                <ListChecks className="w-3.5 h-3.5 mr-1.5 text-stone-500" />
                View Ceremony Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. EVENT CATEGORIES / POPULAR PUJAS */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#22060a]">
              Explore Puja Categories
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Choose the sacred event you wish to perform
            </p>
          </div>
          <Link to="/events">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View All
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.slice(0, 3).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {/* 4. RECOMMENDED PRIESTS */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#22060a]">
              Recommended Acharyas & Purohits
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Top rated Vedic scholars with highest devotee satisfaction
            </p>
          </div>
          <Link to="/priests">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Browse All
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendedPriests.map((priest) => (
            <PriestCard key={priest.id} priest={priest} />
          ))}
        </div>
      </section>

      {/* 5. NEARBY PRIESTS */}
      {nearbyPriests.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#701a28]" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#22060a]">
                  Priests in Your City ({currentUser?.city || 'Bengaluru'})
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Available for home visits and muhurtham dates
                </p>
              </div>
            </div>
            <Link to={`/priests?city=${currentUser?.city || 'Bengaluru'}`}>
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View City Priests
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nearbyPriests.map((priest) => (
              <PriestCard key={priest.id} priest={priest} />
            ))}
          </div>
        </section>
      )}

      {/* 6. RECENT BOOKINGS SECTION */}
      {recentBookings.length > 0 && (
        <section className="pt-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#22060a]">
                Recent Bookings History
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Quickly access past or upcoming ceremonies
              </p>
            </div>
            <Link to="/bookings">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                All Bookings
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
