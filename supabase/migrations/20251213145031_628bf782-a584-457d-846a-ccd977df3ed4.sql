-- Ensure admin1@example.com has admin role in user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin1@example.com'
ON CONFLICT (user_id, role) DO NOTHING;