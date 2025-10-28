-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create enum for insurance types
CREATE TYPE public.insurance_type AS ENUM ('life', 'health', 'vehicle', 'house');

-- Create enum for policy status
CREATE TYPE public.policy_status AS ENUM ('active', 'pending', 'expired', 'cancelled');

-- Create insurance_policies table
CREATE TABLE public.insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  policy_provider TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  insurance_type public.insurance_type NOT NULL,
  policy_status public.policy_status NOT NULL DEFAULT 'active',
  coverage_amount DECIMAL(12, 2),
  premium_amount DECIMAL(10, 2),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

-- Create policies for insurance_policies
CREATE POLICY "Users can view their own policies"
  ON public.insurance_policies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own policies"
  ON public.insurance_policies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own policies"
  ON public.insurance_policies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own policies"
  ON public.insurance_policies FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_policies
  BEFORE UPDATE ON public.insurance_policies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();