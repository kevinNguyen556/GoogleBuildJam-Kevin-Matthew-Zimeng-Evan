interface GeocodeResult {
  locationName: string;
  city?: string;
  state?: string;
  country?: string;
}

// In-memory + localStorage cache
const memoryCache = new Map<string, GeocodeResult>();

// Rate limiting queue
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // Nominatim policy: 1 req/sec max

function getCacheKey(lat: number, lon: number): string {
  // Round to ~100m precision to maximize cache hits
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodeResult> {
  const cacheKey = getCacheKey(lat, lon);

  // Check memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Check localStorage cache
  try {
    const stored = localStorage.getItem(`geo_${cacheKey}`);
    if (stored) {
      const parsed = JSON.parse(stored) as GeocodeResult;
      memoryCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch {
    // Ignore storage errors
  }

  // Wait for rate limit interval
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL - timeSinceLast));
  }
  lastRequestTime = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();
    const address = data.address || {};

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.suburb ||
      address.county;
    const state = address.state || address.region;
    const country = address.country;

    let locationName = '';
    if (city && country) {
      locationName = `${city}, ${country}`;
    } else if (state && country) {
      locationName = `${state}, ${country}`;
    } else if (country) {
      locationName = country;
    } else {
      locationName = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    }

    const result: GeocodeResult = {
      locationName,
      city,
      state,
      country,
    };

    // Cache result
    memoryCache.set(cacheKey, result);
    try {
      localStorage.setItem(`geo_${cacheKey}`, JSON.stringify(result));
    } catch {
      // Ignore storage quota
    }

    return result;
  } catch (err) {
    console.warn('Reverse geocoding failed or rate limited:', err);
    // Fallback to coordinates
    const fallback: GeocodeResult = {
      locationName: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
    };
    return fallback;
  }
}
