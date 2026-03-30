ALTER TABLE flyers ADD COLUMN IF NOT EXISTS is_promoted boolean DEFAULT false;
ALTER TABLE flyers ADD COLUMN IF NOT EXISTS promoted_until timestamptz;
CREATE INDEX IF NOT EXISTS idx_flyers_promoted ON flyers(is_promoted) WHERE is_promoted = true;
