-- Geospatial index for proximity queries
CREATE INDEX idx_events_location ON public.events USING GIST (location);

-- Filter by status + date (feed queries)
CREATE INDEX idx_events_status_date ON public.events (status, date);

-- Filter by category
CREATE INDEX idx_events_category ON public.events (category_id);

-- User's events
CREATE INDEX idx_events_user ON public.events (user_id);

-- Text search on title (trigram)
CREATE INDEX idx_events_title_trgm ON public.events USING GIN (title extensions.gin_trgm_ops);
