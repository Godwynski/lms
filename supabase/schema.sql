-- ============================================================
-- STI College Alabang — Library Management System
-- Master Database Schema (v2.0)
-- Safe to run multiple times. All statements are idempotent.
-- ============================================================


-----------------------------------------------------------
-- 0. Extensions
-----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-----------------------------------------------------------
-- 1. Custom Types (Enums)
-----------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'super_admin', 'librarian', 'circulation_assistant', 'borrower'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.copy_status AS ENUM (
        'available', 'borrowed', 'reserved', 'lost', 'damaged', 'repair', 'retired'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add any missing values to existing enums safely
DO $$ BEGIN ALTER TYPE public.copy_status ADD VALUE IF NOT EXISTS 'damaged'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.copy_status ADD VALUE IF NOT EXISTS 'repair';  EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.copy_status ADD VALUE IF NOT EXISTS 'retired'; EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.fine_status AS ENUM ('unpaid', 'paid', 'waived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-----------------------------------------------------------
-- 2. Shared Functions (must exist before triggers use them)
-----------------------------------------------------------

-- 2a. Auto-update `updated_at` timestamps
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2b. Staff role check (used in RLS policies)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
DECLARE
    v_role public.user_role;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN v_role IN ('super_admin', 'librarian', 'circulation_assistant');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2c. Audit log writer
CREATE OR REPLACE FUNCTION public.process_audit_log()
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

-- 2d. Auto-create profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'borrower'::public.user_role)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-----------------------------------------------------------
-- 3. Profiles Table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'borrower' NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS library_card_qr VARCHAR(255) UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_number VARCHAR(20) UNIQUE;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP TRIGGER IF EXISTS profiles_audit ON public.profiles;
CREATE TRIGGER profiles_audit
    AFTER UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();


-----------------------------------------------------------
-- 4. Audit Logs Table (must exist before other trigger deps)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-----------------------------------------------------------
-- 5. Books Table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.books (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    isbn VARCHAR(13) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS ddc_call_number VARCHAR(50);
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS publisher TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS publication_year INTEGER;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS language VARCHAR(10);
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS shelf_location VARCHAR(255);
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS available_copies INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS total_copies INTEGER DEFAULT 0 NOT NULL;

-- Full-text search vector (regenerate safely)
ALTER TABLE public.books DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.books ADD COLUMN search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(author, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(isbn, '')), 'C')
) STORED;

CREATE INDEX IF NOT EXISTS books_search_idx ON public.books USING GIN (search_vector);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_books_modtime ON public.books;
CREATE TRIGGER update_books_modtime
    BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

-- RLS
DROP POLICY IF EXISTS "Public read access to books" ON public.books;
CREATE POLICY "Public read access to books" ON public.books FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can insert books" ON public.books;
DROP POLICY IF EXISTS "Staff can update books" ON public.books;
DROP POLICY IF EXISTS "Staff can delete books" ON public.books;
CREATE POLICY "Staff can insert books" ON public.books FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff can update books" ON public.books FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff can delete books" ON public.books FOR DELETE USING (public.is_staff());

DROP TRIGGER IF EXISTS books_audit ON public.books;
CREATE TRIGGER books_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.books
    FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();


-----------------------------------------------------------
-- 6. Physical Copies Table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.copies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    barcode_or_qr VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.copies ADD COLUMN IF NOT EXISTS status public.copy_status DEFAULT 'available' NOT NULL;
ALTER TABLE public.copies ADD COLUMN IF NOT EXISTS condition_notes TEXT;

ALTER TABLE public.copies ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_copies_modtime ON public.copies;
CREATE TRIGGER update_copies_modtime
    BEFORE UPDATE ON public.copies
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

-- RLS
DROP POLICY IF EXISTS "Public read access to copies" ON public.copies;
CREATE POLICY "Public read access to copies" ON public.copies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can insert copies" ON public.copies;
DROP POLICY IF EXISTS "Staff can update copies" ON public.copies;
DROP POLICY IF EXISTS "Staff can delete copies" ON public.copies;
CREATE POLICY "Staff can insert copies" ON public.copies FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff can update copies" ON public.copies FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff can delete copies" ON public.copies FOR DELETE USING (public.is_staff());

DROP TRIGGER IF EXISTS copies_audit ON public.copies;
CREATE TRIGGER copies_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.copies
    FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();


-----------------------------------------------------------
-- 7. Borrowing Records Table
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.borrowing_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    book_id UUID REFERENCES public.books(id) NOT NULL,
    borrower_id UUID REFERENCES auth.users(id) NOT NULL,
    due_date TIMESTAMPTZ,
    returned_date TIMESTAMPTZ,
    status TEXT DEFAULT 'borrowed',
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Idempotent constraint update
ALTER TABLE public.borrowing_records DROP CONSTRAINT IF EXISTS borrowing_records_status_check;
ALTER TABLE public.borrowing_records ADD CONSTRAINT borrowing_records_status_check
    CHECK (status IN ('borrowed', 'returned', 'overdue', 'pending', 'rejected', 'pending_return'));

ALTER TABLE public.borrowing_records ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_borrowing_records_modtime ON public.borrowing_records;
CREATE TRIGGER update_borrowing_records_modtime
    BEFORE UPDATE ON public.borrowing_records
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();


-----------------------------------------------------------
-- 8. Saved Books (Virtual Shelf)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_books (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, book_id)
);

ALTER TABLE public.saved_books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own saved books" ON public.saved_books;
CREATE POLICY "Users can manage their own saved books" ON public.saved_books
    FOR ALL USING (auth.uid() = user_id);


