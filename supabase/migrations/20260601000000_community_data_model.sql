-- ============================================================================
-- Phase 1: Community Data Model (CAVES MVP foundation)
-- ----------------------------------------------------------------------------
-- Foundation migration for the community / retention layer.
-- ALL event-related entities hang off public.flyers(id) (the real event entity;
-- the legacy `events` table is DEPRECATED and is never referenced here).
-- User identity FKs target auth.users(id), matching the existing convention
-- (saved_flyers, event_qr_invites). profiles (id == auth.users.id) is joined for
-- display only.
-- ============================================================================


-- ============================================================================
-- 1. communities
-- ============================================================================
CREATE TABLE public.communities (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT        UNIQUE NOT NULL,
  name         TEXT        NOT NULL,
  description  TEXT,
  avatar_url   TEXT,
  cover_url    TEXT,
  city         TEXT,
  zone_id      UUID        REFERENCES public.zones(id) ON DELETE SET NULL,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  member_count INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX communities_city_idx ON public.communities (city);
CREATE INDEX communities_zone_id_idx ON public.communities (zone_id);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Communities are publicly readable"
  ON public.communities
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users create communities"
  ON public.communities
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- NOTE: the UPDATE/DELETE policies on communities reference community_members,
-- which is created in section 2 below. Postgres requires the referenced table
-- to exist when a policy is defined, so those two policies are created AFTER
-- community_members (see "communities owner/admin write policies" below).

CREATE TRIGGER set_updated_at_communities
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- 2. community_members
-- ============================================================================
CREATE TABLE public.community_members (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID        NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);

CREATE INDEX community_members_user_id_idx ON public.community_members (user_id);
CREATE INDEX community_members_community_role_idx ON public.community_members (community_id, role);

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members are publicly readable"
  ON public.community_members
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Self-join as plain member only; owner/admin roles are granted via RPC.
CREATE POLICY "Users join as member"
  ON public.community_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'member');

-- Leave self, or an owner/admin kicks another member.
CREATE POLICY "Members leave or admins kick"
  ON public.community_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_members m
      WHERE m.community_id = community_members.community_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

-- Role changes happen via SECURITY DEFINER RPC to avoid privilege escalation;
-- intentionally NO UPDATE policy for the authenticated role.


-- ----------------------------------------------------------------------------
-- member_count sync trigger (keeps communities.member_count denormalized)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_community_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities
    SET member_count = member_count + 1
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities
    SET member_count = GREATEST(member_count - 1, 0)
    WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_member_count_on_insert
  AFTER INSERT ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_community_member_count();

CREATE TRIGGER sync_member_count_on_delete
  AFTER DELETE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_community_member_count();


-- ----------------------------------------------------------------------------
-- communities owner/admin write policies (deferred: depend on community_members)
-- ----------------------------------------------------------------------------
CREATE POLICY "Owners and admins update communities"
  ON public.communities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members m
      WHERE m.community_id = communities.id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins delete communities"
  ON public.communities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members m
      WHERE m.community_id = communities.id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );


-- ============================================================================
-- 3. flyers.community_id (relationship — a flyer belongs to AT MOST one community)
-- ============================================================================
ALTER TABLE public.flyers
  ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_flyers_community_id ON public.flyers (community_id);


-- ============================================================================
-- 4. conversations + messages (polymorphic single conversations table)
-- ============================================================================
CREATE TABLE public.conversations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT        NOT NULL CHECK (subject_type IN ('flyer', 'community')),
  subject_id   UUID        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversations are publicly readable"
  ON public.conversations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Rows are inert without messages; canonical creation path is the
-- get_or_create_conversation RPC, which validates the referenced subject.
CREATE POLICY "Authenticated users create conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);


CREATE TABLE public.messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  author_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_message_id UUID        REFERENCES public.messages(id) ON DELETE CASCADE,
  body              TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  is_deleted        BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_created_idx ON public.messages (conversation_id, created_at);
