-- Add expires_at column with default 7 days from creation
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '7 days');

-- Update existing events to have expires_at
UPDATE public.events SET expires_at = created_at + interval '7 days' WHERE expires_at IS NULL;

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_events_expires_at ON public.events(expires_at) WHERE status = 'active';
