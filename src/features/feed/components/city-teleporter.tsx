"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface City {
  name: string;
  slug: string;
  lat: number;
  lng: number;
}

const CITIES: City[] = [
  { name: "Monterrey", slug: "monterrey", lat: 25.6866, lng: -100.3161 },
  { name: "CDMX", slug: "cdmx", lat: 19.4326, lng: -99.1332 },
  { name: "Guadalajara", slug: "guadalajara", lat: 20.6597, lng: -103.3496 },
  { name: "Puebla", slug: "puebla", lat: 19.0414, lng: -98.2063 },
  { name: "Querétaro", slug: "queretaro", lat: 20.5888, lng: -100.3899 },
];

interface CityTeleporterProps {
  currentCity?: string;
  onCityChange: (city: City) => void;
}

export function CityTeleporter({
  currentCity,
  onCityChange,
}: CityTeleporterProps) {
  const [open, setOpen] = useState(false);
  const [teleporting, setTeleporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedCity = CITIES.find((c) => c.slug === currentCity) ?? CITIES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleSelect(city: City) {
    if (city.slug === selectedCity.slug) {
      setOpen(false);
      return;
    }

    setTeleporting(true);
    setOpen(false);

    // Teleport animation delay before switching
    setTimeout(() => {
      onCityChange(city);
      setTeleporting(false);
    }, 400);
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Teleport flash overlay */}
      <AnimatePresence>
        {teleporting && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50 bg-[#39FF14]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* Trigger pill */}
      <motion.button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm"
        style={{
          fontFamily: "'Space Mono', monospace",
          borderColor: open ? "#39FF14" : "rgba(74, 74, 74, 0.5)",
          color: open ? "#39FF14" : "#E0E0E0",
          backgroundColor: "rgba(20, 20, 20, 0.8)",
          boxShadow: open ? "0 0 8px rgba(57, 255, 20, 0.2)" : "none",
        }}
        whileTap={{ scale: 0.95 }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Cambiar ciudad"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        <span>{selectedCity.name}</span>
        <motion.svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </motion.svg>
      </motion.button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Ciudades disponibles"
            className="absolute left-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-lg border"
            style={{
              borderColor: "rgba(74, 74, 74, 0.5)",
              backgroundColor: "rgba(20, 20, 20, 0.95)",
              backdropFilter: "blur(12px)",
            }}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {CITIES.map((city, i) => (
              <motion.li
                key={city.slug}
                role="option"
                aria-selected={city.slug === selectedCity.slug}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(city)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors"
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    color:
                      city.slug === selectedCity.slug ? "#39FF14" : "#E0E0E0",
                    backgroundColor:
                      city.slug === selectedCity.slug
                        ? "rgba(57, 255, 20, 0.08)"
                        : "transparent",
                  }}
                >
                  {city.slug === selectedCity.slug && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: "#39FF14" }}
                    />
                  )}
                  <span>{city.name}</span>
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
