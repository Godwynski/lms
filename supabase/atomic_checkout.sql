-- Run this in the Supabase SQL Editor
-- This creates a stored procedure to safely check out a book

CREATE OR REPLACE FUNCTION atomic_checkout(p_borrower_id UUID, p_book_id UUID, p_status TEXT DEFAULT 'borrowed')
RETURNS JSON AS $$
DECLARE
  v_available_copies INT;
  v_due_date TIMESTAMPTZ;
  v_record_id UUID;
BEGIN
  -- 1. Lock the specific book row for update
  SELECT available_copies INTO v_available_copies
  FROM public.books
  WHERE id = p_book_id
  FOR UPDATE;

  -- 2. Verify availability
  IF v_available_copies <= 0 THEN
    RETURN json_build_object('error', 'Book is not available for checkout');
  END IF;

  -- 3. Calculate due date
  v_due_date := NOW() + INTERVAL '14 days';

  -- 4. Insert borrowing record
  INSERT INTO public.borrowing_records (book_id, borrower_id, due_date, status)
  VALUES (p_book_id, p_borrower_id, v_due_date, p_status)
  RETURNING id INTO v_record_id;

  -- 5. Decrement available copies
  UPDATE public.books
  SET available_copies = available_copies - 1
  WHERE id = p_book_id;

  -- 6. Successful Return
  RETURN json_build_object('success', true, 'record_id', v_record_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
