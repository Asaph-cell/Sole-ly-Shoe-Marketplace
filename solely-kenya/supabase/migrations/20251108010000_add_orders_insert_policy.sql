-- Add INSERT policy for orders table to allow customers to create orders
CREATE POLICY "orders_insert_customer" ON orders
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Add INSERT policy for order_items to allow inserting items for orders created by the customer
CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND auth.uid() = o.customer_id
    )
  );

-- Add INSERT policy for order_shipping_details
CREATE POLICY "order_shipping_insert" ON order_shipping_details
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND auth.uid() = o.customer_id
    )
  );

-- Add INSERT policy for payments
CREATE POLICY "payments_insert" ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND auth.uid() = o.customer_id
    )
  );

-- Add INSERT policy for escrow_transactions
CREATE POLICY "escrow_insert" ON escrow_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND auth.uid() = o.customer_id
    )
  );

