-- Add onboarded_by_agent column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_by_agent uuid REFERENCES public.agents(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarded_by_agent ON public.profiles(onboarded_by_agent);