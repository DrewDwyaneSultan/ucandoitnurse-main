-- Pending payments table (tracks checkout sessions)
CREATE TABLE IF NOT EXISTS pending_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'unlimited')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    amount_php INTEGER NOT NULL,
    payment_id TEXT,
    payment_method TEXT DEFAULT 'gcash',
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_pending_payments_user_id ON pending_payments(user_id);
CREATE INDEX idx_pending_payments_session_id ON pending_payments(session_id);
CREATE INDEX idx_pending_payments_status ON pending_payments(status);
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_created_at ON payment_history(created_at);

-- Enable RLS
ALTER TABLE pending_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pending_payments
CREATE POLICY "Users can view own pending payments"
    ON pending_payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert pending payments"
    ON pending_payments FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can update pending payments"
    ON pending_payments FOR UPDATE
    USING (true);

-- RLS Policies for payment_history
CREATE POLICY "Users can view own payment history"
    ON payment_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert payment history"
    ON payment_history FOR INSERT
    WITH CHECK (true);
