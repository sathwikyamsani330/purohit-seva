import React from 'react';
import { Link } from 'react-router-dom';
import { PujaEvent } from '../types';
import { Button } from './Button';
import { Badge } from './Badge';
import { Users, Clock, ArrowRight, Flame, Sparkles, Home, HeartHandshake, Compass, Baby, Crown, Feather, Sun } from 'lucide-react';

export interface EventCardProps {
  event: PujaEvent;
}

const getEventIcon = (name: string) => {
  switch (name) {
    case 'Home':
      return <Home className="w-5 h-5" />;
    case 'HeartHandshake':
      return <HeartHandshake className="w-5 h-5" />;
    case 'Flame':
      return <Flame className="w-5 h-5" />;
    case 'Sparkles':
      return <Sparkles className="w-5 h-5" />;
    case 'Compass':
      return <Compass className="w-5 h-5" />;
    case 'Baby':
      return <Baby className="w-5 h-5" />;
    case 'Crown':
      return <Crown className="w-5 h-5" />;
    case 'Feather':
      return <Feather className="w-5 h-5" />;
    case 'Sun':
    default:
      return <Sun className="w-5 h-5" />;
  }
};

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  return (
    <div className="bg-white rounded-2xl border border-[#eadfd9] shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between group hover:border-[#701a28]/40">
      {/* Event Header Image */}
      <div className="relative h-44 overflow-hidden bg-[#faf8f5]">
        <img
          src={event.imageUrl}
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        {/* Category Pill */}
        <div className="absolute top-3 left-3">
          <Badge variant="gold" size="sm">
            {event.category}
          </Badge>
        </div>

        {/* Icon Floating Badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
          <div className="w-9 h-9 rounded-xl bg-[#701a28]/90 backdrop-blur-xs flex items-center justify-center text-white shadow-md border border-[#f5ccd2]/30">
            {getEventIcon(event.iconName)}
          </div>
          <span className="text-xs font-semibold drop-shadow-md text-[#f5ccd2]">
            {event.basePriceRange}
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-stone-900 text-lg group-hover:text-[#701a28] transition-colors">
            {event.name}
          </h3>

          <p className="text-xs text-stone-600 mt-2 line-clamp-2 leading-relaxed">
            {event.shortDescription}
          </p>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#eadfd9] text-xs text-stone-600">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#701a28]" />
              {event.typicalDuration}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              {event.priestCount} Priests
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-5">
          <Link to={`/priests?event=${event.id}`}>
            <Button
              variant="outline"
              size="sm"
              fullWidth
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              View Available Priests
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
