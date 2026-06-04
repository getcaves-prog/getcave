"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createCommunity } from "../services/community.service";

// ─── Slug auto-suggest from name ─────────────────────────────────────────────
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

// ─── Field label ──────────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[10px] uppercase tracking-[0.2em] text-cave-smoke mb-1.5 font-[family-name:var(--font-space-mono)]"
    >
      {children}
    </label>
  );
}

// ─── Text input ───────────────────────────────────────────────────────────────

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  error?: string;
}

function TextInput({ id, error, className = "", ...rest }: TextInputProps) {
  return (
    <>
      <input
        id={id}
        className={`w-full h-[48px] px-4 rounded-xl bg-cave-rock border ${
          error ? "border-[#FF2D7B]" : "border-cave-ash"
        } text-cave-white placeholder:text-cave-smoke focus:outline-none focus:border-[#FFFFFF] transition-colors font-[family-name:var(--font-inter)] text-sm ${className}`}
        {...rest}
      />
      {error && (
        <p className="mt-1 text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
          {error}
        </p>
      )}
    </>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  error?: string;
}

function TextArea({ id, error, className = "", ...rest }: TextAreaProps) {
  return (
    <>
      <textarea
        id={id}
        rows={3}
        className={`w-full px-4 py-3 rounded-xl bg-cave-rock border ${
          error ? "border-[#FF2D7B]" : "border-cave-ash"
        } text-cave-white placeholder:text-cave-smoke focus:outline-none focus:border-[#FFFFFF] transition-colors resize-none font-[family-name:var(--font-inter)] text-sm leading-5 ${className}`}
        {...rest}
      />
      {error && (
        <p className="mt-1 text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
          {error}
        </p>
      )}
    </>
  );
}

// ─── CreateCommunityForm ──────────────────────────────────────────────────────

interface FormErrors {
  name?: string;
  slug?: string;
  submit?: string;
}

export function CreateCommunityForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);

  // Auto-generate slug from name unless user has manually edited it
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setName(val);
      if (!slugEdited) {
        setSlug(toSlug(val));
      }
    },
    [slugEdited]
  );

  const handleSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugEdited(true);
    // Only allow valid slug chars as user types
    const sanitized = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setSlug(sanitized);
  }, []);

  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = "El nombre es requerido";
    if (!slug.trim()) errs.slug = "El slug es requerido";
    else if (slug.length < 3) errs.slug = "El slug debe tener al menos 3 caracteres";
    return errs;
  }, [name, slug]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const errs = validate();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }

      setErrors({});
      setSubmitting(true);

      try {
        await createCommunity({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          city: city.trim() || undefined,
          // Image upload deferred — URLs can be set via future edit flow.
          // avatarUrl and coverUrl are optional; skipped in MVP form.
        });

        setSuccess(true);
        // Brief success animation, then route
        setTimeout(() => {
          router.push(`/communities/${slug.trim()}`);
        }, 600);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Algo salió mal";
        // Surface slug conflict clearly
        const isTaken =
          msg.toLowerCase().includes("duplicate") ||
          msg.toLowerCase().includes("unique") ||
          msg.toLowerCase().includes("slug");
        setErrors({
          submit: isTaken
            ? `El slug "${slug}" ya está en uso. Elegí otro.`
            : msg,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [name, slug, description, city, validate, router]
  );

  return (
    <div className="min-h-dvh bg-[#050505]">
      <div className="grain-overlay" />

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#050505]/80 backdrop-blur-md safe-area-top border-b border-cave-ash/20">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 text-cave-fog hover:text-cave-white transition-colors"
          aria-label="Cancelar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="font-[family-name:var(--font-space-mono)] text-sm text-cave-white">
          Nueva comunidad
        </span>
        <div className="w-10" />
      </header>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="px-5 py-6 flex flex-col gap-5 max-w-[480px] mx-auto"
        noValidate
      >
        {/* Name */}
        <div>
          <FieldLabel htmlFor="community-name">Nombre *</FieldLabel>
          <TextInput
            id="community-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Techno Cave CDMX"
            maxLength={80}
            autoComplete="off"
            error={errors.name}
          />
        </div>

        {/* Slug */}
        <div>
          <FieldLabel htmlFor="community-slug">Slug (URL) *</FieldLabel>
          <div className="flex items-center gap-2">
            <span className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] flex-shrink-0">
              /communities/
            </span>
            <div className="flex-1">
              <TextInput
                id="community-slug"
                type="text"
                value={slug}
                onChange={handleSlugChange}
                placeholder="techno-cave-cdmx"
                maxLength={60}
                autoComplete="off"
                error={errors.slug}
              />
            </div>
          </div>
          <p className="mt-1 text-[10px] text-cave-ash font-[family-name:var(--font-space-mono)]">
            Solo letras minúsculas, números y guiones. No se puede cambiar después.
          </p>
        </div>

        {/* Description */}
        <div>
          <FieldLabel htmlFor="community-description">Descripción</FieldLabel>
          <TextArea
            id="community-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="¿De qué se trata esta comunidad?"
            maxLength={500}
          />
        </div>

        {/* City */}
        <div>
          <FieldLabel htmlFor="community-city">Ciudad</FieldLabel>
          <TextInput
            id="community-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ciudad de México"
            maxLength={80}
            autoComplete="off"
          />
        </div>

        {/* Image upload — deferred (note to next task) */}
        {/* Avatar y portada serán configurables desde el perfil de comunidad en una iteración futura.
            Por ahora, el formulario solo acepta texto. */}

        {/* Submit error */}
        <AnimatePresence>
          {errors.submit && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="px-4 py-3 rounded-xl bg-[#FF2D7B]/10 border border-[#FF2D7B]/30"
            >
              <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
                {errors.submit}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit button */}
        <motion.button
          type="submit"
          disabled={submitting || success}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={`h-[52px] rounded-full font-bold uppercase tracking-[0.15em] text-sm font-[family-name:var(--font-space-mono)] transition-colors disabled:cursor-not-allowed ${
            success
              ? "bg-[#FFFFFF]/80 text-cave-black"
              : "bg-[#FFFFFF] text-cave-black disabled:opacity-50"
          }`}
        >
          {success
            ? "¡Comunidad creada!"
            : submitting
            ? "Creando..."
            : "Crear comunidad"}
        </motion.button>

        <p className="text-[10px] text-cave-ash text-center font-[family-name:var(--font-space-mono)]">
          Avatar y portada se pueden agregar después desde el perfil de la comunidad.
        </p>
      </form>
    </div>
  );
}
