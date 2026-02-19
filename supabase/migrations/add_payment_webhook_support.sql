-- Add metadata column to payment_history for storing webhook event data
ALTER TABLE payment_history 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add completed_at column to pending_payments for tracking when payment was completed
ALTER TABLE pending_payments 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create composite index for faster lookups in verify endpoint
CREATE INDEX IF NOT EXISTS idx_pending_payments_user_plan_status 
ON pending_payments(user_id, plan, status);

-- Create unique constraint on payment_history to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_history_unique_payment 
ON payment_history(payment_id) 
WHERE status = 'completed' AND payment_id IS NOT NULL;

-- Add index for payment_id lookup
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_id 
ON payment_history(payment_id);
