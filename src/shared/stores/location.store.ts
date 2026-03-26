import { create } from "zustand";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
  setLocation: (lat: number, lng: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/** Default to null — fallback to all flyers if no location */
export const useLocationStore = create<LocationState>((set) => ({
  latitude: null,
  longitude: null,
  loading: true,
  error: null,
  setLocation: (latitude, longitude) =>
    set({ latitude, longitude, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
