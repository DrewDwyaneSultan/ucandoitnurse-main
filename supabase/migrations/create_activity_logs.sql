-- Create activity_logs table to track user activity (flashcard opens, etc.)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL DEFAULT 'flashcard_open',
    book_id UUID REFERENCES books(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying by user and date
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_activity_logs_user_date ON activity_logs(user_id, created_at);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own activity logs
CREATE POLICY "Users can view own activity logs"
    ON activity_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own activity logs
CREATE POLICY "Users can insert own activity logs"
    ON activity_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own activity logs
CREATE POLICY "Users can delete own activity logs"
    ON activity_logs FOR DELETE
    USING (auth.uid() = user_id);
