-- Notification Logs Table
-- Tracks all notification attempts (email, push, in-app) for debugging and audit

CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'push', 'in_app')),
    channel TEXT NOT NULL, -- e.g., 'vendor_new_order', 'buyer_order_placed', 'otp_delivery'
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
    recipient TEXT, -- email address or push endpoint (truncated for privacy)
    error_message TEXT,
    retry_count INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by user and order
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_order_id ON notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);

-- RLS policies
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Service role can do anything
CREATE POLICY "Service role full access" ON notification_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Users can view their own notification logs
CREATE POLICY "Users can view own logs" ON notification_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE notification_logs IS 'Audit log for all notification attempts (email, push, in-app)';
