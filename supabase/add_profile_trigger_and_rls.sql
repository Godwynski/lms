-- 1. Auto-Create Profile Trigger
-- Automatically insert a row into public.profiles when auth.users gets a new user.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'borrower'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists to be safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();


-- 2. Book CRUD RLS Policies
-- We need to check if the current user has super_admin, librarian, or circulation_assistant role.

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
DECLARE
  user_role public.user_role;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role IN ('super_admin', 'librarian', 'circulation_assistant');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Books logic
DROP POLICY IF EXISTS "Staff can insert books" ON public.books;
DROP POLICY IF EXISTS "Staff can update books" ON public.books;
DROP POLICY IF EXISTS "Staff can delete books" ON public.books;

CREATE POLICY "Staff can insert books" ON public.books FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff can update books" ON public.books FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff can delete books" ON public.books FOR DELETE USING (public.is_staff());


-- Copies logic (If needed)
DROP POLICY IF EXISTS "Staff can insert copies" ON public.copies;
DROP POLICY IF EXISTS "Staff can update copies" ON public.copies;
DROP POLICY IF EXISTS "Staff can delete copies" ON public.copies;

CREATE POLICY "Staff can insert copies" ON public.copies FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff can update copies" ON public.copies FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff can delete copies" ON public.copies FOR DELETE USING (public.is_staff());
