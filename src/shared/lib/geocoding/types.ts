export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  address: string;
}

export interface ReverseGeocodingResult {
  displayName: string;
  address: string;
}

/**
 * Options for forward geocoding requests.
 * Note: `autocomplete` is a hint for consuming hooks to apply debounce.
 */
export interface ForwardGeocodeOptions {
  limit?: number;
  autocomplete?: boolean;
}

export interface ReverseGeocodeOptions {
  lat: number;
  lng: number;
}
