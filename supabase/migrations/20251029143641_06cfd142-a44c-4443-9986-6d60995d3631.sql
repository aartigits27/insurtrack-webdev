-- Add emi_date column to insurance_policies table
ALTER TABLE public.insurance_policies 
ADD COLUMN emi_date INTEGER CHECK (emi_date >= 1 AND emi_date <= 31);

COMMENT ON COLUMN public.insurance_policies.emi_date IS 'Day of the month when EMI is due (1-31)';

-- Update the insert_seed_policies function to include emi_date
CREATE OR REPLACE FUNCTION public.insert_seed_policies(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    emi_date,
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
    5,
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
    emi_date,
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
    10,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '10 years',
    'Complete home insurance with fire, theft, and natural disaster coverage'
  );
END;
$function$;

-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily cron job to check for EMI reminders (runs at 9 AM every day)
SELECT cron.schedule(
  'send-emi-reminders-daily',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://znmqfxbfnsrrnaenwghn.supabase.co/functions/v1/send-emi-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubXFmeGJmbnNycm5hZW53Z2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NDE2OTQsImV4cCI6MjA3NzIxNzY5NH0.aB7eYx6sq3hFVGwASkSV-qAwmldqb-ymd0Lt2FVz6Wk"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);