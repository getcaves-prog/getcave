-- Update the role CHECK constraint on profiles to include admin and lector
-- Must drop the existing constraint first, then add the new one
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user', 'lector', 'promoter'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
