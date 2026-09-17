import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { priestService } from '../../services/priestService';
import { eventService } from '../../services/eventService';
import { Priest, PujaEvent, Review } from '../../types';
import { SearchBar } from '../../components/SearchBar';
import { PriestCard } from '../../components/PriestCard';
import { EventCard } from '../../components/EventCard';
import { Rating } from '../../components/Rating';
import { Button } from '../../components/Button';
import { MOCK_REVIEWS } from '../../data/mockData';
import {
  Flame,
  ShieldCheck,
  Award,
  Sparkles,
  CalendarCheck,
  Clock,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Star,
  Users
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [featuredPriests, setFeaturedPriests] = useState<Priest[]>([]);
  const [popularEvents, setPopularEvents] = useState<PujaEvent[]>([]);
  const [reviews] = useState<Review[]>(MOCK_REVIEWS.slice(0, 6));

  useEffect(() => {
    const load = async () => {
      const priests = await priestService.getPriests({ minRating: 4.85 });
      setFeaturedPriests(priests.slice(0, 4));

      const events = await eventService.getEvents();
      setPopularEvents(events.slice(0, 6));
    };
    load();
  }, []);

  const handleSearch = (query: string, city: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (city && city !== 'All Cities') params.set('city', city);
    navigate(`/priests?${params.toString()}`);
  };

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-10 pb-20 md:pt-16 md:pb-28 bg-gradient-to-b from-amber-100/40 via-amber-50/20 to-transparent">
        {/* Subtle decorative glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 bg-amber-100/80 border border-amber-300/80 text-amber-900 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-xs">
              <Flame className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span>India’s Most Trusted Vedic Priest Booking Network</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 tracking-tight leading-[1.15]">
              Find the Right Priest for Your{' '}
              <span className="text-amber-600 underline decoration-amber-300 decoration-wavy decoration-2">
                Sacred Occasion
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
              Book verified, experienced acharyas and purohits for Gruhapravesham, Vivaha,
              Satyanarayana Vratam, and customized home pujas with complete peace of mind.
            </p>

            {/* Hero Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link to="/priests">
                <Button variant="gold" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Find a Priest
                </Button>
              </Link>
              <Link to="/events">
                <Button variant="outline" size="lg">
                  Explore Puja Events
                </Button>
              </Link>
            </div>

            {/* Trust Metrics */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-stone-600 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Background Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>4.9/5 Rating (2,500+ Pujas)</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Authentic Shastric Parampara</span>
              </div>
            </div>
          </div>

          {/* Search Box Card */}
          <div className="mt-12 max-w-4xl mx-auto">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* 2. POPULAR EVENTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Auspicious Rites & Ceremonies</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
              Popular Puja Events
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Select your upcoming sacred milestone to view specialized priests and rituals
            </p>
          </div>

          <Link to="/events">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View All 9 Events
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularEvents.map((evt) => (
            <EventCard key={evt.id} event={evt} />
          ))}
        </div>
      </section>

      {/* 3. FEATURED PRIESTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
              <Award className="w-4 h-4" />
              <span>Learned Acharyas</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
              Featured Verified Priests
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Highly rated acharyas with rigorous Gurukula training across regional traditions
            </p>
          </div>

          <Link to="/priests">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Browse All Priests
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {featuredPriests.map((priest) => (
            <PriestCard key={priest.id} priest={priest} />
          ))}
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="bg-amber-950 text-amber-50 py-18 px-4 sm:px-6 lg:px-8 rounded-3xl max-w-7xl mx-auto relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-mandala-pattern opacity-5" />

        <div className="relative z-10 text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400 block mb-2">
            Simple 4-Step Process
          </span>
          <h2 className="font-heading text-2xl sm:text-4xl font-bold text-white">
            How Purohit Seva Works
          </h2>
          <p className="text-xs sm:text-sm text-amber-200/80 mt-2">
            Booking an authentic Vedic ceremony at your home or venue has never been easier
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
          <div className="bg-stone-900/60 border border-amber-500/30 rounded-2xl p-6 relative">
            <div className="w-12 h-12 rounded-xl bg-amber-600 text-white font-heading font-bold text-xl flex items-center justify-center mb-4 shadow-md">
              1
            </div>
            <h3 className="font-bold text-base text-white mb-2">Choose Puja Event</h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              Select Gruhapravesham, Marriage, Satyanarayana Vratam, or any custom sanskar.
            </p>
          </div>

          <div className="bg-stone-900/60 border border-amber-500/30 rounded-2xl p-6 relative">
            <div className="w-12 h-12 rounded-xl bg-amber-600 text-white font-heading font-bold text-xl flex items-center justify-center mb-4 shadow-md">
              2
            </div>
            <h3 className="font-bold text-base text-white mb-2">Select Verified Purohit</h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              Filter by language, tradition (Smartha/Vaishnava), experience, and verified reviews.
            </p>
          </div>

          <div className="bg-stone-900/60 border border-amber-500/30 rounded-2xl p-6 relative">
            <div className="w-12 h-12 rounded-xl bg-amber-600 text-white font-heading font-bold text-xl flex items-center justify-center mb-4 shadow-md">
              3
            </div>
            <h3 className="font-bold text-base text-white mb-2">Pick Muhurtham & Date</h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              Choose your auspicious time slot and specify your location & samagri preferences.
            </p>
          </div>

          <div className="bg-stone-900/60 border border-amber-500/30 rounded-2xl p-6 relative">
            <div className="w-12 h-12 rounded-xl bg-amber-600 text-white font-heading font-bold text-xl flex items-center justify-center mb-4 shadow-md">
              4
            </div>
            <h3 className="font-bold text-base text-white mb-2">Divine, Peaceful Puja</h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              The acharya arrives with complete preparation and guides your family step by step.
            </p>
          </div>
        </div>
      </section>

      {/* 5. WHY CHOOSE PUROHIT SEVA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700 block mb-2">
            The Purohit Seva Promise
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
            Why Devout Families Trust Us
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-2">
            Combining Vedic sanctity with modern booking transparency
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-900 text-lg mb-2">100% Veda Verified Priests</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Every priest undergoes rigorous verification of credentials, Veda Pathashala certifications, and background checks.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-900 text-lg mb-2">Transparent Dakshina</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              No hidden costs or last-minute surprises. See upfront pricing for services, homa offerings, and optional samagri kits.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-900 text-lg mb-2">Complete Samagri Assistance</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Get pure, unadulterated organic puja items, dry fruits, fresh flowers, and homa wood arranged hassle-free.
            </p>
          </div>
        </div>
      </section>

      {/* 6. CUSTOMER REVIEWS */}
      <section className="bg-stone-50/90 py-16 border-y border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700 block mb-2">
              Heartfelt Testimonials
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
              Blessings from Happy Devotees
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Read authentic feedback from families who celebrated their occasions with our acharyas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Rating value={rev.rating} size="sm" />
                    <span className="text-[11px] text-stone-400">{rev.date}</span>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed italic mb-4">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-stone-900">{rev.customerName}</p>
                    <p className="text-[11px] text-amber-700 font-medium">{rev.eventName}</p>
                  </div>
                  <span className="text-[11px] text-stone-400 font-medium">{rev.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CALL TO ACTION */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 rounded-3xl p-8 sm:p-12 text-white text-center shadow-xl shadow-amber-600/20 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="font-heading text-2xl sm:text-4xl font-bold leading-tight">
              Ready to Book an Auspicious Priest for Your Home?
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
              Explore verified acharyas in your city and lock in the best muhurtham slots today.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-3">
              <Link to="/priests">
                <Button variant="secondary" size="lg">
                  Book a Priest Now
                </Button>
              </Link>
              <Link to="/events">
                <Button variant="outline" size="lg" className="bg-white/10 text-white border-white/40 hover:bg-white/20">
                  View Puja Catalog
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
