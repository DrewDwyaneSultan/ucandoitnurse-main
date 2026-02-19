export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            books: {
                Row: {
                    id: string;
                    user_id: string;
                    title: string;
                    file_path: string;
                    total_chunks: number;
                    status: "processing" | "ready" | "failed";
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    title: string;
                    file_path: string;
                    total_chunks?: number;
                    status?: "processing" | "ready" | "failed";
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    title?: string;
                    file_path?: string;
                    total_chunks?: number;
                    status?: "processing" | "ready" | "failed";
                    created_at?: string;
                };
            };
            book_chunks: {
                Row: {
                    id: string;
                    user_id: string;
                    book_id: string;
                    chunk_text: string;
                    embedding_vector: number[] | null;
                    source: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    book_id: string;
                    chunk_text: string;
                    embedding_vector?: number[] | null;
                    source?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    book_id?: string;
                    chunk_text?: string;
                    embedding_vector?: number[] | null;
                    source?: string | null;
                    created_at?: string;
                };
            };
            flashcards: {
                Row: {
                    id: string;
                    user_id: string;
                    book_id: string | null;
                    topic: string;
                    question: string;
                    choices: string[];
                    correct_answer: string;
                    explanation: string | null;
                    hint: string | null;
                    is_favorite: boolean;
                    source_chunk_ids: string[];
                    mastered: boolean | null;
                    review_count: number;
                    last_reviewed_at: string | null;
                    created_at: string;
                    // Spaced repetition fields
                    ease_factor: number;
                    interval_days: number;
                    next_review_at: string | null;
                    total_reviews: number;
                    consecutive_correct: number;
                    difficulty: "easy" | "normal" | "hard" | "very_hard";
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    book_id?: string | null;
                    topic: string;
                    question: string;
                    choices: string[];
                    correct_answer: string;
                    explanation?: string | null;
                    hint?: string | null;
                    is_favorite?: boolean;
                    source_chunk_ids?: string[];
                    mastered?: boolean | null;
                    review_count?: number;
                    last_reviewed_at?: string | null;
                    created_at?: string;
                    // Spaced repetition fields
                    ease_factor?: number;
                    interval_days?: number;
                    next_review_at?: string | null;
                    total_reviews?: number;
                    consecutive_correct?: number;
                    difficulty?: "easy" | "normal" | "hard" | "very_hard";
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    book_id?: string;
                    topic?: string;
                    question?: string;
                    choices?: string[];
                    correct_answer?: string;
                    explanation?: string | null;
                    hint?: string | null;
                    is_favorite?: boolean;
                    source_chunk_ids?: string[];
                    mastered?: boolean | null;
                    review_count?: number;
                    last_reviewed_at?: string | null;
                    created_at?: string;
                    // Spaced repetition fields
                    ease_factor?: number;
                    interval_days?: number;
                    next_review_at?: string | null;
                    total_reviews?: number;
                    consecutive_correct?: number;
                    difficulty?: "easy" | "normal" | "hard" | "very_hard";
                };
            };
            study_sessions: {
                Row: {
                    id: string;
                    user_id: string;
                    book_id: string;
                    mode: "scored" | "practice" | "timed";
                    total_cards: number;
                    correct_count: number;
                    incorrect_count: number;
                    skipped_count: number;
                    score_percentage: number;
                    time_spent_seconds: number;
                    completed_at: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    book_id: string;
                    mode?: "scored" | "practice" | "timed";
                    total_cards: number;
                    correct_count?: number;
                    incorrect_count?: number;
                    skipped_count?: number;
                    score_percentage?: number;
                    time_spent_seconds?: number;
                    completed_at?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    book_id?: string;
                    mode?: "scored" | "practice" | "timed";
                    total_cards?: number;
                    correct_count?: number;
                    incorrect_count?: number;
                    skipped_count?: number;
                    score_percentage?: number;
                    time_spent_seconds?: number;
                    completed_at?: string;
                    created_at?: string;
                };
            };
            task_statuses: {
                Row: {
                    id: string;
                    user_id: string;
                    book_id: string;
                    date: string;
                    status: "pending" | "ongoing" | "finished" | "retry";
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    book_id: string;
                    date: string;
                    status: "pending" | "ongoing" | "finished" | "retry";
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    book_id?: string;
                    date?: string;
                    status?: "pending" | "ongoing" | "finished" | "retry";
                    created_at?: string;
                    updated_at?: string;
                };
            };
            user_profiles: {
                Row: {
                    id: string;
                    display_name: string | null;
                    avatar_url: string | null;
                    bio: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    display_name?: string | null;
                    avatar_url?: string | null;
                    bio?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    display_name?: string | null;
                    avatar_url?: string | null;
                    bio?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            friendships: {
                Row: {
                    id: string;
                    requester_id: string;
                    addressee_id: string;
                    status: "pending" | "accepted" | "declined" | "blocked";
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    requester_id: string;
                    addressee_id: string;
                    status: "pending" | "accepted" | "declined" | "blocked";
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    requester_id?: string;
                    addressee_id?: string;
                    status?: "pending" | "accepted" | "declined" | "blocked";
                    created_at?: string;
                    updated_at?: string;
                };
            };
            shared_flashcards: {
                Row: {
                    id: string;
                    flashcard_id: string;
                    sender_id: string;
                    recipient_id: string;
                    message: string | null;
                    is_read: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    flashcard_id: string;
                    sender_id: string;
                    recipient_id: string;
                    message?: string | null;
                    is_read?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    flashcard_id?: string;
                    sender_id?: string;
                    recipient_id?: string;
                    message?: string | null;
                    is_read?: boolean;
                    created_at?: string;
                };
            };
            folders: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    description: string | null;
                    color: string;
                    icon: string;
                    item_count: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    name: string;
                    description?: string | null;
                    color?: string;
                    icon?: string;
                    item_count?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    name?: string;
                    description?: string | null;
                    color?: string;
                    icon?: string;
                    item_count?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            folder_items: {
                Row: {
                    id: string;
                    folder_id: string;
                    user_id: string;
                    item_type: "book" | "flashcard" | "shared_flashcard";
                    item_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    folder_id: string;
                    user_id: string;
                    item_type: "book" | "flashcard" | "shared_flashcard";
                    item_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    folder_id?: string;
                    user_id?: string;
                    item_type?: "book" | "flashcard" | "shared_flashcard";
                    item_id?: string;
                    created_at?: string;
                };
            };
            flashcard_sets: {
                Row: {
                    id: string;
                    folder_id: string;
                    user_id: string;
                    name: string;
                    color: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    folder_id: string;
                    user_id: string;
                    name?: string;
                    color?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    folder_id?: string;
                    user_id?: string;
                    name?: string;
                    color?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            flashcard_set_items: {
                Row: {
                    id: string;
                    set_id: string;
                    flashcard_id: string;
                    position: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    set_id: string;
                    flashcard_id: string;
                    position?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    set_id?: string;
                    flashcard_id?: string;
                    position?: number;
                    created_at?: string;
                };
            };
        };
        Functions: {
            match_chunks: {
                Args: {
                    query_embedding: number[];
                    match_count?: number;
                    filter_book_id?: string | null;
                };
                Returns: {
                    id: string;
                    chunk_text: string;
                    source: string | null;
                    similarity: number;
                }[];
            };
        };
    };
}

// Utility types for application use
export type Book = Database["public"]["Tables"]["books"]["Row"];
export type BookInsert = Database["public"]["Tables"]["books"]["Insert"];
export type BookChunk = Database["public"]["Tables"]["book_chunks"]["Row"];
export type BookChunkInsert = Database["public"]["Tables"]["book_chunks"]["Insert"];
export type Flashcard = Database["public"]["Tables"]["flashcards"]["Row"];
export type FlashcardInsert = Database["public"]["Tables"]["flashcards"]["Insert"];
export type StudySession = Database["public"]["Tables"]["study_sessions"]["Row"];
export type StudySessionInsert = Database["public"]["Tables"]["study_sessions"]["Insert"];

// API response types
export interface ChunkMatch {
    id: string;
    chunk_text: string;
    source: string | null;
    similarity: number;
}

export interface GeneratedFlashcard {
    question: string;
    choices: string[];
    correctAnswer: string;
    explanation: string;
    sourceChunkIds: string[];
}

export interface TextChunk {
    text: string;
    source: string;
    index: number;
}

export type TaskStatus = Database["public"]["Tables"]["task_statuses"]["Row"];

// Social feature types
export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type UserProfileInsert = Database["public"]["Tables"]["user_profiles"]["Insert"];
export type Friendship = Database["public"]["Tables"]["friendships"]["Row"];
export type FriendshipInsert = Database["public"]["Tables"]["friendships"]["Insert"];
export type SharedFlashcard = Database["public"]["Tables"]["shared_flashcards"]["Row"];
export type SharedFlashcardInsert = Database["public"]["Tables"]["shared_flashcards"]["Insert"];

// Extended types for UI
export interface FriendWithProfile extends Friendship {
    friend_profile: UserProfile;
}

export interface SharedFlashcardWithDetails extends SharedFlashcard {
    flashcard: Flashcard;
    sender_profile: UserProfile;
}

// Folder types
export type Folder = Database["public"]["Tables"]["folders"]["Row"];
export type FolderInsert = Database["public"]["Tables"]["folders"]["Insert"];
export type FolderItem = Database["public"]["Tables"]["folder_items"]["Row"];
export type FolderItemInsert = Database["public"]["Tables"]["folder_items"]["Insert"];

export interface FolderWithItems extends Folder {
    items: FolderItem[];
    books?: Book[];
    flashcards?: Flashcard[];
}

// Flashcard Set types
export type FlashcardSet = Database["public"]["Tables"]["flashcard_sets"]["Row"];
export type FlashcardSetInsert = Database["public"]["Tables"]["flashcard_sets"]["Insert"];
export type FlashcardSetItem = Database["public"]["Tables"]["flashcard_set_items"]["Row"];
export type FlashcardSetItemInsert = Database["public"]["Tables"]["flashcard_set_items"]["Insert"];

export interface FlashcardSetWithItems extends FlashcardSet {
    items: FlashcardSetItem[];
    flashcards: Flashcard[];
}
