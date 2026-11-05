-- ============================================================
-- BEER MUSIC - Migration 002: Row Level Security (RLS) Policies
-- ============================================================
-- Run AFTER migration 001.
-- These policies ensure data isolation between businesses.

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE businesses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables         ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: Get the business_id for the current user
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_business_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT business_id FROM users WHERE id = auth.uid()
$$;

-- ============================================================
-- BUSINESSES policies
-- ============================================================

-- Admins can read their own business
CREATE POLICY "Admin can view own business"
    ON businesses FOR SELECT
    USING (id = get_my_business_id());

-- ============================================================
-- USERS policies
-- ============================================================

-- Admins can view their own user record
CREATE POLICY "Admin can view own user"
    ON users FOR SELECT
    USING (id = auth.uid());

-- ============================================================
-- TABLES policies
-- ============================================================

-- Admins can manage tables belonging to their business
CREATE POLICY "Admin can manage own tables"
    ON tables FOR ALL
    USING (business_id = get_my_business_id());

-- Anonymous users (clients via QR) can read active tables
-- (needed to validate QR token - done server-side with service role)
-- Note: QR validation is handled by the backend with service role key,
--       not directly from the client, so no anon policy needed here.

-- ============================================================
-- SONGS policies
-- ============================================================

-- Everyone can read songs (they are global/cached, not business-specific)
CREATE POLICY "Anyone can read songs"
    ON songs FOR SELECT
    USING (true);

-- Only authenticated users (admins/backend) can insert songs
CREATE POLICY "Authenticated can insert songs"
    ON songs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- PLAYLIST_QUEUE policies
-- ============================================================

-- Anyone can read the queue for a business
-- (clients need to see the playlist in real-time)
-- Frontend identifies the business via business_id passed from the server
CREATE POLICY "Anyone can view queue"
    ON playlist_queue FOR SELECT
    USING (true);

-- Only authenticated admins can modify the queue
-- Client requests go through the backend API (service role) with validation
CREATE POLICY "Admin can manage queue"
    ON playlist_queue FOR ALL
    USING (business_id = get_my_business_id());

-- ============================================================
-- NOTES ON CLIENT QUEUE INSERTS
-- ============================================================
-- Clients (unauthenticated) add songs via the backend API.
-- The backend uses the service role key to bypass RLS.
-- This keeps rate limiting, duplicate prevention, and validation
-- entirely on the server side, preventing client-side manipulation.
