import React from 'react';
import { Link } from 'react-router-dom';
import { Priest } from '../types';
import { Avatar } from './Avatar';
import { Rating } from './Rating';
import { Badge } from './Badge';
import { Button } from './Button';
import { formatCurrency } from '../utils';
import { CheckCircle, MapPin, Award, Languages, Calendar } from 'lucide-react';

export interface PriestCardProps {
  priest: Priest;
  onBookNow?: (priest: Priest) => void;
}

export const PriestCard: React.FC<PriestCardProps> = ({ priest, onBookNow }) => {
  return (
    <div className="bg-white rounded-2xl border border-[#eadfd9] shadow-xs hover:shadow-xl transition-all duration-200 p-5 flex flex-col justify-between hover:border-[#701a28]/40 group">
      <div>
        {/* Top Info Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative shrink-0">
            <Avatar
              src={priest.avatarUrl}
              name={priest.name}
              size="xl"
              className="ring-2 ring-[#701a28]/20 group-hover:scale-105 transition-transform duration-300 rounded-xl"
            />
            {priest.isVerified && (
              <div className="w-5 h-5 bg-emerald-600 border-2 border-white rounded-full flex items-center justify-center text-white absolute -bottom-1 -right-1 shadow-xs" title="Verified Priest">
                <CheckCircle className="w-3.5 h-3.5 fill-current" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-stone-900 text-base md:text-lg truncate group-hover:text-[#701a28] transition-colors">
                {priest.name}
              </h3>
            </div>

            <p className="text-xs text-[#701a28] font-medium truncate mt-0.5">
              {priest.title}
            </p>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Rating value={priest.rating} reviewCount={priest.reviewCount} size="sm" />
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-600 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#701a28]" />
                {priest.experienceYears}+ yrs exp
              </span>
            </div>
          </div>
        </div>

        {/* Location & Languages Badges */}
        <div className="flex flex-col gap-2 py-3 border-y border-[#eadfd9] text-xs text-stone-600 mb-3">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">{priest.location}, <strong className="text-stone-800 font-semibold">{priest.city}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Languages className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <div className="flex gap-1 flex-wrap">
              {priest.languages.slice(0, 3).map((lang) => (
                <span key={lang} className="px-2 py-0.5 bg-[#faf8f5] text-[10px] font-bold text-stone-700 rounded border border-[#eadfd9]">
                  {lang}
                </span>
              ))}
              {priest.languages.length > 3 && (
                <span className="text-[11px] text-stone-400">+{priest.languages.length - 3}</span>
              )}
            </div>
          </div>

          {/* Availability summary */}
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-medium">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              {priest.availableDates && priest.availableDates.length > 0
                ? `Available: ${priest.availableDates.slice(0, 2).join(', ')}${priest.availableDates.length > 2 ? ` +${priest.availableDates.length - 2} more` : ''}`
                : 'Daily Muhurtham slots open'}
            </span>
          </div>

          {priest.badge && (
            <div className="mt-1">
              <Badge variant="gold" size="sm">
                {priest.badge}
              </Badge>
            </div>
          )}
        </div>

        {/* About Snippet */}
        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-4">
          {priest.about}
        </p>
      </div>

      {/* Bottom Pricing & Action Buttons */}
      <div className="pt-2 flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-stone-400 uppercase font-bold tracking-tight block">
            Starting from
          </span>
          <span className="text-lg font-bold text-stone-900">
            {formatCurrency(priest.startingPrice)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/priests/${priest.id}`}>
            <Button variant="outline" size="sm">
              View Profile
            </Button>
          </Link>
          <Link to={`/booking/${priest.id}`}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Calendar className="w-3.5 h-3.5" />}
              onClick={() => onBookNow && onBookNow(priest)}
            >
              Request Priest
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
