-- Update the handle_new_user function to automatically add seed policies for test user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile for the new user
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- If this is the test user, add seed policies
  IF NEW.email = 'user1@example.com' THEN
    PERFORM public.insert_seed_policies(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$function$;