CREATE TABLE IF NOT EXISTS flyer_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  flyer_id uuid REFERENCES flyers(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(flyer_id, reporter_id)
);

ALTER TABLE flyer_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can report" ON flyer_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can read" ON flyer_reports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
