-- Fix RLS policies for flyer_views and saved_flyers

-- flyer_views: anyone can read view counts (not just flyer owners)
DROP POLICY IF EXISTS "Flyer owners can read views" ON flyer_views;
CREATE POLICY "Anyone can read view counts"
  ON flyer_views FOR SELECT
  USING (true);

-- flyer_views: allow anonymous views too (guests)
DROP POLICY IF EXISTS "Anyone can record a view" ON flyer_views;
CREATE POLICY "Anyone can record a view"
  ON flyer_views FOR INSERT
  WITH CHECK (true);

-- saved_flyers: ensure WITH CHECK exists for insert
DROP POLICY IF EXISTS "Users can manage their own saves" ON saved_flyers;
CREATE POLICY "Users can read their own saves"
  ON saved_flyers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saves"
  ON saved_flyers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saves"
  ON saved_flyers FOR DELETE
  USING (auth.uid() = user_id);
