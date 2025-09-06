// Database utility functions for SQLite operations
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { TrackingLink, ClickEvent, CreateLinkRequest, UpdateLinkRequest, LinkAnalytics, DashboardStats } from './types';

let db: Database.Database | null = null;

// Initialize database connection
export function initDatabase(): Database.Database {
  if (db) return db;
  
  try {
    db = new Database('tracking.db');
    db.pragma('journal_mode = WAL');
    
    // Read and execute schema
    const schemaPath = join(process.cwd(), 'database.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error('Database initialization failed');
  }
}

// Get database instance
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

// Generate unique short code
export function generateShortCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create new tracking link
export function createLink(data: CreateLinkRequest): TrackingLink {
  const database = getDatabase();
  
  let shortCode = data.custom_code;
  
  // Generate unique short code if not provided
  if (!shortCode) {
    do {
      shortCode = generateShortCode();
    } while (getLinkByCode(shortCode));
  } else {
    // Check if custom code already exists
    if (getLinkByCode(shortCode)) {
      throw new Error('Custom short code already exists');
    }
  }
  
  const stmt = database.prepare(`
    INSERT INTO links (short_code, original_url, title, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  
  const result = stmt.run(shortCode, data.original_url, data.title || null, data.description || null);
  
  const newLink = database.prepare('SELECT * FROM links WHERE id = ?').get(result.lastInsertRowid) as TrackingLink;
  return newLink;
}

// Get link by short code
export function getLinkByCode(shortCode: string): TrackingLink | null {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM links WHERE short_code = ? AND active = 1');
  return stmt.get(shortCode) as TrackingLink || null;
}

// Get link by ID
export function getLinkById(id: number): TrackingLink | null {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM links WHERE id = ?');
  return stmt.get(id) as TrackingLink || null;
}

// Get all links
export function getAllLinks(offset: number = 0, limit: number = 50): TrackingLink[] {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM links ORDER BY created_at DESC LIMIT ? OFFSET ?');
  return stmt.all(limit, offset) as TrackingLink[];
}

// Update link
export function updateLink(id: number, data: UpdateLinkRequest): TrackingLink | null {
  const database = getDatabase();
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.title !== undefined) {
    updates.push('title = ?');
    values.push(data.title);
  }
  
  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description);
  }
  
  if (data.active !== undefined) {
    updates.push('active = ?');
    values.push(data.active ? 1 : 0);
  }
  
  if (updates.length === 0) {
    return getLinkById(id);
  }
  
  updates.push('updated_at = datetime(\'now\')');
  values.push(id);
  
  const stmt = database.prepare(`UPDATE links SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  
  return getLinkById(id);
}

// Delete link
export function deleteLink(id: number): boolean {
  const database = getDatabase();
  const stmt = database.prepare('DELETE FROM links WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Record click event
export function recordClick(linkId: number, clickData: Omit<ClickEvent, 'id' | 'link_id' | 'timestamp'>): ClickEvent {
  const database = getDatabase();
  
  // Insert click record
  const stmt = database.prepare(`
    INSERT INTO clicks (
      link_id, ip_address, user_agent, referer, country, country_code,
      region, city, latitude, longitude, timezone, isp, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  
  const result = stmt.run(
    linkId,
    clickData.ip_address,
    clickData.user_agent || null,
    clickData.referer || null,
    clickData.country || null,
    clickData.country_code || null,
    clickData.region || null,
    clickData.city || null,
    clickData.latitude || null,
    clickData.longitude || null,
    clickData.timezone || null,
    clickData.isp || null
  );
  
  // Update click count
  const updateStmt = database.prepare('UPDATE links SET clicks = clicks + 1 WHERE id = ?');
  updateStmt.run(linkId);
  
  // Return the created click record
  const clickRecord = database.prepare('SELECT * FROM clicks WHERE id = ?').get(result.lastInsertRowid) as ClickEvent;
  return clickRecord;
}

// Get clicks for a link
export function getLinkClicks(linkId: number, limit: number = 100, offset: number = 0): ClickEvent[] {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT * FROM clicks 
    WHERE link_id = ? 
    ORDER BY timestamp DESC 
    LIMIT ? OFFSET ?
  `);
  return stmt.all(linkId, limit, offset) as ClickEvent[];
}

// Get dashboard statistics
export function getDashboardStats(): DashboardStats {
  const database = getDatabase();
  
  // Total counts
  const totalLinks = database.prepare('SELECT COUNT(*) as count FROM links').get() as { count: number };
  const totalClicks = database.prepare('SELECT COUNT(*) as count FROM clicks').get() as { count: number };
  const activeLinks = database.prepare('SELECT COUNT(*) as count FROM links WHERE active = 1').get() as { count: number };
  
  // Time-based clicks
  const clicksToday = database.prepare(`
    SELECT COUNT(*) as count FROM clicks 
    WHERE date(timestamp) = date('now')
  `).get() as { count: number };
  
  const clicksThisWeek = database.prepare(`
    SELECT COUNT(*) as count FROM clicks 
    WHERE timestamp >= datetime('now', '-7 days')
  `).get() as { count: number };
  
  const clicksThisMonth = database.prepare(`
    SELECT COUNT(*) as count FROM clicks 
    WHERE timestamp >= datetime('now', 'start of month')
  `).get() as { count: number };
  
  // Top performing links
  const topPerformingLinks = database.prepare(`
    SELECT * FROM links 
    WHERE active = 1 
    ORDER BY clicks DESC 
    LIMIT 5
  `).all() as TrackingLink[];
  
  // Recent activity
  const recentActivity = database.prepare(`
    SELECT c.*, l.title, l.short_code 
    FROM clicks c 
    JOIN links l ON c.link_id = l.id 
    ORDER BY c.timestamp DESC 
    LIMIT 10
  `).all() as ClickEvent[];
  
  return {
    totalLinks: totalLinks.count,
    totalClicks: totalClicks.count,
    activeLinks: activeLinks.count,
    clicksToday: clicksToday.count,
    clicksThisWeek: clicksThisWeek.count,
    clicksThisMonth: clicksThisMonth.count,
    topPerformingLinks,
    recentActivity
  };
}

// Get detailed analytics for a link
export function getLinkAnalytics(linkId: number): LinkAnalytics | null {
  const database = getDatabase();
  
  const link = getLinkById(linkId);
  if (!link) return null;
  
  // Basic click stats
  const totalClicks = database.prepare('SELECT COUNT(*) as count FROM clicks WHERE link_id = ?').get(linkId) as { count: number };
  const uniqueClicks = database.prepare('SELECT COUNT(DISTINCT ip_address) as count FROM clicks WHERE link_id = ?').get(linkId) as { count: number };
  
  // Time-based stats
  const clicksToday = database.prepare(`
    SELECT COUNT(*) as count FROM clicks 
    WHERE link_id = ? AND date(timestamp) = date('now')
  `).get(linkId) as { count: number };
  
  const clicksThisWeek = database.prepare(`
    SELECT COUNT(*) as count FROM clicks 
    WHERE link_id = ? AND timestamp >= datetime('now', '-7 days')
  `).get(linkId) as { count: number };
  
  const clicksThisMonth = database.prepare(`
    SELECT COUNT(*) as count FROM clicks 
    WHERE link_id = ? AND timestamp >= datetime('now', 'start of month')
  `).get(linkId) as { count: number };
  
  // Geographic data
  const topCountries = database.prepare(`
    SELECT country, country_code, COUNT(*) as clicks,
           ROUND(COUNT(*) * 100.0 / ?, 2) as percentage
    FROM clicks 
    WHERE link_id = ? AND country IS NOT NULL 
    GROUP BY country, country_code 
    ORDER BY clicks DESC 
    LIMIT 10
  `).all(totalClicks.count, linkId);
  
  const topCities = database.prepare(`
    SELECT city, country, COUNT(*) as clicks,
           ROUND(COUNT(*) * 100.0 / ?, 2) as percentage
    FROM clicks 
    WHERE link_id = ? AND city IS NOT NULL 
    GROUP BY city, country 
    ORDER BY clicks DESC 
    LIMIT 10
  `).all(totalClicks.count, linkId);
  
  // Recent clicks
  const recentClicks = database.prepare(`
    SELECT * FROM clicks 
    WHERE link_id = ? 
    ORDER BY timestamp DESC 
    LIMIT 20
  `).all(linkId) as ClickEvent[];
  
  // Clicks over time (last 30 days)
  const clicksOverTime = database.prepare(`
    SELECT date(timestamp) as date, COUNT(*) as clicks
    FROM clicks 
    WHERE link_id = ? AND timestamp >= datetime('now', '-30 days')
    GROUP BY date(timestamp)
    ORDER BY date
  `).all(linkId);
  
  // Geographic points for map
  const geographicData = database.prepare(`
    SELECT latitude, longitude, city, country, COUNT(*) as clicks
    FROM clicks 
    WHERE link_id = ? AND latitude IS NOT NULL AND longitude IS NOT NULL
    GROUP BY latitude, longitude, city, country
    ORDER BY clicks DESC
  `).all(linkId);
  
  return {
    link,
    totalClicks: totalClicks.count,
    uniqueClicks: uniqueClicks.count,
    clicksToday: clicksToday.count,
    clicksThisWeek: clicksThisWeek.count,
    clicksThisMonth: clicksThisMonth.count,
    topCountries,
    topCities,
    recentClicks,
    clicksOverTime,
    geographicData
  };
}

// Close database connection
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}