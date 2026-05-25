-- QR Invitation system: individual invite records
CREATE TABLE public.event_qr_invites (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  flyer_id      UUID        NOT NULL REFERENCES public.flyers(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qr_token      TEXT        UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  display_name  TEXT        NOT NULL,
  phone         TEXT,
  checked_in    BOOLEAN     NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (flyer_id, user_id)  -- one invite per user per event
);

CREATE INDEX event_qr_invites_flyer_idx ON public.event_qr_invites (flyer_id);
CREATE INDEX event_qr_invites_token_idx ON public.event_qr_invites (qr_token);

ALTER TABLE public.event_qr_invites ENABLE ROW LEVEL SECURITY;

-- Attendee sees only their own invite
CREATE POLICY "User reads own invite"
  ON public.event_qr_invites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Flyer creator reads all invites for their events
CREATE POLICY "Creator reads event invites"
  ON public.event_qr_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flyers
      WHERE flyers.id = event_qr_invites.flyer_id
        AND flyers.user_id = auth.uid()
    )
  );

-- Attendees can insert their own invite (via RPC only)
CREATE POLICY "User inserts own invite"
  ON public.event_qr_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Attendees can update their own invite (for display_name edits)
CREATE POLICY "User updates own invite"
  ON public.event_qr_invites
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