CREATE INDEX messages_parent_idx ON public.messages (parent_message_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Threads are public; soft-deleted rows still return so the UI can render
-- "mensaje eliminado". Filtering is_deleted is left to the app layer.
CREATE POLICY "Messages are publicly readable"
  ON public.messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users post their own messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Edit / soft-delete own message only (column restriction is app-enforced).
CREATE POLICY "Users update their own messages"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

CREATE TRIGGER set_updated_at_messages
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ----------------------------------------------------------------------------
-- Single-level-reply enforcement: a reply may only target a top-level message.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_single_level_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_parent_parent UUID;
BEGIN
  IF NEW.parent_message_id IS NOT NULL THEN
    SELECT parent_message_id INTO v_parent_parent
    FROM public.messages
    WHERE id = NEW.parent_message_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'parent_message_not_found';
    END IF;

    IF v_parent_parent IS NOT NULL THEN
      RAISE EXCEPTION 'replies_limited_to_one_level';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_single_level_reply_on_insert
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_level_reply();


-- ============================================================================
-- 5. broadcasts (difusión — admin-only announcement channel per community)
-- ============================================================================
CREATE TABLE public.broadcasts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID        NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  kind         TEXT        NOT NULL DEFAULT 'announcement'
                 CHECK (kind IN ('announcement', 'schedule_change', 'location_change', 'poll')),
  title        TEXT,
  body         TEXT        NOT NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX broadcasts_community_created_idx ON public.broadcasts (community_id, created_at DESC);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Broadcasts are publicly readable"
  ON public.broadcasts
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins create broadcasts"
  ON public.broadcasts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_members m
      WHERE m.community_id = broadcasts.community_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins update broadcasts"
  ON public.broadcasts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members m
      WHERE m.community_id = broadcasts.community_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins delete broadcasts"
  ON public.broadcasts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members m
      WHERE m.community_id = broadcasts.community_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE TRIGGER set_updated_at_broadcasts
  BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ----------------------------------------------------------------------------
-- broadcast_poll_options
-- ----------------------------------------------------------------------------
CREATE TABLE public.broadcast_poll_options (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID    NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  label        TEXT    NOT NULL,
  position     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX broadcast_poll_options_broadcast_idx ON public.broadcast_poll_options (broadcast_id);

ALTER TABLE public.broadcast_poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Poll options are publicly readable"
  ON public.broadcast_poll_options
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage poll options"
  ON public.broadcast_poll_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.broadcasts b
      JOIN public.community_members m ON m.community_id = b.community_id
      WHERE b.id = broadcast_poll_options.broadcast_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.broadcasts b
      JOIN public.community_members m ON m.community_id = b.community_id
      WHERE b.id = broadcast_poll_options.broadcast_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );


-- ----------------------------------------------------------------------------
-- broadcast_poll_votes
-- broadcast_id is denormalized to enforce one vote per user per broadcast.
-- ----------------------------------------------------------------------------
CREATE TABLE public.broadcast_poll_votes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID        NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  option_id    UUID        NOT NULL REFERENCES public.broadcast_poll_options(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, user_id)
);

CREATE INDEX broadcast_poll_votes_option_idx ON public.broadcast_poll_votes (option_id);

ALTER TABLE public.broadcast_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Poll votes are publicly readable"
  ON public.broadcast_poll_votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users cast their own vote"
  ON public.broadcast_poll_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users remove their own vote"
  ON public.broadcast_poll_votes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================================================
-- 6. event_media (recaps gallery on past flyers)
-- ============================================================================
CREATE TABLE public.event_media (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  flyer_id      UUID        NOT NULL REFERENCES public.flyers(id) ON DELETE CASCADE,
  uploaded_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  media_url     TEXT        NOT NULL,
  media_type    TEXT        NOT NULL CHECK (media_type IN ('image', 'video')),
  thumbnail_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX event_media_flyer_created_idx ON public.event_media (flyer_id, created_at DESC);

ALTER TABLE public.event_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recaps are publicly readable"
  ON public.event_media
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Any authenticated user may contribute to a recap (community-generated content).
CREATE POLICY "Users upload recap media"
  ON public.event_media
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Uploader removes own media; the flyer owner curates the gallery.
CREATE POLICY "Uploader or organizer deletes recap media"
  ON public.event_media
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.flyers f
      WHERE f.id = event_media.flyer_id
        AND f.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 7. user_interests (profiles <-> categories, M:N) — private per user
-- ============================================================================
CREATE TABLE public.user_interests (
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID        NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category_id)
);

