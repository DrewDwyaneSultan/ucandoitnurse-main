-- Create flashcard_sets table for grouping flashcards within folders
CREATE TABLE IF NOT EXISTS public.flashcard_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Untitled Set',
    color VARCHAR(7) DEFAULT '#5B79A6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create flashcard_set_items to link flashcards to sets
CREATE TABLE IF NOT EXISTS public.flashcard_set_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(set_id, flashcard_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_folder_id ON public.flashcard_sets(folder_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user_id ON public.flashcard_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_set_items_set_id ON public.flashcard_set_items(set_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_set_items_flashcard_id ON public.flashcard_set_items(flashcard_id);

-- Enable RLS
ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_set_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for flashcard_sets
CREATE POLICY "Users can view their own flashcard sets"
    ON public.flashcard_sets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flashcard sets"
    ON public.flashcard_sets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard sets"
    ON public.flashcard_sets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard sets"
    ON public.flashcard_sets FOR DELETE
    USING (auth.uid() = user_id);

-- RLS policies for flashcard_set_items (based on set ownership)
CREATE POLICY "Users can view items in their sets"
    ON public.flashcard_set_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.flashcard_sets 
        WHERE id = flashcard_set_items.set_id 
        AND user_id = auth.uid()
    ));

CREATE POLICY "Users can add items to their sets"
    ON public.flashcard_set_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.flashcard_sets 
        WHERE id = flashcard_set_items.set_id 
        AND user_id = auth.uid()
    ));

CREATE POLICY "Users can update items in their sets"
    ON public.flashcard_set_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.flashcard_sets 
        WHERE id = flashcard_set_items.set_id 
        AND user_id = auth.uid()
    ));

CREATE POLICY "Users can delete items from their sets"
    ON public.flashcard_set_items FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.flashcard_sets 
        WHERE id = flashcard_set_items.set_id 
        AND user_id = auth.uid()
    ));

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_flashcard_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_flashcard_sets_updated_at
    BEFORE UPDATE ON public.flashcard_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_flashcard_sets_updated_at();
