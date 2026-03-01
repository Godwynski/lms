-- 1. Saved Books (Virtual Shelves)
CREATE TABLE IF NOT EXISTS public.saved_books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- RLS for saved_books
ALTER TABLE public.saved_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own saved books" ON public.saved_books
  FOR ALL USING (auth.uid() = user_id);

-- 2. Book Reviews
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

-- RLS for book_reviews
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reviews" ON public.book_reviews FOR SELECT USING (true);
CREATE POLICY "Users can manage their own reviews" ON public.book_reviews
  FOR ALL USING (auth.uid() = user_id);
