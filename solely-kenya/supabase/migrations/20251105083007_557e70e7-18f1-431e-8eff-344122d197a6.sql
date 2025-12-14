-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  is_read boolean DEFAULT false,
  related_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Enable realtime for conversations
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER TABLE conversations REPLICA IDENTITY FULL;

-- Function to create notification for new message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id uuid;
  sender_name text;
BEGIN
  -- Get the recipient (the other person in the conversation)
  SELECT CASE 
    WHEN NEW.sender_id = c.vendor_id THEN c.buyer_id
    ELSE c.vendor_id
  END INTO recipient_id
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  -- Get sender name from profiles
  SELECT COALESCE(full_name, 'Someone') INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create notification for recipient
  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (
      recipient_id,
      'New Message',
      sender_name || ' sent you a message',
      'message',
      NEW.conversation_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to create notification on new message
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- Function to check subscription expiry and create notifications
CREATE OR REPLACE FUNCTION public.check_subscription_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_record RECORD;
BEGIN
  -- Check for subscriptions expiring in 7 days
  FOR sub_record IN 
    SELECT vendor_id, end_date, plan
    FROM subscriptions
    WHERE is_active = true
    AND end_date > now()
    AND end_date <= now() + interval '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE user_id = subscriptions.vendor_id 
      AND type = 'subscription_expiring_7'
      AND created_at > now() - interval '7 days'
    )
  LOOP
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (
      sub_record.vendor_id,
      'Subscription Expiring Soon',
      'Your ' || sub_record.plan || ' subscription expires in 7 days',
      'subscription_expiring_7',
      NULL
    );
  END LOOP;

  -- Check for subscriptions expiring in 1 day
  FOR sub_record IN 
    SELECT vendor_id, end_date, plan
    FROM subscriptions
    WHERE is_active = true
    AND end_date > now()
    AND end_date <= now() + interval '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE user_id = subscriptions.vendor_id 
      AND type = 'subscription_expiring_1'
      AND created_at > now() - interval '1 day'
    )
  LOOP
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (
      sub_record.vendor_id,
      'Subscription Expiring Tomorrow',
      'Your ' || sub_record.plan || ' subscription expires tomorrow!',
      'subscription_expiring_1',
      NULL
    );
  END LOOP;
END;
$$;