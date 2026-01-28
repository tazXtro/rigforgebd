-- ========================================
-- BUILD IMAGES STORAGE BUCKET SETUP
-- ========================================
-- Run this in your Supabase SQL Editor to set up the storage bucket
-- for build images.

-- ----------------------------------------
-- 1. CREATE STORAGE BUCKET
-- ----------------------------------------
-- Note: Bucket creation is typically done via Supabase Dashboard or API
-- but here's the SQL approach for reference

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'build-images',
    'build-images',
    true,  -- Public bucket so images can be accessed without auth
    5242880,  -- 5MB file size limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ----------------------------------------
-- 2. STORAGE POLICIES
-- ----------------------------------------

-- Policy: Anyone can view/download images (public read)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'build-images');

-- Policy: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'build-images'
    AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- Policy: Users can update their own images (path starts with their user ID)
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'build-images'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR auth.role() = 'service_role'
    )
);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'build-images'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR auth.role() = 'service_role'
    )
);

-- ----------------------------------------
-- NOTES
-- ----------------------------------------
-- 
-- File structure in the bucket:
--   build-images/
--     {user_id}/
--       {timestamp}_{uuid}.{extension}
--
-- Example path: build-images/123e4567-e89b-12d3-a456-426614174000/20260129_143022_a1b2c3d4.jpg
--
-- The image URL format will be:
--   https://{project}.supabase.co/storage/v1/object/public/build-images/{user_id}/{filename}
--
-- ----------------------------------------
-- ALTERNATIVE: Create bucket via Dashboard
-- ----------------------------------------
-- If the SQL INSERT doesn't work, create the bucket manually:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New bucket"
-- 3. Name: build-images
-- 4. Public bucket: Yes
-- 5. File size limit: 5MB
-- 6. Allowed MIME types: image/jpeg, image/jpg, image/png, image/gif, image/webp
-- 7. Then run the policies above