-----------------------------------------------------------
-- 9. Book Reviews
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.book_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, book_id)
);

ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reviews" ON public.book_reviews;
DROP POLICY IF EXISTS "Users can manage their own reviews" ON public.book_reviews;
CREATE POLICY "Anyone can read reviews" ON public.book_reviews FOR SELECT USING (true);
CREATE POLICY "Users can manage their own reviews" ON public.book_reviews
    FOR ALL USING (auth.uid() = user_id);


-----------------------------------------------------------
-- 10. Theses Table (Phase 1 Addition)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.theses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    course VARCHAR(100),
    publication_year INTEGER,
    abstract TEXT,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.theses ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_theses_modtime ON public.theses;
CREATE TRIGGER update_theses_modtime
    BEFORE UPDATE ON public.theses
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

DROP POLICY IF EXISTS "Public read access to theses" ON public.theses;
CREATE POLICY "Public read access to theses" ON public.theses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can insert theses" ON public.theses;
DROP POLICY IF EXISTS "Staff can update theses" ON public.theses;
DROP POLICY IF EXISTS "Staff can delete theses" ON public.theses;
CREATE POLICY "Staff can insert theses" ON public.theses FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff can update theses" ON public.theses FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff can delete theses" ON public.theses FOR DELETE USING (public.is_staff());

DROP TRIGGER IF EXISTS theses_audit ON public.theses;
CREATE TRIGGER theses_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.theses
    FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();


-----------------------------------------------------------
-- 11. Holds Table (Phase 1 Addition)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    borrower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    resolved_at TIMESTAMPTZ
);

ALTER TABLE public.holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own holds" ON public.holds;
CREATE POLICY "Users can view own holds" ON public.holds FOR SELECT USING (auth.uid() = borrower_id);

DROP TRIGGER IF EXISTS holds_audit ON public.holds;
CREATE TRIGGER holds_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.holds
    FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();


-----------------------------------------------------------
-- 12. Fines Table (Phase 1 Addition)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    borrowing_record_id UUID REFERENCES public.borrowing_records(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status public.fine_status DEFAULT 'unpaid' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    resolved_at TIMESTAMPTZ
);

ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own fines" ON public.fines;
CREATE POLICY "Users can view own fines" ON public.fines FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.borrowing_records
        WHERE id = public.fines.borrowing_record_id AND borrower_id = auth.uid()
    )
);

DROP TRIGGER IF EXISTS fines_audit ON public.fines;
CREATE TRIGGER fines_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.fines
    FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();


-----------------------------------------------------------
-- 13. Stored Procedure: atomic_checkout
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atomic_checkout(
    p_borrower_id UUID,
    p_book_id UUID,
    p_status TEXT DEFAULT 'borrowed'
)
RETURNS JSON AS $$
DECLARE
    v_available_copies INT;
    v_due_date TIMESTAMPTZ;
    v_record_id UUID;
BEGIN
    -- 1. Lock the book row to prevent race conditions
    SELECT available_copies INTO v_available_copies
    FROM public.books WHERE id = p_book_id FOR UPDATE;

    -- 2. Verify availability
    IF v_available_copies IS NULL THEN
        RETURN json_build_object('error', 'Book not found.');
    END IF;

    IF v_available_copies <= 0 THEN
        RETURN json_build_object('error', 'Book is not available for checkout.');
    END IF;

    -- 3. Verify no active Holds on this borrower
    IF EXISTS (SELECT 1 FROM public.holds WHERE borrower_id = p_borrower_id AND active = true) THEN
        RETURN json_build_object('error', 'Borrower account is on Hold and cannot borrow books.');
    END IF;

    -- 4. Verify no unpaid Fines on this borrower
    IF EXISTS (
        SELECT 1 FROM public.fines f
        JOIN public.borrowing_records br ON f.borrowing_record_id = br.id
        WHERE br.borrower_id = p_borrower_id AND f.status = 'unpaid'
    ) THEN
        RETURN json_build_object('error', 'Borrower has unpaid fines. Please settle them before borrowing.');
    END IF;

    -- 5. Set due date (14-day loan period)
    v_due_date := NOW() + INTERVAL '14 days';

    -- 6. Create borrowing record
    INSERT INTO public.borrowing_records (book_id, borrower_id, due_date, status)
    VALUES (p_book_id, p_borrower_id, v_due_date, p_status)
    RETURNING id INTO v_record_id;

    -- 7. Decrement available copies
    UPDATE public.books
    SET available_copies = available_copies - 1
    WHERE id = p_book_id;

    RETURN json_build_object('success', true, 'record_id', v_record_id, 'due_date', v_due_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-----------------------------------------------------------
-- 14. Stored Procedure: atomic_return
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atomic_return(p_isbn TEXT)
RETURNS JSON AS $$
DECLARE
    v_book_id UUID;
    v_available_copies INT;
    v_title TEXT;
    v_record_id UUID;
BEGIN
    -- 1. Find and lock the book by ISBN
    SELECT id, available_copies, title
    INTO v_book_id, v_available_copies, v_title
    FROM public.books WHERE isbn = p_isbn FOR UPDATE;

    IF v_book_id IS NULL THEN
        RETURN json_build_object('error', 'Book not found in the library system.');
    END IF;

    -- 2. Find the oldest active borrowing record
    SELECT id INTO v_record_id
    FROM public.borrowing_records
    WHERE book_id = v_book_id AND status = 'borrowed'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_record_id IS NULL THEN
        RETURN json_build_object('error', 'No active borrowing record found for "' || v_title || '".');
    END IF;

    -- 3. Mark record as returned
    UPDATE public.borrowing_records
    SET status = 'returned', returned_date = NOW()
    WHERE id = v_record_id;

    -- 4. Increment available copies
    UPDATE public.books
    SET available_copies = available_copies + 1
    WHERE id = v_book_id;

    RETURN json_build_object('success', true, 'message', 'Successfully returned "' || v_title || '".');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
