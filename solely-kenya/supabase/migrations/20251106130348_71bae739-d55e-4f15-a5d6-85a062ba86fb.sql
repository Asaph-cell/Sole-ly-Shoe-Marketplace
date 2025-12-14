-- Grant admin role to the current user for testing
-- Replace with your actual user ID from the auth.users table
-- You can find your user ID by running: SELECT id, email FROM auth.users;

-- First, let's create a helper function to assign admin role
CREATE OR REPLACE FUNCTION public.assign_admin_role(_user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Get user ID from email
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _user_email;
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', _user_email;
  END IF;
  
  -- Insert admin role (ignore if already exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Now you can assign admin role by email
-- UNCOMMENT AND UPDATE THE LINE BELOW WITH YOUR EMAIL:
-- SELECT public.assign_admin_role('your-email@example.com');

-- Update the products policies to ensure admins can bypass all checks
-- First drop conflicting policies
DROP POLICY IF EXISTS "Vendors can insert draft products only" ON public.products;

-- Recreate with admin bypass
CREATE POLICY "Vendors can insert draft products only"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins can insert without restrictions
  has_role(auth.uid(), 'admin') OR
  -- Vendors can insert draft products with limit
  (
    auth.uid() = vendor_id AND 
    has_role(auth.uid(), 'vendor') AND 
    status = 'draft' AND
    (SELECT count(*) FROM products WHERE vendor_id = auth.uid() AND status = 'draft') < 50
  )
);