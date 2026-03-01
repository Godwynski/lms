-- Run this in the Supabase SQL Editor
-- This creates a stored procedure to safely return a book

CREATE OR REPLACE FUNCTION atomic_return(p_isbn TEXT)
RETURNS JSON AS $$
DECLARE
  v_book_id UUID;
  v_available_copies INT;
  v_title TEXT;
  v_record_id UUID;
BEGIN
  -- 1. Find the book by ISBN and lock it
  SELECT id, available_copies, title INTO v_book_id, v_available_copies, v_title
  FROM public.books
  WHERE isbn = p_isbn
  FOR UPDATE;

  IF v_book_id IS NULL THEN
    RETURN json_build_object('error', 'Book not found in the local library system.');
  END IF;

  -- 2. Find the active borrowing record and lock it
  SELECT id INTO v_record_id
  FROM public.borrowing_records
  WHERE book_id = v_book_id AND status = 'borrowed'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_record_id IS NULL THEN
    RETURN json_build_object('error', 'No active borrowing records found for "' || v_title || '". It might already be returned or was never checked out.');
  END IF;

  -- 3. Mark the record as returned
  UPDATE public.borrowing_records
  SET status = 'returned', returned_date = NOW()
  WHERE id = v_record_id;

  -- 4. Increment the available copies
  UPDATE public.books
  SET available_copies = available_copies + 1
  WHERE id = v_book_id;

  -- 5. Successful Return
  RETURN json_build_object('success', true, 'message', 'Successfully returned "' || v_title || '"!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
