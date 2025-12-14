-- Fix the publish_product function to properly validate subscriptions
CREATE OR REPLACE FUNCTION public.publish_product(product_id_to_publish uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_vendor_id uuid;
  has_active_subscription boolean;
  active_product_count integer;
  subscription_product_limit integer;
  user_is_admin boolean;
BEGIN
  -- 1. Get the current user's ID from the session
  current_vendor_id := auth.uid();

  -- 2. Ensure user is authenticated
  IF current_vendor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  -- 3. Check if user is admin
  user_is_admin := has_role(current_vendor_id, 'admin');

  -- 4. If user is admin, skip subscription checks and publish immediately
  IF user_is_admin THEN
    UPDATE public.products
    SET status = 'active'
    WHERE id = product_id_to_publish
      AND vendor_id = current_vendor_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND_OR_NOT_OWNED';
    END IF;

    RETURN;
  END IF;

  -- 5. For non-admin users, check for an active subscription
  SELECT
    is_active,
    product_limit
  INTO
    has_active_subscription,
    subscription_product_limit
  FROM public.subscriptions
  WHERE vendor_id = current_vendor_id
    AND is_active = TRUE
    AND end_date > NOW()
  ORDER BY end_date DESC
  LIMIT 1;

  -- 6. If no subscription found or subscription is not active, raise an exception
  -- CRITICAL FIX: Check for NULL (no subscription) OR FALSE (inactive)
  IF has_active_subscription IS NULL OR has_active_subscription = FALSE THEN
    RAISE EXCEPTION 'ACTIVE_SUBSCRIPTION_REQUIRED';
  END IF;

  -- 7. Check if the vendor has reached their product limit (if a limit exists)
  IF subscription_product_limit IS NOT NULL THEN
    SELECT count(*)
    INTO active_product_count
    FROM public.products
    WHERE vendor_id = current_vendor_id AND status = 'active';

    IF active_product_count >= subscription_product_limit THEN
      RAISE EXCEPTION 'PRODUCT_LIMIT_REACHED';
    END IF;
  END IF;

  -- 8. Publish the product by setting its status to 'active'
  UPDATE public.products
  SET status = 'active'
  WHERE id = product_id_to_publish
    AND vendor_id = current_vendor_id;

  -- 9. Check if the update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND_OR_NOT_OWNED';
  END IF;

END;
$$;