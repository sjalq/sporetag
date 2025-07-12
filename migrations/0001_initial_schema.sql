-- Initial schema for spore storage
-- Migration: 0001_initial_schema

CREATE TABLE spores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    message TEXT NOT NULL CHECK(length(message) <= 280),
    cookie_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
);

-- Indexes for efficient queries
CREATE INDEX idx_spores_location ON spores(lat, lng);
CREATE INDEX idx_spores_cookie ON spores(cookie_id);