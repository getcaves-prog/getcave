-- ============================================================================
-- Seeded Communities — data layer
-- ----------------------------------------------------------------------------
-- Adds seeding support: communities imported from external platforms,
-- official CAVES-authored messages, and admin-direct ownership transfer.
-- Dependency: 20260604120000_community_channels.sql must be applied first.
-- ============================================================================


-- ============================================================================
-- 1. communities — seeding columns
-- ============================================================================
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS is_seeded       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_platform text,
  ADD COLUMN IF NOT EXISTS source_url      text,
  ADD COLUMN IF NOT EXISTS claimed_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at      timestamptz;

-- Partial index for listing seeded communities efficiently.
CREATE INDEX IF NOT EXISTS communities_is_seeded_idx
  ON public.communities (id)
  WHERE is_seeded;


-- ============================================================================
-- 2. messages — official flag for CAVES-authored seed messages
-- ============================================================================
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;


-- ============================================================================
-- 3. enforce_channel_write_permission — allow official (seeded) messages
-- ----------------------------------------------------------------------------
-- Official messages (is_official = true) bypass the channel write-permission
-- check regardless of the author's community role. This is safe because only
-- SECURITY DEFINER RPCs can set is_official = true.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_channel_write_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject_type    TEXT;
  v_channel_id      UUID;
  v_write_perm      TEXT;
  v_community_id    UUID;
  v_caller_role     TEXT;
BEGIN
  -- Official seed messages bypass all channel permission checks.
  IF NEW.is_official THEN
    RETURN NEW;
  END IF;

  -- Look up the conversation's subject_type.
  SELECT subject_type, subject_id
  INTO v_subject_type, v_channel_id
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  -- Only enforce for channel conversations.
  IF v_subject_type IS DISTINCT FROM 'channel' THEN
    RETURN NEW;
  END IF;

  -- Load channel write_permission + community_id.
  SELECT write_permission, community_id
  INTO v_write_perm, v_community_id
  FROM public.community_channels
  WHERE id = v_channel_id;

  -- 'everyone' — allow.
  IF v_write_perm = 'everyone' OR v_write_perm IS NULL THEN
    RETURN NEW;
  END IF;

  -- 'admins_only' — caller must be owner or admin.
  SELECT role INTO v_caller_role
  FROM public.community_members
  WHERE community_id = v_community_id
    AND user_id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'channel_write_forbidden';
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================================
-- 3b. update_community_seeded_flags(p_community_id, p_is_seeded, p_source_platform, p_source_url)
-- ----------------------------------------------------------------------------
-- Platform-admin–only helper to stamp the seeding metadata on a community row
-- after creation. Called internally by the service after create_community.
-- Returns the updated community row.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_community_seeded_flags(
  p_community_id   uuid,
  p_is_seeded      boolean,
  p_source_platform text DEFAULT NULL,
  p_source_url      text DEFAULT NULL
)
RETURNS public.communities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community public.communities%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.communities
  SET
    is_seeded       = p_is_seeded,
    source_platform = COALESCE(p_source_platform, source_platform),
    source_url      = COALESCE(p_source_url, source_url)
  WHERE id = p_community_id
  RETURNING * INTO v_community;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'community_not_found';
  END IF;

  RETURN v_community;
END;
$$;


-- ============================================================================
-- 4. is_platform_admin() — reusable admin check helper
-- ----------------------------------------------------------------------------
-- Returns true when the calling user has role = 'admin' in profiles.
-- SECURITY DEFINER so it works inside other SECURITY DEFINER functions even
-- when the search_path is locked.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;


-- ============================================================================
-- 5. transfer_community_ownership(p_community_id, p_new_owner)
-- ----------------------------------------------------------------------------
-- Platform-admin–only. Atomically:
--   a) upserts the new owner into community_members with role='owner'
--   b) demotes all existing 'owner' rows (except the new owner) to 'member'
--   c) sets communities.claimed_by, claimed_at, is_seeded = false
-- Returns the updated community row.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.transfer_community_ownership(
  p_community_id uuid,
  p_new_owner    uuid
)
RETURNS public.communities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community public.communities%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Ensure the new owner is a member with role='owner' (upsert).
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (p_community_id, p_new_owner, 'owner')
  ON CONFLICT (community_id, user_id)
  DO UPDATE SET role = 'owner';

  -- Demote any OTHER existing owners to 'member'.
  UPDATE public.community_members
  SET role = 'member'
  WHERE community_id = p_community_id
    AND role = 'owner'
    AND user_id <> p_new_owner;

  -- Stamp claim on the community row + clear is_seeded flag.
  UPDATE public.communities
  SET
    claimed_by  = p_new_owner,
    claimed_at  = now(),
    is_seeded   = false
  WHERE id = p_community_id
  RETURNING * INTO v_community;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'community_not_found';
  END IF;

  RETURN v_community;
END;
$$;


-- ============================================================================
-- 6. post_seeded_message(p_subject_type, p_subject_id, p_body)
-- ----------------------------------------------------------------------------
-- Platform-admin–only. Gets or creates the conversation for the given subject,
-- then inserts an official message (is_official = true) authored by the calling
-- admin. The enforce_channel_write_permission trigger is bypassed automatically
-- because is_official = true is checked first in that trigger.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.post_seeded_message(
  p_subject_type text,
  p_subject_id   uuid,
  p_body         text
)
RETURNS public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation public.conversations%ROWTYPE;
  v_message      public.messages%ROWTYPE;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Reuse get_or_create_conversation logic inline (avoids the auth.uid() IS NULL
  -- check in the public RPC, which runs as SECURITY DEFINER with an active session).
  SELECT * INTO v_conversation
  FROM public.conversations
  WHERE subject_type = p_subject_type AND subject_id = p_subject_id;

  IF NOT FOUND THEN
    INSERT INTO public.conversations (subject_type, subject_id)
    VALUES (p_subject_type, p_subject_id)
    ON CONFLICT (subject_type, subject_id) DO NOTHING
    RETURNING * INTO v_conversation;

    -- Handle race condition.
    IF NOT FOUND THEN
      SELECT * INTO v_conversation
      FROM public.conversations
      WHERE subject_type = p_subject_type AND subject_id = p_subject_id;
    END IF;
  END IF;

  INSERT INTO public.messages (conversation_id, author_id, body, is_official)
  VALUES (v_conversation.id, auth.uid(), p_body, true)
  RETURNING * INTO v_message;

  RETURN v_message;
END;
$$;
