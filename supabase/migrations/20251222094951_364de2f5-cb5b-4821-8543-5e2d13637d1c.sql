-- Allow authenticated users (clients) to read agent records for agent code verification
CREATE POLICY "Authenticated users can view agents for verification" 
ON public.agents 
FOR SELECT 
TO authenticated
USING (true);