-- Table to record user acceptance of terms and conditions
CREATE TABLE public.terms_acceptances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  terms_version text NOT NULL DEFAULT '1.0'
);

CREATE INDEX idx_terms_acceptances_user_id ON public.terms_acceptances(user_id);

ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own terms acceptance" ON public.terms_acceptances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins read all terms acceptances" ON public.terms_acceptances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allows existing users to self-record their acceptance via the consent modal
CREATE POLICY "Users insert own terms acceptance" ON public.terms_acceptances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update handle_new_user to also record terms acceptance at signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_username text;
  tv text;
BEGIN
  profile_username := new.raw_user_meta_data->>'username';
  tv := COALESCE(new.raw_user_meta_data->>'terms_version', '1.0');

  IF profile_username IS NULL OR profile_username = '' THEN
    RAISE EXCEPTION 'username is required';
  END IF;

  INSERT INTO public.profiles (id, username)
  VALUES (new.id, profile_username);

  INSERT INTO public.terms_acceptances (user_id, terms_version)
  VALUES (new.id, tv);

  RETURN new;
END;
$$;
