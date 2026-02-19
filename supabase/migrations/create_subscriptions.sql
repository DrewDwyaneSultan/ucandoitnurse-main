-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'unlimited')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Daily credits tracking
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credits_used INTEGER DEFAULT 0,
    credits_limit INTEGER DEFAULT 3, -- Free tier default
    reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Credit usage history (for analytics)
CREATE TABLE IF NOT EXISTS credit_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL DEFAULT 'flashcard_generation',
    credits_consumed INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_user_credits_reset_date ON user_credits(reset_date);
CREATE INDEX idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX idx_credit_usage_created_at ON credit_usage(created_at);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscription"
    ON user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
    ON user_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
    ON user_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for user_credits
CREATE POLICY "Users can view own credits"
    ON user_credits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits"
    ON user_credits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
    ON user_credits FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for credit_usage
CREATE POLICY "Users can view own credit usage"
    ON credit_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit usage"
    ON credit_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to get or create user credits
CREATE OR REPLACE FUNCTION get_or_create_user_credits(p_user_id UUID)
RETURNS TABLE(credits_used INTEGER, credits_limit INTEGER, reset_date DATE) AS $$
DECLARE
    v_plan TEXT;
    v_limit INTEGER;
BEGIN
    -- Get user's plan
    SELECT COALESCE(us.plan, 'free') INTO v_plan
    FROM user_subscriptions us
    WHERE us.user_id = p_user_id AND us.status = 'active';
    
    IF v_plan IS NULL THEN
        v_plan := 'free';
    END IF;
    
    -- Set limit based on plan
    -- Credit limits: Free=3, Starter=20, Pro=100, Unlimited=9999
    v_limit := CASE v_plan
        WHEN 'free' THEN 3
        WHEN 'starter' THEN 20
        WHEN 'pro' THEN 100
        WHEN 'unlimited' THEN 9999
        ELSE 3
    END;
    
    -- Insert or update credits, reset if new day
    INSERT INTO user_credits (user_id, credits_used, credits_limit, reset_date)
    VALUES (p_user_id, 0, v_limit, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE SET
        credits_used = CASE 
            WHEN user_credits.reset_date < CURRENT_DATE THEN 0 
            ELSE user_credits.credits_used 
        END,
        credits_limit = v_limit,
        reset_date = CURRENT_DATE,
        updated_at = NOW();
    
    RETURN QUERY
    SELECT uc.credits_used, uc.credits_limit, uc.reset_date
    FROM user_credits uc
    WHERE uc.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use credits
CREATE OR REPLACE FUNCTION use_credit(p_user_id UUID, p_action_type TEXT DEFAULT 'flashcard_generation')
RETURNS TABLE(success BOOLEAN, credits_remaining INTEGER, message TEXT) AS $$
DECLARE
    v_credits_used INTEGER;
    v_credits_limit INTEGER;
BEGIN
    -- Get current credits (this also resets if new day)
    SELECT uc.credits_used, uc.credits_limit INTO v_credits_used, v_credits_limit
    FROM get_or_create_user_credits(p_user_id) uc;
    
    -- Check if user has credits
    IF v_credits_used >= v_credits_limit THEN
        RETURN QUERY SELECT FALSE, 0, 'No credits remaining. Upgrade to continue.'::TEXT;
        RETURN;
    END IF;
    
    -- Deduct credit
    UPDATE user_credits 
    SET credits_used = credits_used + 1, updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log usage
    INSERT INTO credit_usage (user_id, action_type, credits_consumed)
    VALUES (p_user_id, p_action_type, 1);
    
    RETURN QUERY SELECT TRUE, (v_credits_limit - v_credits_used - 1), 'Credit used successfully.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
