-- Fix handle_new_user to support Google OAuth and other providers.
--
-- Email signup: passes username + terms_version in metadata → creates profile + terms record.
-- OAuth (Google): no username/terms_version → derives username from email, skips terms record
--   so the consent gate fires on first login.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_username text;
  tv text;
  base_username text;
  suffix int := 0;
BEGIN
  profile_username := new.raw_user_meta_data->>'username';
  tv := new.raw_user_meta_data->>'terms_version';

  -- OAuth providers don't pass username — derive it from email
  IF profile_username IS NULL OR profile_username = '' THEN
    base_username := lower(split_part(COALESCE(new.email, 'user'), '@', 1));
    base_username := substr(regexp_replace(base_username, '[^a-z0-9_]', '', 'g'), 1, 20);
    IF base_username = '' THEN base_username := 'user'; END IF;

    profile_username := base_username;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = profile_username) LOOP
      suffix := suffix + 1;
      profile_username := base_username || suffix::text;
    END LOOP;
  END IF;

  INSERT INTO public.profiles (id, username)
  VALUES (new.id, profile_username);

  -- Only record terms acceptance when explicitly provided via the signup form.
  -- OAuth users go through the TermsConsentGate on first login instead.
  IF tv IS NOT NULL THEN
    INSERT INTO public.terms_acceptances (user_id, terms_version)
    VALUES (new.id, tv);
  END IF;

  RETURN new;
END;
$$;
