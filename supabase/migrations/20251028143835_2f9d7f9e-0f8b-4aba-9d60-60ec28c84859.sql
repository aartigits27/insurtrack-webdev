-- Fix search_path for insert_seed_policies function
DROP FUNCTION IF EXISTS insert_seed_policies(UUID);

CREATE OR REPLACE FUNCTION insert_seed_policies(target_user_id UUID)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;