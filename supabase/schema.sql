-- LMS Initial Schema Setup: Phase 1 Core Inventory (MARC 21 & DDC Support)
-- This script safely creates new tables or updates existing ones with new columns.

-----------------------------------------------------------
-- 1. Custom Types for Roles and Statuses
-----------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'librarian', 'circulation_assistant', 'borrower');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE copy_status AS ENUM ('available', 'borrowed', 'reserved', 'lost', 'damaged', 'retired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-----------------------------------------------------------
-- 2. Profiles Table (Extending Supabase Auth)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add columns if the table already existed before this script
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'borrower'::user_role NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS library_card_qr VARCHAR(255) UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Turn on Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-----------------------------------------------------------
-- 3. Books (Catalog/Title Level) - Supporting MARC 21 Fields
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.books (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,          
    author TEXT,                  
    isbn VARCHAR(13) UNIQUE,      
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add columns if the table already existed
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS ddc_call_number VARCHAR(50);
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS publisher TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS publication_year INTEGER;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Drop the generated column before attempting to recreate it (if it existed) just to be safe
ALTER TABLE public.books DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.books ADD COLUMN search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(author, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(isbn, '')), 'C')
) STORED;

-- Create Index only if it doesn't exist
CREATE INDEX IF NOT EXISTS books_search_idx ON public.books USING GIN (search_vector);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-----------------------------------------------------------
-- 4. Physical Copies (Item Level) - QR tracking
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.copies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    barcode_or_qr VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add columns if table existed
ALTER TABLE public.copies ADD COLUMN IF NOT EXISTS status copy_status DEFAULT 'available'::copy_status NOT NULL;
ALTER TABLE public.copies ADD COLUMN IF NOT EXISTS condition_notes TEXT;
ALTER TABLE public.copies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.copies ENABLE ROW LEVEL SECURITY;

-----------------------------------------------------------
-- 5. Audit Logs Table (Tracking Admin Activity)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-----------------------------------------------------------
-- 6. Triggers for `updated_at`
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ language 'plpgsql';

-- Drop triggers if they exist to recreate them safely
DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
DROP TRIGGER IF EXISTS update_books_modtime ON public.books;
DROP TRIGGER IF EXISTS update_copies_modtime ON public.copies;

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_books_modtime BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_copies_modtime BEFORE UPDATE ON public.copies FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-----------------------------------------------------------
-- 7. Audit Trigger Function
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (admin_id, action, table_name, record_id, old_data)
        VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (admin_id, action, table_name, record_id, old_data, new_data)
        VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (admin_id, action, table_name, record_id, new_data)
        VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop audit triggers if they exist
DROP TRIGGER IF EXISTS books_audit ON public.books;
DROP TRIGGER IF EXISTS copies_audit ON public.copies;
DROP TRIGGER IF EXISTS profiles_audit ON public.profiles;

CREATE TRIGGER books_audit AFTER INSERT OR UPDATE OR DELETE ON public.books FOR EACH ROW EXECUTE PROCEDURE process_audit_log();
CREATE TRIGGER copies_audit AFTER INSERT OR UPDATE OR DELETE ON public.copies FOR EACH ROW EXECUTE PROCEDURE process_audit_log();
CREATE TRIGGER profiles_audit AFTER UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE process_audit_log();

-----------------------------------------------------------
-- 8. Basic RLS (Row Level Security) Policies
-----------------------------------------------------------
-- Drop existing policies to recreate them safely
DROP POLICY IF EXISTS "Public read access to books" ON public.books;
DROP POLICY IF EXISTS "Public read access to copies" ON public.copies;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Anyone can read books and copies
CREATE POLICY "Public read access to books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Public read access to copies" ON public.copies FOR SELECT USING (true);

-- Users can read their own profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
