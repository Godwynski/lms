-- Add new metadata columns to the public.books table
-- This allows the system to store additional rich data from external APIs

ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS genre text,
ADD COLUMN IF NOT EXISTS page_count integer,
ADD COLUMN IF NOT EXISTS language text;
