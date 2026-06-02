-- Allow admins to update flyer status
CREATE POLICY "Admins can update flyers"
  ON public.flyers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (true);

-- Allow admins to delete flyers
CREATE POLICY "Admins can delete flyers"
  ON public.flyers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
