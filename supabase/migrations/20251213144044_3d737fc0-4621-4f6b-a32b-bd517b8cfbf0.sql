-- Update handle_new_user function to automatically assign admin role to admin1@example.com
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
  
  -- Check if this is the admin user
  IF NEW.email = 'admin1@example.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Assign default 'user' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  
  -- If this is the test user, add seed policies
  IF NEW.email = 'user1@example.com' THEN
    PERFORM public.insert_seed_policies(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;