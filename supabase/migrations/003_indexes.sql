-- ============================================================
-- BEER MUSIC - Migration 003: Indexes for Performance
-- ============================================================
-- Run AFTER migration 001.

-- ---- businesses ----
CREATE INDEX IF NOT EXISTS idx_businesses_slug
    ON businesses(slug);

-- ---- users ----
CREATE INDEX IF NOT EXISTS idx_users_business_id
    ON users(business_id);

CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);

-- ---- tables ----
CREATE INDEX IF NOT EXISTS idx_tables_business_id
    ON tables(business_id);

CREATE INDEX IF NOT EXISTS idx_tables_qr_token
    ON tables(qr_token);

CREATE INDEX IF NOT EXISTS idx_tables_active
    ON tables(business_id, active)
    WHERE active = TRUE;

-- ---- songs ----
CREATE INDEX IF NOT EXISTS idx_songs_provider
    ON songs(provider, provider_song_id);

-- ---- playlist_queue ----
-- Main index for fetching the active queue in order
CREATE INDEX IF NOT EXISTS idx_queue_business_status_position
    ON playlist_queue(business_id, status, position);

-- For finding the currently playing song quickly
CREATE INDEX IF NOT EXISTS idx_queue_playing
    ON playlist_queue(business_id, status)
    WHERE status = 'playing';

-- For history queries
CREATE INDEX IF NOT EXISTS idx_queue_requested_at
    ON playlist_queue(business_id, requested_at DESC);

-- For table-specific requests
CREATE INDEX IF NOT EXISTS idx_queue_table
    ON playlist_queue(table_id);
