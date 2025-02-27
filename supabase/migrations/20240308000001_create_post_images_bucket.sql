
-- Create a new storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create a policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-images');

-- Create a policy to allow public access to read images
CREATE POLICY "Allow public to read post images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'post-images');
