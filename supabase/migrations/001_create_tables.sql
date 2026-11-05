-- ============================================================
-- BEER MUSIC - Migration 001: Create Tables
-- ============================================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com → Your Project → SQL Editor

-- Enable UUID extension (usually pre-enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BUSINESSES
-- One row per venue/bar/brewery using the platform
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,           -- URL-friendly identifier (e.g. "mi-cerveceria")
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT businesses_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

COMMENT ON TABLE  businesses            IS 'Registered businesses/venues using BEER MUSIC';
COMMENT ON COLUMN businesses.slug       IS 'URL-safe identifier used in routes and QR codes';

-- ============================================================
-- USERS (Admins)
-- One admin per business (extendable to multi-admin)
-- Linked to Supabase Auth via UUID
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id           UUID PRIMARY KEY,              -- Same UUID as Supabase Auth user
    business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    email        TEXT NOT NULL UNIQUE,
    role         TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users             IS 'Admin users linked to Supabase Auth';
COMMENT ON COLUMN users.id          IS 'Must match the UUID from Supabase Auth (auth.users.id)';
COMMENT ON COLUMN users.business_id IS 'Business this admin manages';

-- ============================================================
-- TABLES (Mesas del establecimiento)
-- Each table gets a unique QR token
-- ============================================================
CREATE TABLE IF NOT EXISTS tables (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    table_name   TEXT NOT NULL,                -- Display name, e.g. "Mesa 5", "Barra VIP"
    qr_token     TEXT NOT NULL UNIQUE,         -- UUID token embedded in QR URL
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tables_name_per_business UNIQUE (business_id, table_name)
);

COMMENT ON TABLE  tables           IS 'Physical tables in a venue, each with a unique QR code';
COMMENT ON COLUMN tables.qr_token  IS 'UUID embedded in QR code URL for client identification';
COMMENT ON COLUMN tables.active    IS 'Inactive tables are hidden and cannot add songs';

-- ============================================================
-- SONGS (Song catalog / cache)
-- Stores song metadata fetched from the music provider
-- Avoids repeated API calls for the same song
-- ============================================================
CREATE TABLE IF NOT EXISTS songs (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider         TEXT NOT NULL DEFAULT 'jamendo',  -- Music provider name
    provider_song_id TEXT NOT NULL,                    -- Provider's unique ID for this song
    title            TEXT NOT NULL,
    artist           TEXT NOT NULL,
    album            TEXT,
    thumbnail_url    TEXT,
    duration         INTEGER,                          -- Duration in seconds
    stream_url       TEXT,                             -- Direct audio stream URL (may expire)
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT songs_provider_unique UNIQUE (provider, provider_song_id)
);

COMMENT ON TABLE  songs                  IS 'Song metadata cache from music providers';
COMMENT ON COLUMN songs.provider         IS 'Music provider: jamendo, etc.';
COMMENT ON COLUMN songs.provider_song_id IS 'Provider-specific unique song identifier';
COMMENT ON COLUMN songs.stream_url       IS 'May expire/change. Refresh from provider if needed.';

-- ============================================================
-- PLAYLIST_QUEUE
-- The main playlist — shared across all tables in a business
-- ============================================================
CREATE TABLE IF NOT EXISTS playlist_queue (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    table_id     UUID REFERENCES tables(id) ON DELETE SET NULL,
    song_id      UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'playing', 'played', 'skipped', 'rejected')),
    position     INTEGER NOT NULL DEFAULT 0,     -- Playback order (lower = plays sooner)
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    played_at    TIMESTAMPTZ,                     -- When reproduction started

    -- Prevent exact same song from being queued multiple times consecutively
    -- (Full duplicate prevention logic is in the application layer)
    CONSTRAINT queue_valid_position CHECK (position >= 0)
);

COMMENT ON TABLE  playlist_queue             IS 'Shared music queue per business';
COMMENT ON COLUMN playlist_queue.status      IS 'pending=waiting, playing=now, played=done, skipped=admin-skipped, rejected=admin-rejected';
COMMENT ON COLUMN playlist_queue.position    IS 'Playback order. 0=next to play, higher=later';
COMMENT ON COLUMN playlist_queue.table_id    IS 'Which table requested this song (NULL if table was deleted)';
