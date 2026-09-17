import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { priestService } from '../../services/priestService';
import { eventService } from '../../services/eventService';
import { Priest, PujaEvent } from '../../types';
import { PriestCard } from '../../components/PriestCard';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { CITIES_LIST, LANGUAGES_LIST, TRADITIONS_LIST, getTodayDateString } from '../../utils';
import {
  Search,
  Filter,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  Star,
  Award,
  Sparkles,
  X,
  Calendar as CalendarIcon
} from 'lucide-react';

export const PriestSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [priests, setPriests] = useState<Priest[]>([]);
  const [events, setEvents] = useState<PujaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filter States
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [city, setCity] = useState(searchParams.get('city') || 'All Cities');
  const [filterDate, setFilterDate] = useState(searchParams.get('date') || '');
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get('event') || 'All');
  const [selectedLanguage, setSelectedLanguage] = useState(searchParams.get('lang') || 'All');
  const [selectedTradition, setSelectedTradition] = useState('All');
  const [minRating, setMinRating] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(15000);
  const [minExp, setMinExp] = useState<number>(0);

  useEffect(() => {
    const loadData = async () => {
      const allEvents = await eventService.getEvents();
      setEvents(allEvents);
    };
    loadData();
  }, []);

  useEffect(() => {
    const fetchPriests = async () => {
      setLoading(true);
      try {
        const filters: any = {};
        if (query) filters.searchQuery = query;
        if (city && city !== 'All Cities') filters.city = city;
        if (selectedEventId && selectedEventId !== 'All') filters.eventId = selectedEventId;
        if (selectedLanguage && selectedLanguage !== 'All') filters.language = selectedLanguage;
        if (selectedTradition && selectedTradition !== 'All') filters.tradition = selectedTradition;
        if (minRating > 0) filters.minRating = minRating;
        if (maxPrice < 15000) filters.maxPrice = maxPrice;
        if (minExp > 0) filters.minExperience = minExp;

        let data = await priestService.getPriests(filters);

        // Filter by date availability if specified
        if (filterDate) {
          data = data.filter(p => {
            if (p.blockedDates && p.blockedDates.includes(filterDate)) {
              return false;
            }
            if (p.availableDates && p.availableDates.length > 0) {
              return p.availableDates.includes(filterDate);
            }
            return true;
          });
        }

        setPriests(data);
      } finally {
        setLoading(false);
      }
    };
    fetchPriests();
  }, [query, city, filterDate, selectedEventId, selectedLanguage, selectedTradition, minRating, maxPrice, minExp]);

  const handleResetFilters = () => {
    setQuery('');
    setCity('All Cities');
    setFilterDate('');
    setSelectedEventId('All');
    setSelectedLanguage('All');
    setSelectedTradition('All');
    setMinRating(0);
    setMaxPrice(15000);
    setMinExp(0);
    setSearchParams({});
  };

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#701a28]" />
          Filter Priests
        </h3>
        <button
          type="button"
          onClick={handleResetFilters}
          className="text-xs text-[#701a28] hover:text-[#59131e] font-semibold flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Location / City */}
      <div>
        <label className="text-xs font-semibold text-stone-700 block mb-1.5 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-stone-400" />
          City / Region
        </label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full text-xs font-medium bg-[#faf8f5] border border-[#eadfd9] rounded-xl px-3 py-2 text-stone-800 outline-none focus:border-[#701a28]"
        >
          {CITIES_LIST.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Available on Date */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
            Available on Ceremony Date
          </label>
          <button
            type="button"
            onClick={() => setFilterDate(getTodayDateString())}
            className="text-[10px] font-bold text-[#701a28] hover:text-[#54131e] cursor-pointer"
          >
            Set Today
          </button>
        </div>
        <input
          type="date"
          min={getTodayDateString()}
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="w-full text-xs font-medium bg-[#faf8f5] border border-[#eadfd9] rounded-xl px-3 py-2 text-stone-800 outline-none focus:border-[#701a28]"
        />
      </div>

      {/* Puja Event */}
      <div>
        <label className="text-xs font-semibold text-stone-700 block mb-1.5">
          Specific Puja / Ceremony
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full text-xs font-medium bg-[#faf8f5] border border-[#eadfd9] rounded-xl px-3 py-2 text-stone-800 outline-none focus:border-[#701a28]"
        >
          <option value="All">All Puja Types</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {/* Language */}
      <div>
        <label className="text-xs font-semibold text-stone-700 block mb-1.5">
          Spoken Language
        </label>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="w-full text-xs font-medium bg-[#faf8f5] border border-[#eadfd9] rounded-xl px-3 py-2 text-stone-800 outline-none focus:border-[#701a28]"
        >
          <option value="All">All Languages</option>
          {LANGUAGES_LIST.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* Tradition */}
      <div>
        <label className="text-xs font-semibold text-stone-700 block mb-1.5">
          Sampradaya / Tradition
        </label>
        <select
          value={selectedTradition}
          onChange={(e) => setSelectedTradition(e.target.value)}
          className="w-full text-xs font-medium bg-[#faf8f5] border border-[#eadfd9] rounded-xl px-3 py-2 text-stone-800 outline-none focus:border-[#701a28]"
        >
          <option value="All">All Traditions</option>
          {TRADITIONS_LIST.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Minimum Rating */}
      <div>
        <label className="text-xs font-semibold text-stone-700 block mb-1.5 flex items-center justify-between">
          <span>Minimum Rating</span>
          <span className="text-[#701a28] font-bold">{minRating > 0 ? `${minRating} ★ & above` : 'Any'}</span>
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 4.0, 4.5, 4.8].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setMinRating(r)}
              className={`py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                minRating === r
                  ? 'bg-[#701a28] text-white border-[#701a28] shadow-xs'
                  : 'bg-[#faf8f5] text-stone-700 border-[#eadfd9] hover:bg-[#f8eee8]'
              }`}
            >
              {r === 0 ? 'All' : `${r}★`}
            </button>
          ))}
        </div>
      </div>

      {/* Minimum Experience */}
      <div>
        <label className="text-xs font-semibold text-stone-700 block mb-1.5 flex items-center justify-between">
          <span>Experience Level</span>
          <span className="text-stone-900 font-bold">{minExp > 0 ? `${minExp}+ Years` : 'Any'}</span>
        </label>
        <input
          type="range"
          min="0"
          max="25"
          step="5"
          value={minExp}
          onChange={(e) => setMinExp(Number(e.target.value))}
          className="w-full accent-[#701a28] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-stone-400 mt-1">
          <span>Any</span>
          <span>5+ yrs</span>
          <span>15+ yrs</span>
          <span>25+ yrs</span>
        </div>
      </div>

      {/* Max Price Range */}
      <div>
        <label className="text-xs font-semibold text-stone-700 block mb-1.5 flex items-center justify-between">
          <span>Max Starting Dakshina</span>
          <span className="text-stone-900 font-bold">₹{maxPrice.toLocaleString('en-IN')}</span>
        </label>
        <input
          type="range"
          min="2000"
          max="15000"
          step="1000"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#701a28] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-stone-400 mt-1">
          <span>₹2,000</span>
          <span>₹8,000</span>
          <span>₹15,000+</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#22060a]">
            Find & Book Vedic Priests
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Discover verified acharyas by tradition, languages, experience, and reviews
          </p>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => setMobileFilterOpen(true)}
            leftIcon={<Filter className="w-4 h-4" />}
          >
            Filters {city !== 'All Cities' || selectedEventId !== 'All' ? '• Active' : ''}
          </Button>
        </div>
      </div>

      {/* Search Input on Top */}
      <div className="bg-white rounded-2xl p-3 border border-[#eadfd9] shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-[#701a28] shrink-0 ml-2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by priest name, gotra, puja type, or locality..."
          className="w-full bg-transparent text-sm text-stone-900 placeholder:text-stone-400 outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left Desktop Filter Sidebar */}
        <div className="hidden md:block md:col-span-1">
          <div className="bg-white rounded-2xl p-5 border border-[#eadfd9] shadow-xs sticky top-24">
            <FilterPanel />
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        {mobileFilterOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-[#200609]/70 backdrop-blur-xs" onClick={() => setMobileFilterOpen(false)} />
            <div className="relative w-80 max-w-full bg-white h-full p-6 z-10 overflow-y-auto ml-auto flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                  <h3 className="font-bold text-[#22060a]">Filters</h3>
                  <button onClick={() => setMobileFilterOpen(false)} className="p-1">
                    <X className="w-5 h-5 text-stone-500" />
                  </button>
                </div>
                <FilterPanel />
              </div>

              <div className="pt-6 border-t border-stone-100">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setMobileFilterOpen(false)}
                >
                  Show Results ({priests.length})
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Right Priests Results Grid */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Showing <strong className="text-stone-900 font-bold">{priests.length}</strong> available Purohits</span>
            {city !== 'All Cities' && <span className="text-[#701a28] font-semibold bg-[#fdf2f4] px-2 py-0.5 rounded-md border border-[#f5ccd2]">City: {city}</span>}
          </div>

          {loading ? (
            <LoadingState message="Finding certified priests matching your filters..." />
          ) : priests.length === 0 ? (
            <EmptyState
              title="No Priests Found"
              description="No acharyas matched your exact filter combination. Try resetting filters or choosing another city."
              actionLabel="Reset All Filters"
              onAction={handleResetFilters}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {priests.map((priest) => (
                <PriestCard key={priest.id} priest={priest} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
