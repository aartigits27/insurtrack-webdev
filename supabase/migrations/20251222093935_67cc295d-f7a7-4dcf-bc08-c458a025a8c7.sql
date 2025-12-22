-- Allow clients to view their own agent_clients assignment
CREATE POLICY "Users can view their own agent assignment" 
ON public.agent_clients 
FOR SELECT 
USING (auth.uid() = client_id);