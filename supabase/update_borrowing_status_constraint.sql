-- Update the borrowing_records check constraint to allow 'pending', 'rejected', and 'pending_return' statuses.
ALTER TABLE public.borrowing_records DROP CONSTRAINT IF EXISTS borrowing_records_status_check;
ALTER TABLE public.borrowing_records ADD CONSTRAINT borrowing_records_status_check CHECK (status IN ('borrowed', 'returned', 'overdue', 'pending', 'rejected', 'pending_return'));
