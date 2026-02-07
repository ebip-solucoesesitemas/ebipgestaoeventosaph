/**
 * Geocoding and distance calculation utilities using Nominatim (OpenStreetMap)
 */

interface GeoCoord {
  lat: number;
  lon: number;
}

/**
 * Geocode a Brazilian address using Nominatim
 */
export async function geocodeAddress(address: string): Promise<GeoCoord | null> {
  try {
    const query = encodeURIComponent(`${address}, Brasil`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=br`,
      {
        headers: {
          'User-Agent': 'APHSystem/1.0',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in km
 */
function haversineDistance(a: GeoCoord, b: GeoCoord): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const calc =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLon * sinDLon;

  const c = 2 * Math.atan2(Math.sqrt(calc), Math.sqrt(1 - calc));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate road distance between two addresses
 * Uses Haversine with 1.35x road correction factor
 * Returns one-way distance in km (multiply by 2 for round trip)
 */
export async function calculateDistanceBetweenAddresses(
  addressA: string,
  addressB: string
): Promise<number | null> {
  const [coordA, coordB] = await Promise.all([
    geocodeAddress(addressA),
    geocodeAddress(addressB),
  ]);

  if (!coordA || !coordB) return null;

  const straightLine = haversineDistance(coordA, coordB);
  const roadDistance = straightLine * 1.35; // Road correction factor

  return Math.round(roadDistance * 10) / 10; // 1 decimal place
}
