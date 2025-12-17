-- Add 'shipped' to order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'shipped';
