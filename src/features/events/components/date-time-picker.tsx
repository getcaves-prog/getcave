"use client";

import { Input } from "@/shared/components/ui/input";

interface DateTimePickerProps {
  date: string;
  timeStart: string;
  timeEnd: string;
  onDateChange: (value: string) => void;
  onTimeStartChange: (value: string) => void;
  onTimeEndChange: (value: string) => void;
  errors?: {
    date?: string;
    timeStart?: string;
    timeEnd?: string;
  };
}

export function DateTimePicker({
  date,
  timeStart,
  timeEnd,
  onDateChange,
  onTimeStartChange,
  onTimeEndChange,
  errors,
}: DateTimePickerProps) {
  return (
    <div className="flex flex-col gap-4">
      <Input
        type="date"
        label="Fecha"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        error={errors?.date}
        required
        className="text-white [color-scheme:dark]"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="time"
          label="Hora inicio"
          value={timeStart}
          onChange={(e) => onTimeStartChange(e.target.value)}
          error={errors?.timeStart}
          required
          className="text-white [color-scheme:dark]"
        />
        <Input
          type="time"
          label="Hora fin (opcional)"
          value={timeEnd}
          onChange={(e) => onTimeEndChange(e.target.value)}
          error={errors?.timeEnd}
          className="text-white [color-scheme:dark]"
        />
      </div>
    </div>
  );
}
