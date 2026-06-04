-- ============================================================================
-- Community Channels — data layer
-- ----------------------------------------------------------------------------
-- Adds channel-based messaging to communities.
-- Dependency order:
--   1. community_channels table + RLS (deferred owner/admin policies follow table)
--   2. conversations.subject_type CHECK extension ('channel')
--   3. get_or_create_conversation REPLACE (adds 'channel' validation)
--   4. enforce_channel_write_permission trigger on messages
--   5. update_community RPC
--   6. Default 'General' channel backfill + create_community REPLACE
--   7. communities storage bucket + policies
-- ============================================================================


-- ============================================================================
-- 1. community_channels
-- ============================================================================
CREATE TABLE public.community_channels (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id     UUID        NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  description      TEXT,
  write_permission TEXT        NOT NULL DEFAULT 'everyone'
                     CHECK (write_permission IN ('everyone', 'admins_only')),
  is_default       BOOLEAN     NOT NULL DEFAULT false,
  position         INTEGER     NOT NULL DEFAULT 0,
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique channel name (case-insensitive) per community
CREATE UNIQUE INDEX community_channels_community_name_unique
  ON public.community_channels (community_id, lower(name));

-- Ordering index
CREATE INDEX community_channels_community_position_idx
  ON public.community_channels (community_id, position);

ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels are publicly readable"
  ON public.community_channels
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TRIGGER set_updated_at_community_channels
  BEFORE UPDATE ON public.community_channels
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- NOTE: INSERT/UPDATE/DELETE policies reference community_members (already
-- exists — created in 20260601000000_community_data_model.sql).

CREATE POLICY "Owners and admins create channels"
  ON public.community_channels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members m
      WHERE m.community_id = community_channels.community_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins update channels"
  ON public.community_channels
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members m
      WHERE m.community_id = community_channels.community_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins delete channels"
  ON public.community_channels
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members m
      WHERE m.community_id = community_channels.community_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );


-- ============================================================================
-- 2. conversations.subject_type — extend CHECK to include 'channel'
-- ============================================================================
-- Drop the existing CHECK constraint (created in 20260601000000).
-- Constraint name in Postgres is auto-generated as <table>_<column>_check.
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_subject_type_check;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_subject_type_check
    CHECK (subject_type IN ('flyer', 'community', 'channel'));


-- ============================================================================
-- 3. get_or_create_conversation — add 'channel' subject_type support
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_subject_type TEXT,
  p_subject_id   UUID
)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation public.conversations%ROWTYPE;
  v_exists       BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_subject_type NOT IN ('flyer', 'community', 'channel') THEN
    RAISE EXCEPTION 'invalid_subject_type';
  END IF;

  -- Validate the referenced subject exists (polymorphic — no real FK).
  IF p_subject_type = 'flyer' THEN
    SELECT EXISTS (SELECT 1 FROM public.flyers WHERE id = p_subject_id) INTO v_exists;
  ELSIF p_subject_type = 'community' THEN
    SELECT EXISTS (SELECT 1 FROM public.communities WHERE id = p_subject_id) INTO v_exists;
  ELSE -- 'channel'
    SELECT EXISTS (SELECT 1 FROM public.community_channels WHERE id = p_subject_id) INTO v_exists;
  END IF;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'subject_not_found';
  END IF;

  -- Idempotent get-or-create.
  SELECT * INTO v_conversation
  FROM public.conversations
  WHERE subject_type = p_subject_type AND subject_id = p_subject_id;

  IF FOUND THEN
    RETURN v_conversation;
  END IF;

  INSERT INTO public.conversations (subject_type, subject_id)
  VALUES (p_subject_type, p_subject_id)
  ON CONFLICT (subject_type, subject_id) DO NOTHING
  RETURNING * INTO v_conversation;

  -- Handle race: another caller inserted between SELECT and INSERT.
  IF NOT FOUND THEN
    SELECT * INTO v_conversation
    FROM public.conversations
    WHERE subject_type = p_subject_type AND subject_id = p_subject_id;
  END IF;

  RETURN v_conversation;
