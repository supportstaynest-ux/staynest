-- Enable RLS on reports if not already enabled
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create reports
CREATE POLICY "Users can insert reports" 
ON public.reports FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = reported_by);

-- Allow admins to view all reports (assuming admins have role='admin')
-- Or for simplicity, we can let users only view their own reports, but the admin backend bypasses RLS if using service role key, which it usually does not. If admin uses standard login, we need to allow admins to view all reports.
-- Let's check how admin gets reports. Often getReports() uses a service key, or we need to add a policy for admins. It's safer to just set:
CREATE POLICY "Users can view their own reports" 
ON public.reports FOR SELECT 
TO authenticated 
USING (auth.uid() = reported_by);

CREATE POLICY "Admins can view all reports" 
ON public.reports FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update reports" 
ON public.reports FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
