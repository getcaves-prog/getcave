-- Create flyers table for the infinite canvas
create table if not exists public.flyers (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  canvas_x double precision not null default 0,
  canvas_y double precision not null default 0,
  rotation double precision not null default 0,
  width integer not null default 280,
  height integer not null default 400,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.flyers enable row level security;

-- Allow public read access (flyers are public content)
create policy "Flyers are publicly readable"
  on public.flyers
  for select
  to anon, authenticated
  using (true);

-- Allow authenticated users to insert flyers
create policy "Authenticated users can insert flyers"
  on public.flyers
  for insert
  to authenticated
  with check (true);

-- Index for ordering
create index if not exists idx_flyers_created_at on public.flyers (created_at desc);
