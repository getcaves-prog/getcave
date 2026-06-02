"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listCategories,
  getMyInterests,
  setMyInterests,
} from "@/features/onboarding/services/interests.service";
import type { Category } from "@/features/onboarding/services/interests.service";

interface UseInterestsResult {
  /** Full catalog of categories from the DB */
  categories: Category[];
  /** Category IDs the user currently has selected (local state) */
  selected: string[];
  /** Toggle a category on/off in local state */
  toggle: (categoryId: string) => void;
  /** Persist the current local selection to the DB */
  save: () => Promise<void>;
  /** True while loading the initial data */
  loading: boolean;
  /** True while saving to the DB */
  saving: boolean;
  /** Last error message, if any */
  error: string | null;
}

export function useInterests(): UseInterestsResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [cats, interests] = await Promise.all([
          listCategories(),
          getMyInterests(),
        ]);
        if (!cancelled) {
          setCategories(cats);
          setSelected(interests);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error cargando intereses");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback((categoryId: string) => {
    setSelected((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await setMyInterests(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando intereses");
      throw err;
    } finally {
      setSaving(false);
    }
  }, [selected]);

  return { categories, selected, toggle, save, loading, saving, error };
}
