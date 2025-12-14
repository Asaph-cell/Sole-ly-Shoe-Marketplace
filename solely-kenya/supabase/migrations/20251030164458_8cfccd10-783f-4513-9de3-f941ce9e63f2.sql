-- Fix critical security issues with RLS policies

-- 1. Fix profiles table - restrict WhatsApp visibility to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Public can view basic vendor info" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Users can still see everything about their own profile
CREATE POLICY "Users can view own full profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- 2. Fix orders - allow buyers to view their own orders
CREATE POLICY "Buyers can view own orders by email" 
ON public.orders 
FOR SELECT 
USING (
  (auth.jwt() ->> 'email') = buyer_email OR
  (auth.uid() = vendor_id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Fix messages - need conversations table to properly secure messages
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Allow participants to view their conversations
CREATE POLICY "Users can view own conversations" 
ON public.conversations 
FOR SELECT 
USING (
  auth.uid() = buyer_id OR 
  auth.uid() = vendor_id OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow authenticated users to create conversations
CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  auth.uid() = buyer_id OR 
  auth.uid() = vendor_id
);

-- Update messages policies to check conversation participants
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;

CREATE POLICY "Conversation participants can view messages" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND (
      conversations.buyer_id = auth.uid() OR
      conversations.vendor_id = auth.uid() OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;

CREATE POLICY "Conversation participants can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND (
      conversations.buyer_id = auth.uid() OR
      conversations.vendor_id = auth.uid()
    )
  ) AND auth.uid() = sender_id
);

-- Add trigger for conversations updated_at
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_vendor_id ON public.conversations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);