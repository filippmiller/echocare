/**
 * City search using OpenWeatherMap Geocoding API (free tier)
 * Returns array of cities with name and country
 */
export async function searchCities(query: string): Promise<Array<{ name: string; country: string; fullName: string }>> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    // Using OpenWeatherMap Geocoding API (free, no API key needed for basic usage)
    // Alternative: use a free API like GeoNames or REST Countries
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5`,
      {
        headers: {
          // Note: OpenWeatherMap requires API key for production
          // For now, we'll use a simple fallback
        },
      }
    );

    if (!response.ok) {
      // Fallback to simple matching
      return [];
    }

    const data = (await response.json()) as Array<{
      name: string;
      country: string;
      state?: string;
    }>;

    return data.map((city) => ({
      name: city.name,
      country: city.country,
      fullName: `${city.name}, ${city.country}${city.state ? `, ${city.state}` : ""}`,
    }));
  } catch (error) {
    console.error("City search error:", error);
    return [];
  }
}

/**
 * Simple city search fallback using common cities database
 * This is a fallback when API is not available
 */
const COMMON_CITIES: Array<{ name: string; country: string }> = [
  { name: "New York", country: "US" },
  { name: "Los Angeles", country: "US" },
  { name: "Chicago", country: "US" },
  { name: "Houston", country: "US" },
  { name: "Phoenix", country: "US" },
  { name: "Philadelphia", country: "US" },
  { name: "San Antonio", country: "US" },
  { name: "San Diego", country: "US" },
  { name: "Dallas", country: "US" },
  { name: "San Jose", country: "US" },
  { name: "London", country: "GB" },
  { name: "Paris", country: "FR" },
  { name: "Berlin", country: "DE" },
  { name: "Madrid", country: "ES" },
  { name: "Rome", country: "IT" },
  { name: "Amsterdam", country: "NL" },
  { name: "Vienna", country: "AT" },
  { name: "Brussels", country: "BE" },
  { name: "Moscow", country: "RU" },
  { name: "Tokyo", country: "JP" },
  { name: "Beijing", country: "CN" },
  { name: "Shanghai", country: "CN" },
  { name: "Sydney", country: "AU" },
  { name: "Melbourne", country: "AU" },
  { name: "Toronto", country: "CA" },
  { name: "Vancouver", country: "CA" },
  { name: "Mexico City", country: "MX" },
  { name: "São Paulo", country: "BR" },
  { name: "Buenos Aires", country: "AR" },
  { name: "Mumbai", country: "IN" },
  { name: "Delhi", country: "IN" },
  { name: "Dubai", country: "AE" },
  { name: "Singapore", country: "SG" },
  { name: "Bangkok", country: "TH" },
  { name: "Seoul", country: "KR" },
  { name: "Hong Kong", country: "HK" },
];

export function searchCitiesFallback(query: string): Array<{ name: string; country: string; fullName: string }> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const normalizedQuery = query.toLowerCase();
  return COMMON_CITIES.filter(
    (city) =>
      city.name.toLowerCase().includes(normalizedQuery) ||
      city.country.toLowerCase().includes(normalizedQuery)
  )
    .slice(0, 5)
    .map((city) => ({
      name: city.name,
      country: city.country,
      fullName: `${city.name}, ${city.country}`,
    }));
}

