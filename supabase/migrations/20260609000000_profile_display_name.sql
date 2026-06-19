-- Add a real display name (separate from the @username handle) to profiles.
-- Nullable: existing rows keep showing their username until a name is set.
-- No RLS change needed: the profiles update policy already lets a user
-- update their own row, which covers writes to this new column.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text;

COMMENT ON COLUMN public.profiles.display_name IS
  'Optional human-readable name shown as the primary identity on the profile; username remains the unique handle.';