CREATE INDEX user_interests_category_idx ON public.user_interests (category_id);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own interests"
  ON public.user_interests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users add their own interests"
  ON public.user_interests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users remove their own interests"
  ON public.user_interests
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ============================================================================
-- 8. event_attendance ("voy" / "voy solo")
-- ============================================================================
CREATE TABLE public.event_attendance (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  flyer_id   UUID        NOT NULL REFERENCES public.flyers(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  going_solo BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (flyer_id, user_id)
);

CREATE INDEX event_attendance_user_idx ON public.event_attendance (user_id);
CREATE INDEX event_attendance_solo_idx ON public.event_attendance (flyer_id) WHERE going_solo;

ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendance is publicly readable"
  ON public.event_attendance
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users mark their own attendance"
  ON public.event_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users toggle their own attendance"
  ON public.event_attendance
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users remove their own attendance"
  ON public.event_attendance
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER set_updated_at_event_attendance
  BEFORE UPDATE ON public.event_attendance
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- RPCs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- create_community: atomically creates a community and its owner membership.
-- Runs as SECURITY DEFINER so the owner row bypasses the community_members
-- INSERT policy (which only allows self-join as 'member').
-- ----------------------------------------------------------------------------
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

  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (v_community.id, v_user_id, 'owner');

  -- Re-read so the returned row reflects member_count bumped by the AFTER INSERT
  -- trigger on community_members (the initial RETURNING captured member_count = 0).
  SELECT * INTO v_community FROM public.communities WHERE id = v_community.id;

  RETURN v_community;
END;
$$;


-- ----------------------------------------------------------------------------
-- get_or_create_conversation: idempotently returns the conversation for a
-- (subject_type, subject_id), validating the referenced subject exists.
-- ----------------------------------------------------------------------------
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

  IF p_subject_type NOT IN ('flyer', 'community') THEN
    RAISE EXCEPTION 'invalid_subject_type';
  END IF;

  -- Validate the referenced subject exists (polymorphic, so no real FK).
  IF p_subject_type = 'flyer' THEN
    SELECT EXISTS (SELECT 1 FROM public.flyers WHERE id = p_subject_id) INTO v_exists;
  ELSE
    SELECT EXISTS (SELECT 1 FROM public.communities WHERE id = p_subject_id) INTO v_exists;
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


-- ----------------------------------------------------------------------------
-- flyer_attendance_counts: total attendees + solo-goers for a flyer.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.flyer_attendance_counts(
  p_flyer_id UUID
)
RETURNS TABLE (
  total_count INTEGER,
  solo_count  INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::INTEGER                                    AS total_count,
    COUNT(*) FILTER (WHERE going_solo)::INTEGER          AS solo_count
  FROM public.event_attendance
  WHERE flyer_id = p_flyer_id;
$$;


-- ----------------------------------------------------------------------------
-- promote_community_member: owner/admin grants/changes a member's role.
-- SECURITY DEFINER to bypass the absence of an UPDATE policy on members.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_community_member(
  p_community_id UUID,
  p_user_id      UUID,
  p_role         TEXT
)
RETURNS public.community_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_member      public.community_members%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_role NOT IN ('owner', 'admin', 'member') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.community_members
  WHERE community_id = p_community_id AND user_id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.community_members
  SET role = p_role
  WHERE community_id = p_community_id AND user_id = p_user_id
  RETURNING * INTO v_member;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found';
  END IF;

  RETURN v_member;
END;
$$;


-- ============================================================================
-- Storage bucket: recaps (public, 10MB, images + video)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recaps',
  'recaps',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
);

CREATE POLICY "Public recap access"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'recaps');

CREATE POLICY "Auth users upload recaps"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'recaps' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own recaps"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'recaps' AND auth.uid()::text = (storage.foldername(name))[1]);
