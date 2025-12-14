-- Add foreign key constraints for data integrity
ALTER TABLE public.conversations
  ADD CONSTRAINT fk_conversations_vendor
  FOREIGN KEY (vendor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.conversations
  ADD CONSTRAINT fk_conversations_buyer
  FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.messages
  ADD CONSTRAINT fk_messages_conversation
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_messages_sender
  FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.orders
  ADD CONSTRAINT fk_orders_product
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_orders_vendor
  FOREIGN KEY (vendor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.product_views
  ADD CONSTRAINT fk_product_views_product
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.products
  ADD CONSTRAINT fk_products_vendor
  FOREIGN KEY (vendor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.reviews
  ADD CONSTRAINT fk_reviews_product
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_reviews_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT fk_subscriptions_vendor
  FOREIGN KEY (vendor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add indexes for performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_conversations_vendor ON public.conversations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_product ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_email ON public.orders(buyer_email);
CREATE INDEX IF NOT EXISTS idx_product_views_product ON public.product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON public.products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_vendor ON public.subscriptions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);

-- Update orders RLS policy to require authentication for better security
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

CREATE POLICY "Authenticated users or valid email can create orders"
ON public.orders
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL OR 
  (buyer_email IS NOT NULL AND buyer_phone IS NOT NULL AND buyer_name IS NOT NULL)
);

-- Add policy to prevent unlimited draft product spam
CREATE POLICY "Vendors can create limited draft products"
ON public.products
FOR INSERT
WITH CHECK (
  (auth.uid() = vendor_id) 
  AND has_role(auth.uid(), 'vendor'::app_role)
  AND (
    -- Allow if creating active product (subscription check will happen via publish_product function)
    status = 'active'::product_status
    OR
    -- Allow draft only if vendor has less than 50 draft products
    (
      status = 'draft'::product_status
      AND (
        SELECT COUNT(*) 
        FROM public.products 
        WHERE vendor_id = auth.uid() AND status = 'draft'::product_status
      ) < 50
    )
  )
);