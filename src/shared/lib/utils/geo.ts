export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const DEFAULT_COORDINATES: Coordinates = {
  latitude: 19.4326, // Mexico City
  longitude: -99.1332,
};

export const DEFAULT_RADIUS =
  Number(process.env.NEXT_PUBLIC_DEFAULT_RADIUS) || 25000;

export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  });
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function metersToKm(meters: number): number {
  return meters / 1000;
}
