-- Migration: Add proper spaced repetition fields to flashcards
-- Run this in your Supabase SQL Editor

-- Add spaced repetition fields to flashcards table
ALTER TABLE public.flashcards
ADD COLUMN IF NOT EXISTS ease_factor DECIMAL(4,2) DEFAULT 2.5,
ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS consecutive_correct INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'normal';

-- Create index for efficient due card queries
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review 
ON public.flashcards(user_id, next_review_at) 
WHERE next_review_at IS NOT NULL;

-- Create index for difficulty-based queries
CREATE INDEX IF NOT EXISTS idx_flashcards_difficulty
ON public.flashcards(user_id, difficulty);

-- Add comments
COMMENT ON COLUMN public.flashcards.ease_factor IS 'SM-2 ease factor (1.3 - 2.5+), higher = easier';
COMMENT ON COLUMN public.flashcards.interval_days IS 'Current interval in days until next review';
COMMENT ON COLUMN public.flashcards.next_review_at IS 'Scheduled date/time for next review';
COMMENT ON COLUMN public.flashcards.total_reviews IS 'Total number of times this card has been reviewed';
COMMENT ON COLUMN public.flashcards.consecutive_correct IS 'Number of consecutive correct answers';
COMMENT ON COLUMN public.flashcards.difficulty IS 'Card difficulty: easy, normal, hard, very_hard';
