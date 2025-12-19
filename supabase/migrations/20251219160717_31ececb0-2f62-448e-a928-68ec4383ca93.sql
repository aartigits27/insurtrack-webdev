-- Allow agents to insert/update policies for their assigned clients
-- (Fixes: "new row violates row-level security policy" when adding policy from Agent Dashboard)

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

-- Agents can INSERT policies for their assigned clients
CREATE POLICY "agents_insert_assigned_client_policies"
ON public.insurance_policies
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'agent')
  AND agent_id IN (
    SELECT a.id
    FROM public.agents a
    WHERE a.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.agent_clients ac
    WHERE ac.agent_id = public.insurance_policies.agent_id
      AND ac.client_id = public.insurance_policies.user_id
  )
);

-- Agents can UPDATE policies for their assigned clients
CREATE POLICY "agents_update_assigned_client_policies"
ON public.insurance_policies
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'agent')
  AND agent_id IN (
    SELECT a.id
    FROM public.agents a
    WHERE a.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.agent_clients ac
    WHERE ac.agent_id = public.insurance_policies.agent_id
      AND ac.client_id = public.insurance_policies.user_id
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'agent')
  AND agent_id IN (
    SELECT a.id
    FROM public.agents a
    WHERE a.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.agent_clients ac
    WHERE ac.agent_id = public.insurance_policies.agent_id
      AND ac.client_id = public.insurance_policies.user_id
  )
);

-- Admins can view all policies (for admin client/policy views)
CREATE POLICY "admins_select_all_policies"
ON public.insurance_policies
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
