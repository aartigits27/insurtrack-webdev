-- Allow agents to insert policies for their assigned clients
CREATE POLICY "Agents can insert policies for their clients"
ON public.insurance_policies
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM agent_clients ac
    JOIN agents a ON a.id = ac.agent_id
    WHERE ac.client_id = user_id
    AND a.user_id = auth.uid()
  )
);

-- Allow agents to update policies for their assigned clients
CREATE POLICY "Agents can update their clients policies"
ON public.insurance_policies
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM agent_clients ac
    JOIN agents a ON a.id = ac.agent_id
    WHERE ac.client_id = insurance_policies.user_id
    AND a.user_id = auth.uid()
  )
);