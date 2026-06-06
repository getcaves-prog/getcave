-- ============================================================================
-- Messages Realtime — enable Supabase Realtime for the messages table
-- ----------------------------------------------------------------------------
-- Supabase Realtime only streams rows from tables that belong to the
-- supabase_realtime publication. This migration adds public.messages to it.
--
-- RLS still applies to realtime: the existing SELECT policy on messages
-- (public read) means all connected clients receive INSERT/UPDATE events.
--
-- Guard: wrapped in a DO block that checks pg_publication_tables first so
-- re-running on a fresh local reset (pnpm db:reset) never errors.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname   = 'supabase_realtime'
    AND    schemaname = 'public'
    AND    tablename  = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END;
$$;
