"use client";

import { useCallback, useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ImageUpload } from "@/features/events/components/image-upload";
import { CategorySelect } from "@/features/events/components/category-select";
import { DateTimePicker } from "@/features/events/components/date-time-picker";
import { AddressInput } from "@/features/events/components/address-input";
import { createEvent } from "@/features/events/services/upload.service";
import type { CreateEventData } from "@/features/events/services/upload.service";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface UploadFormProps {
  categories: Category[];
}

interface FormErrors {
  flyerUrl?: string;
  title?: string;
  categoryId?: string;
  venueName?: string;
  venueAddress?: string;
  date?: string;
  timeStart?: string;
  general?: string;
}

// Default coords: Mexico City
const DEFAULT_LAT = "19.4326";
const DEFAULT_LNG = "-99.1332";

export function UploadForm({ categories }: UploadFormProps) {
  const [flyerUrl, setFlyerUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [latitude, setLatitude] = useState(DEFAULT_LAT);
  const [longitude, setLongitude] = useState(DEFAULT_LNG);
  const [date, setDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("MXN");
  const [externalUrl, setExternalUrl] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Try browser geolocation on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
        },
        () => {
          // Geolocation denied or failed — keep defaults
        }
      );
    }
  }, []);

  const validate = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};

    if (!flyerUrl) newErrors.flyerUrl = "Debes subir una imagen del flyer";
    if (!title.trim()) newErrors.title = "El titulo es obligatorio";
    if (!categoryId) newErrors.categoryId = "Selecciona una categoria";
    if (!venueName.trim())
      newErrors.venueName = "El nombre del lugar es obligatorio";
    if (!venueAddress.trim())
      newErrors.venueAddress = "La direccion es obligatoria";
    if (!date) newErrors.date = "La fecha es obligatoria";
    if (!timeStart) newErrors.timeStart = "La hora de inicio es obligatoria";

    return newErrors;
  }, [flyerUrl, title, categoryId, venueName, venueAddress, date, timeStart]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const formErrors = validate();
      setErrors(formErrors);

      if (Object.keys(formErrors).length > 0) return;

      setIsSubmitting(true);
      setErrors({});

      try {
        const data: CreateEventData = {
          title: title.trim(),
          description: description.trim(),
          flyerUrl,
          venueName: venueName.trim(),
          venueAddress: venueAddress.trim(),
          latitude: parseFloat(latitude) || 19.4326,
          longitude: parseFloat(longitude) || -99.1332,
          date,
          timeStart,
          timeEnd: timeEnd || null,
          price: price ? parseFloat(price) : null,
          currency,
          categoryId,
          externalUrl: externalUrl.trim() || null,
        };

        const result = await createEvent(data);

        if (result?.error) {
          setErrors({ general: result.error });
        }
        // On success, createEvent redirects via server action
      } catch {
        setErrors({ general: "Ocurrio un error inesperado. Intenta de nuevo." });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      validate,
      title,
      description,
      flyerUrl,
      venueName,
      venueAddress,
      latitude,
      longitude,
      date,
      timeStart,
      timeEnd,
      price,
      currency,
      categoryId,
      externalUrl,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Flyer Image Upload */}
      <ImageUpload
        value={flyerUrl}
        onChange={setFlyerUrl}
        error={errors.flyerUrl}
      />

      {/* Title */}
      <Input
        label="Titulo del evento"
        placeholder="Ej: Noche de techno, Festival de tacos..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        required
      />

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-[#A0A0A0]">
          Descripcion (opcional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Cuenta de que va tu evento..."
          rows={3}
          className="w-full rounded-xl bg-[#2A2A2A] px-4 py-3 text-white placeholder:text-[#666] border border-transparent focus:border-[#FF4D4D] focus:outline-none transition-colors resize-none"
        />
      </div>

      {/* Category */}
      <CategorySelect
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
        error={errors.categoryId}
      />

      {/* Venue & Address */}
      <AddressInput
        venueName={venueName}
        venueAddress={venueAddress}
        latitude={latitude}
        longitude={longitude}
        onVenueNameChange={setVenueName}
        onVenueAddressChange={setVenueAddress}
        onLatitudeChange={setLatitude}
        onLongitudeChange={setLongitude}
        errors={{
          venueName: errors.venueName,
          venueAddress: errors.venueAddress,
        }}
      />

      {/* Date & Time */}
      <DateTimePicker
        date={date}
        timeStart={timeStart}
        timeEnd={timeEnd}
        onDateChange={setDate}
        onTimeStartChange={setTimeStart}
        onTimeEndChange={setTimeEnd}
        errors={{
          date: errors.date,
          timeStart: errors.timeStart,
        }}
      />

      {/* Price */}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Input
          type="number"
          label="Precio (opcional)"
          placeholder="0 = Gratis"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          min="0"
          step="0.01"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-[#A0A0A0]">Moneda</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-11 rounded-xl bg-[#2A2A2A] px-3 text-white border border-transparent focus:border-[#FF4D4D] focus:outline-none transition-colors appearance-none"
          >
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      {/* External URL */}
      <Input
        type="url"
        label="Link externo (opcional)"
        placeholder="https://tickets.ejemplo.com"
        value={externalUrl}
        onChange={(e) => setExternalUrl(e.target.value)}
      />

      {/* Preview Section */}
      {flyerUrl && title && (
        <div className="rounded-2xl border border-[#2A2A2A] overflow-hidden">
          <p className="px-4 py-2 text-xs text-[#A0A0A0] bg-[#1A1A1A]">
            Vista previa
          </p>
          <div className="relative aspect-[16/9]">
            <img
              src={flyerUrl}
              alt="Preview"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <h3 className="text-lg font-bold text-white">{title}</h3>
              {venueName && (
                <p className="text-sm text-[#A0A0A0]">{venueName}</p>
              )}
              {date && (
                <p className="text-sm text-[#A0A0A0]">
                  {new Date(date + "T00:00:00").toLocaleDateString("es-MX", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  {timeStart && ` - ${timeStart}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {errors.general && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
          <p className="text-sm text-red-400">{errors.general}</p>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full min-h-[48px]"
      >
        {isSubmitting ? "Publicando..." : "Publicar evento"}
      </Button>
    </form>
  );
}
