-- Add monthly_emi column to insurance_policies
ALTER TABLE public.insurance_policies 
ADD COLUMN monthly_emi numeric;

-- Create seed user (password will be hashed automatically by Supabase Auth)
-- Note: This is a placeholder SQL. The actual user creation needs to be done through Supabase Auth API
-- We'll insert the user's profile and policies after they sign up with email: alice@example.com, password: 123456

-- Insert seed data for alice@example.com
-- First, we need to get the user_id after they sign up
-- For now, we'll create a function that can be called after signup

-- Create a function to insert seed policies for a given user_id
CREATE OR REPLACE FUNCTION insert_seed_policies(target_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert Life Insurance policy
  INSERT INTO public.insurance_policies (
    user_id,
    policy_name,
    policy_provider,
    policy_number,
    insurance_type,
    policy_status,
    coverage_amount,
    premium_amount,
    monthly_emi,
    start_date,
    end_date,
    description
  ) VALUES (
    target_user_id,
    'Life Protection Plus',
    'LIC India',
    'LIC-2024-001',
    'life',
    'active',
    1000000,
    5000,
    5000,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '20 years',
    'Comprehensive life insurance coverage for family protection'
  );

  -- Insert House Insurance policy
  INSERT INTO public.insurance_policies (
    user_id,
    policy_name,
    policy_provider,
    policy_number,
    insurance_type,
    policy_status,
    coverage_amount,
    premium_amount,
    monthly_emi,
    start_date,
    end_date,
    description
  ) VALUES (
    target_user_id,
    'Home Shield Pro',
    'HDFC ERGO',
    'HOME-2024-001',
    'house',
    'active',
    1000000,
    5000,
    5000,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '10 years',
    'Complete home insurance with fire, theft, and natural disaster coverage'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;