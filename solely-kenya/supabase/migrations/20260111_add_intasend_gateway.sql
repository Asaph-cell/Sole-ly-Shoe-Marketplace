-- Add 'intasend' to payment_gateway enum
ALTER TYPE payment_gateway ADD VALUE IF NOT EXISTS 'intasend';