END;
$$;


-- ============================================================================
-- 4. enforce_channel_write_permission — BEFORE INSERT trigger on messages
-- ----------------------------------------------------------------------------
-- Only fires for channel conversations. When write_permission = 'admins_only',
-- the inserting user must be an owner or admin of the channel's community.
-- Non-channel conversations (flyer / community) pass through unchanged.
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

CREATE TRIGGER enforce_channel_write_permission_on_insert
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_channel_write_permission();


-- ============================================================================
-- 5. update_community RPC
-- ----------------------------------------------------------------------------
-- COALESCE logic: NULL argument = keep current value; explicit value = update.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_community(
  p_community_id UUID,
  p_name         TEXT DEFAULT NULL,
  p_description  TEXT DEFAULT NULL,
  p_avatar_url   TEXT DEFAULT NULL,
  p_cover_url    TEXT DEFAULT NULL
)
RETURNS public.communities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_community   public.communities%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Validate caller is owner or admin of the community.
  SELECT role INTO v_caller_role
  FROM public.community_members
  WHERE community_id = p_community_id AND user_id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.communities
  SET
    name         = COALESCE(p_name,        name),
    description  = COALESCE(p_description, description),
    avatar_url   = COALESCE(p_avatar_url,  avatar_url),
    cover_url    = COALESCE(p_cover_url,   cover_url)
  WHERE id = p_community_id
  RETURNING * INTO v_community;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'community_not_found';
  END IF;

  RETURN v_community;
END;
$$;


-- ============================================================================
-- 6a. Default 'General' channel backfill — existing communities
-- ============================================================================
INSERT INTO public.community_channels (community_id, name, write_permission, is_default, position, created_by)
SELECT
  c.id,
  'General',
  'everyone',
  true,
  0,
  c.created_by
FROM public.communities c
WHERE NOT EXISTS (
  SELECT 1 FROM public.community_channels cc
  WHERE cc.community_id = c.id
);


-- ============================================================================
-- 6b. create_community RPC — updated to auto-create 'General' channel
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_community(
  p_slug        TEXT,
  p_name        TEXT,
  p_description TEXT DEFAULT NULL,
  p_avatar_url  TEXT DEFAULT NULL,
  p_cover_url   TEXT DEFAULT NULL,
  p_city        TEXT DEFAULT NULL,
  p_zone_id     UUID DEFAULT NULL
)
RETURNS public.communities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_community public.communities%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_slug IS NULL OR char_length(trim(p_slug)) = 0 THEN
    RAISE EXCEPTION 'slug_required';
  END IF;

  IF p_name IS NULL OR char_length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name_required';
  END IF;

  INSERT INTO public.communities (slug, name, description, avatar_url, cover_url, city, zone_id, created_by)
  VALUES (p_slug, p_name, p_description, p_avatar_url, p_cover_url, p_city, p_zone_id, v_user_id)
  RETURNING * INTO v_community;

  -- Insert owner membership (SECURITY DEFINER bypasses 'member'-only INSERT policy).
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (v_community.id, v_user_id, 'owner');

  -- Auto-create default 'General' channel for every new community.
  INSERT INTO public.community_channels (community_id, name, write_permission, is_default, position, created_by)
  VALUES (v_community.id, 'General', 'everyone', true, 0, v_user_id);

  -- Re-read so the returned row reflects member_count bumped by the AFTER INSERT
  -- trigger on community_members (the initial RETURNING captured member_count = 0).
  SELECT * INTO v_community FROM public.communities WHERE id = v_community.id;

  RETURN v_community;
END;
$$;


-- ============================================================================
-- 7. Storage bucket: communities (public, 5MB, images only)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'communities',
  'communities',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

CREATE POLICY "Public community asset access"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'communities');

CREATE POLICY "Auth users upload community assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'communities' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own community assets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'communities' AND auth.uid()::text = (storage.foldername(name))[1]);
