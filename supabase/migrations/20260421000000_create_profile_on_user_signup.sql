CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_username text;
BEGIN
  profile_username := new.raw_user_meta_data->>'username';

  IF profile_username IS NULL OR profile_username = '' THEN
    RAISE EXCEPTION 'username is required';
  END IF;

  INSERT INTO public.profiles (id, username)
  VALUES (new.id, profile_username);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
