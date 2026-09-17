import React from 'react';
import { BookingAddress } from '../types';
import { getGoogleMapsNavigationUrl, formatFullAddress, resolveCoordinates } from '../utils/mapsNavigation';
import { MapPin, Navigation, ExternalLink, ShieldAlert, CheckCircle2 } from 'lucide-react';

export interface CustomerLocationCardProps {
  address?: BookingAddress | string | null;
  latitude?: number;
  longitude?: number;
  customerName?: string;
  isConfirmed: boolean;
  showExactAddress?: boolean;
  compact?: boolean;
  className?: string;
}

export const CustomerLocationCard: React.FC<CustomerLocationCardProps> = ({
  address,
  latitude,
  longitude,
  customerName = 'Devotee',
  isConfirmed,
  showExactAddress = true,
  compact = false,
  className = ''
}) => {
  const coords = resolveCoordinates(address, { latitude, longitude });
  const fullAddress = formatFullAddress(address, 'Ceremony Venue Address');
  const navUrl = getGoogleMapsNavigationUrl(address, coords);

  // If booking is not confirmed or contact is hidden, show privacy protection state
  if (!isConfirmed || !showExactAddress) {
    return (
      <div className={`p-3.5 rounded-xl bg-[#faf8f5] border border-[#eadfd9] text-xs ${className}`}>
        <div className="flex items-center gap-2 text-stone-700 font-semibold mb-1">
          <MapPin className="w-4 h-4 text-[#701a28] shrink-0" />
          <span>Ceremony Location</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-stone-500 text-[11px]">
            {typeof address === 'object' && address?.city
              ? `General Area: ${address.area ? `${address.area}, ` : ''}${address.city}`
              : 'Exact service address is revealed upon payment confirmation.'}
          </p>
          <span className="text-[10px] bg-[#fdf2f4] text-[#701a28] border border-[#f5ccd2] font-bold px-2 py-0.5 rounded-md shrink-0">
            Protected
          </span>
        </div>
      </div>
    );
  }

  const handleNavigateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(navUrl, '_blank', 'noopener,noreferrer');
  };

  if (compact) {
    return (
      <div className={`p-3 rounded-xl bg-[#faf8f5] border border-[#eadfd9] ${className}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 mb-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#701a28] shrink-0" />
              <span className="truncate">Confirmed Venue</span>
              {coords && (
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                  GPS Active
                </span>
              )}
            </div>
            <p className="text-xs text-stone-700 line-clamp-2 leading-relaxed">
              {fullAddress}
            </p>
          </div>

          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleNavigateClick}
            id="navigate-to-customer-btn"
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#701a28] hover:bg-[#59131e] text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
            title={`Navigate to ${customerName}`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Navigate</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl bg-[#faf8f5] border border-[#eadfd9] shadow-xs space-y-3 ${className}`}>
      {/* Top Title & Badges */}
      <div className="flex items-center justify-between pb-2 border-b border-[#eadfd9]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#fdf2f4] text-[#701a28] flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
              Customer Confirmed Venue
            </h4>
            <p className="text-[11px] text-stone-500">Service destination for {customerName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {coords ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              GPS Coordinates Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
              Address Destination
            </span>
          )}
        </div>
      </div>

      {/* Formatted Address Details */}
      <div className="space-y-1 text-xs text-stone-800">
        <p className="font-semibold text-stone-950 text-sm leading-snug">
          {typeof address === 'object' && address?.houseNumber ? `${address.houseNumber}, ` : ''}
          {typeof address === 'object' && address?.street ? address.street : fullAddress}
        </p>

        {typeof address === 'object' && address && (
          <div className="text-stone-600 text-xs space-y-0.5">
            {address.area && <p>{address.area}</p>}
            {address.landmark && (
              <p className="text-[#701a28] font-medium italic">
                Landmark: Near {address.landmark}
              </p>
            )}
            <p>
              {address.city}{address.state ? `, ${address.state}` : ''}
              {address.pincode ? ` - ${address.pincode}` : ''}
            </p>
          </div>
        )}

        {coords && (
          <p className="text-[11px] text-stone-500 font-mono pt-1">
            Lat: {coords.latitude?.toFixed(4)}, Lng: {coords.longitude?.toFixed(4)}
          </p>
        )}
      </div>

      {/* Navigation Action CTA */}
      <div className="pt-2 border-t border-[#eadfd9] flex items-center justify-between gap-3">
        <span className="text-[11px] text-stone-500 hidden sm:inline">
          Launches Google Maps turn-by-turn navigation directly
        </span>

        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleNavigateClick}
          id="priest-portal-navigate-to-customer-cta"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#701a28] hover:bg-[#59131e] text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Navigate to Customer</span>
          <ExternalLink className="w-3 h-3 text-white/80 ml-0.5" />
        </a>
      </div>
    </div>
  );
};
