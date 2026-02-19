-- Migration: Allow manual flashcards without a book reference
-- Run this in your Supabase SQL Editor

-- Make book_id nullable to support manual flashcards
ALTER TABLE public.flashcards
ALTER COLUMN book_id DROP NOT NULL;

-- Add a comment explaining the nullable book_id
COMMENT ON COLUMN public.flashcards.book_id IS 'Reference to the source book. NULL for manually created flashcards.';
