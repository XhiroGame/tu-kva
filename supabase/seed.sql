-- ============================================================
-- BEER MUSIC - Seed Data (Development)
-- ============================================================
-- Run this AFTER all migrations to set up an initial test business.
-- Only use in development. DO NOT run in production.

-- 1. Create a test business
INSERT INTO businesses (id, name, slug)
VALUES (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Mi Cervecería Demo',
    'mi-cerveceria'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Create a test table
-- qr_token is the UUID embedded in QR code URL
INSERT INTO tables (id, business_id, table_name, qr_token, active)
VALUES (
    'b2c3d4e5-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Mesa 1',
    'test-qr-token-mesa-1',
    TRUE
)
ON CONFLICT (qr_token) DO NOTHING;

-- 3. NOTE: To create an admin user, do the following:
--    a) Go to Supabase Dashboard → Authentication → Users
--    b) Click "Add user" → Enter email + password
--    c) Copy the generated UUID from the user list
--    d) Run this INSERT replacing the UUID and email:

-- INSERT INTO users (id, business_id, email, role)
-- VALUES (
--     'REPLACE-WITH-SUPABASE-AUTH-USER-UUID',
--     'a1b2c3d4-0000-0000-0000-000000000001',
--     'admin@micerveceria.com',
--     'admin'
-- );
