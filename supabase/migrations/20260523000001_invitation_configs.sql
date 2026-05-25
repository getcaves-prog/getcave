-- QR Invitation system: config table (one per flyer)
CREATE TABLE public.invitation_configs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  flyer_id      UUID        UNIQUE NOT NULL REFERENCES public.flyers(id) ON DELETE CASCADE,
  passcode_hash TEXT        NOT NULL,  -- SHA-256 hex of the passcode
  enabled       BOOLEAN     NOT NULL DEFAULT true,
  max_capacity  INTEGER,               -- NULL = unlimited
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invitation_configs ENABLE ROW LEVEL SECURITY;

-- Only the flyer creator can read/write their invitation config
CREATE POLICY "Creator manages invitation config"
  ON public.invitation_configs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flyers
      WHERE flyers.id = invitation_configs.flyer_id
        AND flyers.user_id = auth.uid()
    )
  );

-- Anyone can read enabled configs (to check if invitations are active)
CREATE POLICY "Public can read enabled configs"
  ON public.invitation_configs
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);
