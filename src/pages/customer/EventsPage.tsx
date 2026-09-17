import React, { useEffect, useState } from 'react';
import { eventService } from '../../services/eventService';
import { PujaEvent } from '../../types';
import { EventCard } from '../../components/EventCard';
import { LoadingState } from '../../components/LoadingState';
import { Input } from '../../components/Input';
import { Search, Flame, Sparkles } from 'lucide-react';

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<PujaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const data = await eventService.getEvents();
        setEvents(data);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const categories = [
    'All',
    'Home & Property',
    'Lifecycle Ceremonies',
    'Vratam & Festivities',
    'Special Pujas',
    'Ritual & Shanti'
  ];

  const filteredEvents = events.filter((evt) => {
    if (!evt.isActive) return false;
    const matchesSearch =
      evt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || evt.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <LoadingState message="Loading auspicious Puja categories..." fullHeight />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 bg-[#fdf2f4] text-[#701a28] border border-[#f5ccd2] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5 text-[#701a28] fill-[#701a28]" />
          <span>Vedic Sanskars & Pujas</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900">
          Sacred Puja Ceremonies Catalog
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          From life milestone samskaras to property blessings and daily homas,
          discover authentic rituals conducted by verified purohits.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#701a28] text-white shadow-xs'
                  : 'bg-[#faf8f5] text-stone-700 hover:bg-[#f3efe8] border border-[#eadfd9]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="w-full md:w-72">
          <Input
            placeholder="Search puja by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#eadfd9]">
          <Sparkles className="w-8 h-8 text-[#e5b869] mx-auto mb-2" />
          <p className="font-bold text-stone-800">No events matched your search.</p>
          <p className="text-xs text-stone-500 mt-1">Try clearing filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
};
