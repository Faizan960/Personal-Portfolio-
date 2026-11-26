-- =============================================================================
-- Migration: 005_storage_buckets_policies.sql
-- Description: Storage buckets and RLS policies on storage.objects.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create Storage Buckets
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'portfolio-public', 
        'portfolio-public', 
        true, 
        10485760, -- 10MB limit
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']
    ),
    (
        'portfolio-private', 
        'portfolio-private', 
        false, 
        52428800, -- 50MB limit
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']
    )
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 2. Storage Objects RLS Policies
-- -----------------------------------------------------------------------------

-- Public read access: ONLY for 'portfolio-public' bucket
DROP POLICY IF EXISTS "Public Read Access for Public Portfolio Bucket" ON storage.objects;
CREATE POLICY "Public Read Access for Public Portfolio Bucket"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'portfolio-public');

-- Admin full access for all portfolio storage objects
DROP POLICY IF EXISTS "Admin Full Access for Portfolio Storage" ON storage.objects;
CREATE POLICY "Admin Full Access for Portfolio Storage"
    ON storage.objects FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());
