-- Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#5B79A6',
    icon TEXT DEFAULT 'folder',
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create folder_items table (junction table for folder contents)
CREATE TABLE IF NOT EXISTS public.folder_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('book', 'flashcard', 'shared_flashcard')),
    item_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(folder_id, item_type, item_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_items_folder_id ON public.folder_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_items_user_id ON public.folder_items(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_items_item ON public.folder_items(item_type, item_id);

-- Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for folders
CREATE POLICY "Users can view their own folders"
    ON public.folders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
    ON public.folders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
    ON public.folders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
    ON public.folders FOR DELETE
    USING (auth.uid() = user_id);

-- RLS policies for folder_items
CREATE POLICY "Users can view their own folder items"
    ON public.folder_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add items to their own folders"
    ON public.folder_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove items from their own folders"
    ON public.folder_items FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update item_count when items are added/removed
CREATE OR REPLACE FUNCTION update_folder_item_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.folders 
        SET item_count = item_count + 1, updated_at = NOW()
        WHERE id = NEW.folder_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.folders 
        SET item_count = item_count - 1, updated_at = NOW()
        WHERE id = OLD.folder_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for item count
DROP TRIGGER IF EXISTS trigger_update_folder_item_count ON public.folder_items;
CREATE TRIGGER trigger_update_folder_item_count
    AFTER INSERT OR DELETE ON public.folder_items
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_item_count();
