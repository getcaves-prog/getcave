-- Allow anon insert for seeding purposes
-- In production, you'd restrict this to authenticated only
create policy "Anon users can insert flyers"
  on public.flyers
  for insert
  to anon
  with check (true);
