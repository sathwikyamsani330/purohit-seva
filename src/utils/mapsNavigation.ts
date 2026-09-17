import { BookingAddress } from '../types';

/**
 * Known geographic coordinates for major Indian localities and cities to ensure
 * highly accurate destination routing when exact GPS was not acquired.
 */
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  whitefield: { lat: 12.9698, lng: 77.7499 },
  indiranagar: { lat: 12.9784, lng: 77.6408 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  'banjara hills': { lat: 17.4156, lng: 78.4357 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  mylapore: { lat: 13.0339, lng: 80.2690 },
  'delhi ncr': { lat: 28.6139, lng: 77.2090 },
  gurugram: { lat: 28.4595, lng: 77.0266 },
  pune: { lat: 18.5204, lng: 73.8567 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  varanasi: { lat: 25.3176, lng: 82.9739 }
};

/**
 * Resolves or estimates coordinates for a given address
 */
export function resolveCoordinates(
  address?: BookingAddress | string | null,
  coords?: { latitude?: number; longitude?: number } | null
): { latitude?: number; longitude?: number } | null {
  if (coords?.latitude && coords?.longitude) {
    return { latitude: coords.latitude, longitude: coords.longitude };
  }

  if (typeof address === 'object' && address !== null) {
    if (address.latitude && address.longitude) {
      return { latitude: address.latitude, longitude: address.longitude };
    }

    const cityKey = (address.city || '').trim().toLowerCase();
    const areaKey = (address.area || '').trim().toLowerCase();

    if (CITY_COORDINATES[areaKey]) {
      return { latitude: CITY_COORDINATES[areaKey].lat, longitude: CITY_COORDINATES[areaKey].lng };
    }
    if (CITY_COORDINATES[cityKey]) {
      return { latitude: CITY_COORDINATES[cityKey].lat, longitude: CITY_COORDINATES[cityKey].lng };
    }
  }

  if (typeof address === 'string') {
    const lower = address.toLowerCase();
    for (const [key, val] of Object.entries(CITY_COORDINATES)) {
      if (lower.includes(key)) {
        return { latitude: val.lat, longitude: val.lng };
      }
    }
  }

  return null;
}

/**
 * Formats a booking address into a complete, human-readable address line
 */
export function formatFullAddress(
  address?: BookingAddress | string | null,
  fallback = 'Ceremony Venue Address'
): string {
  if (!address) return fallback;

  if (typeof address === 'string') {
    return address.trim() || fallback;
  }

  if (address.fullAddress && address.fullAddress.trim() !== '') {
    return address.fullAddress.trim();
  }

  const parts: string[] = [];
  if (address.houseNumber) parts.push(address.houseNumber.trim());
  if (address.street) parts.push(address.street.trim());
  if (address.area) parts.push(address.area.trim());
  if (address.landmark) parts.push(`(Near ${address.landmark.trim()})`);
  if (address.city) parts.push(address.city.trim());
  if (address.state) parts.push(address.state.trim());
  if (address.pincode) parts.push(address.pincode.trim());

  return parts.length > 0 ? parts.join(', ') : fallback;
}

/**
 * Generates the universal Google Maps Navigation URL.
 * Supports coordinates (lat,lng) with priority, or encoded full address as fallback.
 * Works across desktop browsers and native mobile Google Maps apps on Android and iOS.
 */
export function getGoogleMapsNavigationUrl(
  address?: BookingAddress | string | null,
  coords?: { latitude?: number; longitude?: number } | null
): string {
  const resolved = resolveCoordinates(address, coords);

  if (resolved?.latitude && resolved?.longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${resolved.latitude},${resolved.longitude}&travelmode=driving`;
  }

  const fullAddress = formatFullAddress(address, '');
  if (fullAddress) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}&travelmode=driving`;
  }

  // Generic fallback to Google Maps search
  return 'https://www.google.com/maps';
}

/**
 * Opens Google Maps Navigation in a new tab / native application
 */
export function openGoogleMapsNavigation(
  address?: BookingAddress | string | null,
  coords?: { latitude?: number; longitude?: number } | null
): void {
  const url = getGoogleMapsNavigationUrl(address, coords);
  window.open(url, '_blank', 'noopener,noreferrer');
}
