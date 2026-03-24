"use client";

import { Input } from "@/shared/components/ui/input";

interface AddressInputProps {
  venueName: string;
  venueAddress: string;
  latitude: string;
  longitude: string;
  onVenueNameChange: (value: string) => void;
  onVenueAddressChange: (value: string) => void;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  errors?: {
    venueName?: string;
    venueAddress?: string;
  };
}

export function AddressInput({
  venueName,
  venueAddress,
  latitude,
  longitude,
  onVenueNameChange,
  onVenueAddressChange,
  onLatitudeChange,
  onLongitudeChange,
  errors,
}: AddressInputProps) {
  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Nombre del lugar"
        placeholder="Ej: Foro Sol, Bar Oriente..."
        value={venueName}
        onChange={(e) => onVenueNameChange(e.target.value)}
        error={errors?.venueName}
        required
      />
      <Input
        label="Direccion"
        placeholder="Calle, numero, colonia, ciudad"
        value={venueAddress}
        onChange={(e) => onVenueAddressChange(e.target.value)}
        error={errors?.venueAddress}
        required
      />
      {/* Geocoding coming soon — manual lat/lng for now */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="number"
          label="Latitud"
          placeholder="19.4326"
          value={latitude}
          onChange={(e) => onLatitudeChange(e.target.value)}
          step="any"
          className="text-sm"
        />
        <Input
          type="number"
          label="Longitud"
          placeholder="-99.1332"
          value={longitude}
          onChange={(e) => onLongitudeChange(e.target.value)}
          step="any"
          className="text-sm"
        />
      </div>
      <p className="text-xs text-[#666]">
        Las coordenadas se llenan automaticamente con tu ubicacion. Geocoding
        con mapa proximamente.
      </p>
    </div>
  );
}
