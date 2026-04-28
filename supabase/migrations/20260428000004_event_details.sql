-- Event details: add optional description and social copy to flyers
ALTER TABLE public.flyers
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS social_copy TEXT;

-- Extra images for flyers (gallery)
CREATE TABLE IF NOT EXISTS public.flyer_extra_images (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  flyer_id     UUID        NOT NULL REFERENCES public.flyers(id) ON DELETE CASCADE,
  image_url    TEXT        NOT NULL,
  display_order INTEGER    NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flyer_extra_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read extra images"
  ON public.flyer_extra_images FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Flyer owner can insert extra images"
  ON public.flyer_extra_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flyers
      WHERE id = flyer_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Flyer owner can delete extra images"
  ON public.flyer_extra_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flyers
      WHERE id = flyer_id AND user_id = auth.uid()
    )
  );
