-- Location Tracking Links Database Schema

-- Table to store tracking links
CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code TEXT UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    clicks INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT 1
);

-- Table to store individual click events
CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id INTEGER NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    referer TEXT,
    country TEXT,
    country_code TEXT,
    region TEXT,
    city TEXT,
    latitude REAL,
    longitude REAL,
    timezone TEXT,
    isp TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (link_id) REFERENCES links (id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_links_short_code ON links (short_code);
CREATE INDEX IF NOT EXISTS idx_links_active ON links (active);
CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks (link_id);
CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON clicks (timestamp);
CREATE INDEX IF NOT EXISTS idx_clicks_country ON clicks (country);

-- Sample data for testing (optional)
INSERT OR IGNORE INTO links (short_code, original_url, title, description, clicks) VALUES 
('demo1', 'https://example.com', 'Demo Link 1', 'A sample tracking link for testing', 0),
('demo2', 'https://google.com', 'Demo Link 2', 'Another sample link', 0);