import React, { useState } from 'react';
import { Search, MapPin, Sparkles, X } from 'lucide-react';
import { CITIES_LIST } from '../utils';

export interface SearchBarProps {
  initialQuery?: string;
  initialCity?: string;
  onSearch: (query: string, city: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialQuery = '',
  initialCity = 'All Cities',
  onSearch,
  placeholder = 'Search by priest name, puja (e.g. Gruhapravesham), or tradition...',
  className = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim(), city);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white rounded-2xl p-2 md:p-2.5 shadow-xl border border-[#eadfd9] flex flex-col md:flex-row gap-2 items-stretch md:items-center ${className}`}
    >
      {/* Search Input */}
      <div className="flex-1 flex items-center gap-2.5 px-3 py-1.5 min-h-[44px]">
        <Search className="w-5 h-5 text-[#701a28] shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
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

      {/* Divider */}
      <div className="hidden md:block w-px h-8 bg-[#eadfd9]" />

      {/* City Selector */}
      <div className="flex items-center gap-2 px-3 py-1.5 min-w-[180px] bg-[#faf8f5] md:bg-transparent rounded-xl">
        <MapPin className="w-4 h-4 text-stone-500 shrink-0" />
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-stone-800 outline-none cursor-pointer"
        >
          {CITIES_LIST.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Search Action Button */}
      <button
        type="submit"
        className="bg-[#701a28] hover:bg-[#59131e] text-white font-bold text-sm px-6 py-2.5 rounded-xl transition shadow-md shadow-[#701a28]/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
      >
        <Sparkles className="w-4 h-4 text-[#e5b869]" />
        <span>Search</span>
      </button>
    </form>
  );
};
