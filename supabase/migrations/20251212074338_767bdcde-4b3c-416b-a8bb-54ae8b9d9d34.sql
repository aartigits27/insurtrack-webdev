-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create agents table
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  agent_code TEXT NOT NULL UNIQUE,
  commission_rate NUMERIC NOT NULL DEFAULT 10 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on agents
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- RLS policies for agents
CREATE POLICY "Agents can view their own record"
ON public.agents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all agents"
ON public.agents
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert agents"
ON public.agents
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update agents"
ON public.agents
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete agents"
ON public.agents
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create agent_clients table (assigns clients to agents)
CREATE TABLE public.agent_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (agent_id, client_id)
);

-- Enable RLS on agent_clients
ALTER TABLE public.agent_clients ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_clients
CREATE POLICY "Agents can view their own clients"
ON public.agent_clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.id = agent_clients.agent_id 
    AND agents.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all agent_clients"
ON public.agent_clients
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert agent_clients"
ON public.agent_clients
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update agent_clients"
ON public.agent_clients
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete agent_clients"
ON public.agent_clients
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create policy_commissions table
CREATE TABLE public.policy_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.insurance_policies(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  commission_rate NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (policy_id, agent_id)
);

-- Enable RLS on policy_commissions
ALTER TABLE public.policy_commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for policy_commissions
CREATE POLICY "Agents can view their own commissions"
ON public.policy_commissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agents 
    WHERE agents.id = policy_commissions.agent_id 
    AND agents.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all commissions"
ON public.policy_commissions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add agent_id to insurance_policies for tracking which agent sold the policy
ALTER TABLE public.insurance_policies 
ADD COLUMN agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;

-- Allow agents to view policies of their assigned clients
CREATE POLICY "Agents can view their clients policies"
ON public.insurance_policies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agent_clients ac
    JOIN public.agents a ON a.id = ac.agent_id
    WHERE ac.client_id = insurance_policies.user_id
    AND a.user_id = auth.uid()
  )
);

-- Allow admins to view all policies
CREATE POLICY "Admins can view all policies"
ON public.insurance_policies
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage all policies
CREATE POLICY "Admins can manage all policies"
ON public.insurance_policies
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow agents to view their clients profiles
CREATE POLICY "Agents can view their clients profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agent_clients ac
    JOIN public.agents a ON a.id = ac.agent_id
    WHERE ac.client_id = profiles.id
    AND a.user_id = auth.uid()
  )
);

-- Update handle_new_user function to assign 'user' role by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile for the new user
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- If this is the test user, add seed policies
  IF NEW.email = 'user1@example.com' THEN
    PERFORM public.insert_seed_policies(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for updated_at on agents
CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();