-- Add color column to existing categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color text;

-- Junction table for flyer <-> category (many-to-many)
CREATE TABLE IF NOT EXISTS flyer_categories (
  flyer_id uuid REFERENCES flyers(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (flyer_id, category_id)
);

ALTER TABLE flyer_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON flyer_categories FOR SELECT USING (true);
CREATE POLICY "Authenticated insert" ON flyer_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner delete" ON flyer_categories FOR DELETE TO authenticated USING (
  flyer_id IN (SELECT id FROM flyers WHERE user_id = auth.uid())
);

-- Update existing categories with colors and ensure all default categories exist
UPDATE categories SET color = '#8B5CF6' WHERE slug = 'music' AND color IS NULL;
UPDATE categories SET color = '#F59E0B' WHERE slug = 'food-drinks' AND color IS NULL;
UPDATE categories SET color = '#10B981' WHERE slug = 'sports' AND color IS NULL;
UPDATE categories SET color = '#EC4899' WHERE slug = 'art-culture' AND color IS NULL;
UPDATE categories SET color = '#6366F1' WHERE slug = 'nightlife' AND color IS NULL;
UPDATE categories SET color = '#14B8A6' WHERE slug = 'markets' AND color IS NULL;
UPDATE categories SET color = '#F97316' WHERE slug = 'community' AND color IS NULL;
UPDATE categories SET color = '#3B82F6' WHERE slug = 'education' AND color IS NULL;
UPDATE categories SET color = '#8B5CF6' WHERE slug = 'tech' AND color IS NULL;
UPDATE categories SET color = '#6B7280' WHERE slug = 'other' AND color IS NULL;

-- Seed any missing default categories
INSERT INTO categories (name, slug, icon, color) VALUES
  ('Music', 'music', '🎵', '#8B5CF6'),
  ('Food & Drinks', 'food-drinks', '🍕', '#F59E0B'),
  ('Sports', 'sports', '⚽', '#10B981'),
  ('Art & Culture', 'art-culture', '🎨', '#EC4899'),
  ('Nightlife', 'nightlife', '🌙', '#6366F1'),
  ('Markets', 'markets', '🛍️', '#14B8A6'),
  ('Community', 'community', '🤝', '#F97316'),
  ('Education', 'education', '📚', '#3B82F6'),
  ('Tech', 'tech', '💻', '#8B5CF6'),
  ('Other', 'other', '📌', '#6B7280')
ON CONFLICT (name) DO NOTHING;
