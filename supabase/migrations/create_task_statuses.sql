-- Create task_statuses table to store user's task progress
CREATE TABLE IF NOT EXISTS task_statuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    date TEXT NOT NULL, -- Format: YYYY-MM-DD or 'all_YYYY' for view all mode
    status TEXT NOT NULL CHECK (status IN ('pending', 'ongoing', 'finished', 'retry')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one status per user/book/date combination
    UNIQUE(user_id, book_id, date)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_task_statuses_user_id ON task_statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_task_statuses_date ON task_statuses(date);
CREATE INDEX IF NOT EXISTS idx_task_statuses_user_date ON task_statuses(user_id, date);

-- Enable Row Level Security
ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view their own task statuses
CREATE POLICY "Users can view own task statuses" ON task_statuses
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own task statuses
CREATE POLICY "Users can insert own task statuses" ON task_statuses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own task statuses
CREATE POLICY "Users can update own task statuses" ON task_statuses
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own task statuses
CREATE POLICY "Users can delete own task statuses" ON task_statuses
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_task_statuses_updated_at
    BEFORE UPDATE ON task_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_task_statuses_updated_at();
