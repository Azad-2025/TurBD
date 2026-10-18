// Haversine Geolocation and Distance Utilities for TurfBD

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface PopularLocation {
  id: string;
  name: string;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
}

export const BANGLADESH_PRESET_LOCATIONS: PopularLocation[] = [
  {
    id: 'gulshan-2',
    name: 'Gulshan 2 Circle',
    area: 'Gulshan',
    city: 'Dhaka',
    latitude: 23.7925,
    longitude: 90.4152,
  },
  {
    id: 'dhanmondi-27',
    name: 'Dhanmondi 27 (Old 16)',
    area: 'Dhanmondi',
    city: 'Dhaka',
    latitude: 23.7538,
    longitude: 90.3768,
  },
  {
    id: 'banani-11',
    name: 'Banani Road 11',
    area: 'Banani',
    city: 'Dhaka',
    latitude: 23.7937,
    longitude: 90.4048,
  },
  {
    id: 'mirpur-dohs',
    name: 'Mirpur DOHS Gate',
    area: 'Mirpur',
    city: 'Dhaka',
    latitude: 23.8378,
    longitude: 90.3684,
  },
  {
    id: 'uttara-sector-11',
    name: 'Uttara Sector 11 Avenue',
    area: 'Uttara',
    city: 'Dhaka',
    latitude: 23.8732,
    longitude: 90.3956,
  },
  {
    id: 'bashundhara-block-c',
    name: 'Bashundhara R/A (Block C)',
    area: 'Bashundhara',
    city: 'Dhaka',
    latitude: 23.815,
    longitude: 90.428,
  },
  {
    id: 'chattogram-gec',
    name: 'GEC Circle, Chattogram',
    area: 'GEC Circle',
    city: 'Chattogram',
    latitude: 22.3569,
    longitude: 91.8215,
  },
  {
    id: 'sylhet-zindabazar',
    name: 'Zindabazar Point, Sylhet',
    area: 'Zindabazar',
    city: 'Sylhet',
    latitude: 24.8949,
    longitude: 91.8687,
  },
];

/**
 * Calculates great-circle distance between two geographical points using the Haversine formula.
 * @returns Distance in kilometers, rounded to 1 decimal place.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }

  const R = 6371; // Mean radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

export const calculateDistanceKm = calculateHaversineDistanceKm;

/**
 * Formats distance in km or meters nicely.
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm === undefined || isNaN(distanceKm)) return '';
  if (distanceKm < 1) {
    const meters = Math.max(50, Math.round(distanceKm * 1000));
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Estimates driving time in minutes based on typical urban Bangladesh traffic speeds (~20 km/h avg).
 */
export function estimateDriveTimeMinutes(distanceKm: number): number {
  if (distanceKm <= 0) return 2;
  // 20 km/h = 3 minutes per km + 2 min buffer
  const mins = Math.round(distanceKm * 3) + 2;
  return Math.max(3, mins);
}
