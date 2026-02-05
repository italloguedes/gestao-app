-- Create the storage bucket for certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('certidoes', 'certidoes', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public uploads (since the form is public)
CREATE POLICY "Public Upload"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'certidoes');

-- Policy to allow public viewing
CREATE POLICY "Public Select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'certidoes');

-- Policy to allow admins to delete/update (optional but good)
CREATE POLICY "Admin All"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'certidoes' AND (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_id = auth.uid()::text
    AND (users.role = 'admin' OR users.role = 'superadmin')
)));


