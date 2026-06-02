-- RPC: verify passcode and upsert invite — returns the qr_token
CREATE OR REPLACE FUNCTION public.verify_and_get_invite(
  p_flyer_id    UUID,
  p_passcode    TEXT,
  p_display_name TEXT,
  p_phone       TEXT DEFAULT NULL
)
RETURNS TABLE (
  qr_token       TEXT,
  display_name   TEXT,
  already_existed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_config  public.invitation_configs%ROWTYPE;
  v_invite  public.event_qr_invites%ROWTYPE;
  v_user_id UUID;
  v_count   INTEGER;
  v_existed BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Load config
  SELECT * INTO v_config
  FROM public.invitation_configs
  WHERE flyer_id = p_flyer_id AND enabled = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitations_not_enabled';
  END IF;

  -- Verify passcode (SHA-256 hex comparison)
  IF v_config.passcode_hash != encode(sha256(p_passcode::bytea), 'hex') THEN
    RAISE EXCEPTION 'invalid_passcode';
  END IF;

  -- Check if user already has an invite
  SELECT * INTO v_invite
  FROM public.event_qr_invites
  WHERE flyer_id = p_flyer_id AND user_id = v_user_id;

  IF FOUND THEN
    v_existed := true;
    -- Update name in case they changed it
    UPDATE public.event_qr_invites
    SET display_name = p_display_name,
        phone = p_phone
    WHERE id = v_invite.id
    RETURNING * INTO v_invite;
  ELSE
    -- Check capacity before inserting
    IF v_config.max_capacity IS NOT NULL THEN
      SELECT COUNT(*) INTO v_count
      FROM public.event_qr_invites
      WHERE flyer_id = p_flyer_id;

      IF v_count >= v_config.max_capacity THEN
        RAISE EXCEPTION 'event_at_capacity';
      END IF;
    END IF;

    INSERT INTO public.event_qr_invites (flyer_id, user_id, display_name, phone)
    VALUES (p_flyer_id, v_user_id, p_display_name, p_phone)
    RETURNING * INTO v_invite;
  END IF;

  RETURN QUERY SELECT v_invite.qr_token, v_invite.display_name, v_existed;
END;
$$;

-- RPC: creator scans QR token → returns attendee info + marks checked in
CREATE OR REPLACE FUNCTION public.checkin_qr_invite(
  p_qr_token TEXT
)
RETURNS TABLE (
  display_name      TEXT,
  phone             TEXT,
  flyer_title       TEXT,
  already_checked_in BOOLEAN,
  checked_in_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite      public.event_qr_invites%ROWTYPE;
  v_flyer_owner UUID;
  v_flyer_title TEXT;
  v_was_checked BOOLEAN;
BEGIN
  -- Load invite
  SELECT * INTO v_invite
  FROM public.event_qr_invites
  WHERE qr_token = p_qr_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_qr_token';
  END IF;

  -- Verify caller owns the flyer
  SELECT user_id, title INTO v_flyer_owner, v_flyer_title
  FROM public.flyers WHERE id = v_invite.flyer_id;

  IF v_flyer_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_was_checked := v_invite.checked_in;

  -- Mark as checked in (idempotent)
  IF NOT v_was_checked THEN
    UPDATE public.event_qr_invites
    SET checked_in = true, checked_in_at = now()
    WHERE id = v_invite.id
    RETURNING checked_in_at INTO v_invite.checked_in_at;
  END IF;

  RETURN QUERY
  SELECT
    v_invite.display_name,
    v_invite.phone,
    v_flyer_title,
    v_was_checked,
    COALESCE(v_invite.checked_in_at, now());
END;
$$;

-- RPC: save invitation config (upsert)
CREATE OR REPLACE FUNCTION public.save_invitation_config(
  p_flyer_id     UUID,
  p_passcode     TEXT,
  p_enabled      BOOLEAN DEFAULT true,
  p_max_capacity INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
BEGIN
  -- Verify caller owns the flyer
  SELECT user_id INTO v_owner FROM public.flyers WHERE id = p_flyer_id;

  IF v_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO public.invitation_configs (flyer_id, passcode_hash, enabled, max_capacity)
  VALUES (
    p_flyer_id,
    encode(sha256(p_passcode::bytea), 'hex'),
    p_enabled,
    p_max_capacity
  )
  ON CONFLICT (flyer_id) DO UPDATE
  SET passcode_hash = encode(sha256(p_passcode::bytea), 'hex'),
      enabled       = p_enabled,
      max_capacity  = p_max_capacity;
END;
$$;

-- RPC: get invitation config for a flyer (public — only returns enabled status + capacity, NOT passcode)
CREATE OR REPLACE FUNCTION public.get_invitation_status(
  p_flyer_id UUID
)
RETURNS TABLE (
  enabled      BOOLEAN,
  max_capacity INTEGER,
  current_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ic.enabled,
    ic.max_capacity,
    (SELECT COUNT(*)::INTEGER FROM public.event_qr_invites WHERE flyer_id = p_flyer_id)
  FROM public.invitation_configs ic
  WHERE ic.flyer_id = p_flyer_id;
$$;
