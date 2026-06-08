-- ============================================================================
-- Community Redesign — Data Layer (Phase 1)
-- ----------------------------------------------------------------------------
-- 1. broadcasts.expires_at — nullable poll deadline column
-- 2. flyer_save_count(p_flyer_id) — SECURITY DEFINER RPC returning aggregate
--    count from saved_flyers so anon clients can read it even under RLS.
-- ============================================================================

-- ─── 1. Poll deadline column ─────────────────────────────────────────────────
ALTER TABLE public.broadcasts
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

COMMENT ON COLUMN public.broadcasts.expires_at IS
  'Optional deadline for polls (kind=''poll''). NULL = no deadline. '
  'Polls where expires_at < now() are considered closed.';

-- ─── 2. flyer_save_count RPC ─────────────────────────────────────────────────
-- Returns the number of times a flyer has been saved (bookmarked).
-- SECURITY DEFINER: bypasses RLS on saved_flyers so *any* caller (anon included)
-- can read the aggregate count without seeing individual saver identities.
-- SET search_path = public: prevents search_path injection attacks.
CREATE OR REPLACE FUNCTION public.flyer_save_count(p_flyer_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM   public.saved_flyers
  WHERE  flyer_id = p_flyer_id;
$$;

COMMENT ON FUNCTION public.flyer_save_count(uuid) IS
  'Returns the total number of saves (bookmarks) for a given flyer. '
  'SECURITY DEFINER so RLS on saved_flyers does not hide the aggregate.';

GRANT EXECUTE ON FUNCTION public.flyer_save_count(uuid) TO anon, authenticated;
