-- Add profile photo columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN profile_photo_url TEXT DEFAULT NULL,
ADD COLUMN profile_photo_cloudinary_public_id TEXT DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN public.profiles.profile_photo_url IS 'Cloudinary URL for user profile photo';
COMMENT ON COLUMN public.profiles.profile_photo_cloudinary_public_id IS 'Cloudinary public ID for deletion purposes';

-- Create index for user lookups
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- Enable RLS policies for profile photo
-- Allow users to update their own profile photos
-- Note: These policies should already exist from the profiles table setup
-- If they don't, create them manually or run the following:
-- CREATE POLICY "Users can update their own profile"
-- ON public.profiles FOR UPDATE
-- USING (auth.uid() = user_id)
-- WITH CHECK (auth.uid() = user_id);
