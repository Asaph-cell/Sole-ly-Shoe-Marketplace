-- Drop the existing insert policy that allows direct active product creation
DROP POLICY IF EXISTS "Vendors can create limited draft products" ON public.products;

-- Create new policy: vendors can only insert DRAFT products
CREATE POLICY "Vendors can insert draft products only"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = vendor_id 
  AND has_role(auth.uid(), 'vendor'::app_role)
  AND status = 'draft'::product_status
  AND (
    SELECT count(*) 
    FROM products 
    WHERE vendor_id = auth.uid() 
    AND status = 'draft'::product_status
  ) < 50
);

-- Drop existing update policy
DROP POLICY IF EXISTS "Vendors can update their own products" ON public.products;

-- Create new update policy with subscription check for publishing
CREATE POLICY "Vendors can update own products with subscription check"
ON public.products
FOR UPDATE
TO authenticated
USING (
  auth.uid() = vendor_id 
  AND has_role(auth.uid(), 'vendor'::app_role)
)
WITH CHECK (
  auth.uid() = vendor_id
  AND has_role(auth.uid(), 'vendor'::app_role)
  AND (
    -- If not changing to active, allow the update
    status <> 'active'::product_status
    OR
    -- If already active, allow keeping it active
    (SELECT p.status FROM products p WHERE p.id = products.id) = 'active'::product_status
    OR
    -- If changing to active, check for active subscription with product limit
    (
      status = 'active'::product_status
      AND (SELECT p.status FROM products p WHERE p.id = products.id) = 'draft'::product_status
      AND EXISTS (
        SELECT 1
        FROM subscriptions s
        WHERE s.vendor_id = auth.uid()
        AND s.is_active = true
        AND s.end_date > now()
        AND (
          s.product_limit IS NULL
          OR (
            SELECT count(*)
            FROM products
            WHERE vendor_id = auth.uid()
            AND status = 'active'::product_status
          ) < s.product_limit
        )
      )
    )
  )
);