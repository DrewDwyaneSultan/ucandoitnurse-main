-- Migration: Add hint and is_favorite columns to flashcards table
-- Run this in your Supabase SQL Editor

-- Add hint column for storing hints for each flashcard
ALTER TABLE public.flashcards
ADD COLUMN IF NOT EXISTS hint TEXT DEFAULT NULL;

-- Add is_favorite column for marking favorite flashcards
ALTER TABLE public.flashcards
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Create an index for faster favorite queries
CREATE INDEX IF NOT EXISTS idx_flashcards_is_favorite 
ON public.flashcards(user_id, is_favorite) 
WHERE is_favorite = TRUE;

-- Update RLS policies to allow update of these new fields
-- (This should work with existing policies, but included for completeness)

COMMENT ON COLUMN public.flashcards.hint IS 'Optional hint text to help the user answer the question';
COMMENT ON COLUMN public.flashcards.is_favorite IS 'Whether the user has marked this flashcard as a favorite';
