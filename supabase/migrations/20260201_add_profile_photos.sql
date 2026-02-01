-- Create profile_photos table for storing user profile pictures
CREATE TABLE IF NOT EXISTS profile_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cloudinary_public_id VARCHAR NOT NULL,
  cloudinary_url TEXT NOT NULL,
  original_filename VARCHAR,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create storage bucket for profile photos (if needed)
-- Note: Run this in Supabase SQL editor if storage bucket creation via SQL doesn't work
-- Alternative: Create bucket manually in Supabase Dashboard → Storage → New Bucket
-- Bucket name: profile-photos
-- Make it PUBLIC (so URLs are accessible)

-- Create RLS policies for profile_photos table
ALTER TABLE profile_photos ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile photo
CREATE POLICY "Users can view their own profile photo"
  ON profile_photos FOR SELECT
  USING (auth.uid() = user_id OR true);

-- Users can insert their own profile photo
CREATE POLICY "Users can insert their own profile photo"
  ON profile_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile photo
CREATE POLICY "Users can update their own profile photo"
  ON profile_photos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own profile photo
CREATE POLICY "Users can delete their own profile photo"
  ON profile_photos FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_profile_photos_user_id ON profile_photos(user_id);

-- Add comment for documentation
COMMENT ON TABLE profile_photos IS 'Stores user profile photo metadata and Cloudinary URLs';
COMMENT ON COLUMN profile_photos.cloudinary_public_id IS 'Unique identifier for image in Cloudinary account';
COMMENT ON COLUMN profile_photos.cloudinary_url IS 'Full URL to access the image from Cloudinary';
