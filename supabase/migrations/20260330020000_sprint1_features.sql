-- Sprint 1 Features Migration
-- Adds: flyer duration, profile phone, saved_flyers, flyer_views, user_id on flyers, get_user_stats function

-- ============================================================
-- 1. Flyer Duration
-- ============================================================
ALTER TABLE flyers ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE flyers ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 30;

-- Backfill existing flyers
UPDATE flyers SET expires_at = created_at + interval '30 days' WHERE expires_at IS NULL;

-- ============================================================
-- 2. User Profile Stats — add missing columns
-- ============================================================
-- bio and city already exist, only phone is missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- ============================================================
-- 3. Add user_id to flyers (if not exists)
-- ============================================================
ALTER TABLE flyers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- 4. Favorites / Saved Flyers
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_flyers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flyer_id uuid REFERENCES flyers(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, flyer_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_flyers_user ON saved_flyers(user_id);

ALTER TABLE saved_flyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saves"
  ON saved_flyers FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. Flyer Views Tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS flyer_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  flyer_id uuid REFERENCES flyers(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flyer_views_flyer ON flyer_views(flyer_id);

ALTER TABLE flyer_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a view"
  ON flyer_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Flyer owners can read views"
  ON flyer_views FOR SELECT
  USING (
    flyer_id IN (SELECT id FROM flyers WHERE flyers.user_id = auth.uid())
  );

-- ============================================================
-- 6. Function: get_user_stats
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_stats(target_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'flyers_posted', (SELECT count(*) FROM flyers WHERE user_id = target_user_id AND status = 'approved'),
    'total_views', (SELECT count(*) FROM flyer_views fv JOIN flyers f ON fv.flyer_id = f.id WHERE f.user_id = target_user_id),
    'total_saves', (SELECT count(*) FROM saved_flyers sf JOIN flyers f ON sf.flyer_id = f.id WHERE f.user_id = target_user_id)
  );
$$;
