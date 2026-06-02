-- Allow users to update and delete their own flyers
CREATE POLICY "Users update own flyers" ON public.flyers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own flyers" ON public.flyers
  FOR DELETE USING (auth.uid() = user_id);
