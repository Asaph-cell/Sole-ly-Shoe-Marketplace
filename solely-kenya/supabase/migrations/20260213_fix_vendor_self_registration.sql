-- Fix: Allow users to self-register as vendors
-- The user_roles RLS policy only allows admins to insert roles,
-- so vendor registration was silently failing. This SECURITY DEFINER
-- function safely bypasses RLS to assign only the 'vendor' role
-- to the calling user.

CREATE OR REPLACE FUNCTION public.register_as_vendor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only assigns 'vendor' role (never admin) to the calling user only
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'vendor')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
