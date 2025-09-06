// Geolocation services for IP address resolution
import type { GeolocationData } from './types';

// Primary geolocation service using ip-api.com (free tier)
export async function getLocationFromIP(ipAddress: string): Promise<GeolocationData> {
  try {
    // Skip geolocation for localhost/private IPs
    if (isPrivateIP(ipAddress)) {
      return {
        country: 'Unknown',
        countryCode: 'XX',
        region: 'Unknown',
        city: 'Unknown',
        lat: 0,
        lon: 0,
        timezone: 'Unknown',
        isp: 'Unknown',
        status: 'private_ip'
      };
    }

    // Use ip-api.com service (free, 1000 requests per month)
    const response = await fetch(
      `http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
      {
        headers: {
          'User-Agent': 'LocationTracker/1.0',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'fail') {
      console.warn('Geolocation failed:', data.message);
      return getFallbackLocation();
    }

    return {
      country: data.country,
      countryCode: data.countryCode,
      region: data.regionName,
      city: data.city,
      lat: data.lat,
      lon: data.lon,
      timezone: data.timezone,
      isp: data.isp,
      org: data.org,
      query: data.query,
      status: data.status
    };
  } catch (error) {
    console.error('Geolocation API error:', error);
    // Return fallback data instead of throwing
    return getFallbackLocation();
  }
}

// Fallback geolocation service using ipapi.co (backup)
export async function getLocationFromIPFallback(ipAddress: string): Promise<GeolocationData> {
  try {
    if (isPrivateIP(ipAddress)) {
      return getFallbackLocation();
    }

    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
      headers: {
        'User-Agent': 'LocationTracker/1.0',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      console.warn('Fallback geolocation failed:', data.reason);
      return getFallbackLocation();
    }

    return {
      country: data.country_name,
      countryCode: data.country_code,
      region: data.region,
      city: data.city,
      lat: data.latitude,
      lon: data.longitude,
      timezone: data.timezone,
      isp: data.org,
      status: 'success'
    };
  } catch (error) {
    console.error('Fallback geolocation API error:', error);
    return getFallbackLocation();
  }
}

// Check if IP address is private/local
export function isPrivateIP(ip: string): boolean {
  // Remove IPv6 prefix if present
  const cleanIP = ip.replace(/^::ffff:/, '');
  
  // Check for localhost
  if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP === 'localhost') {
    return true;
  }
  
  // Check for private IPv4 ranges
  const parts = cleanIP.split('.');
  if (parts.length === 4) {
    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);
    
    // 10.0.0.0/8
    if (first === 10) return true;
    
    // 172.16.0.0/12
    if (first === 172 && second >= 16 && second <= 31) return true;
    
    // 192.168.0.0/16
    if (first === 192 && second === 168) return true;
    
    // 169.254.0.0/16 (link-local)
    if (first === 169 && second === 254) return true;
  }
  
  return false;
}

// Get fallback location data for unknown/private IPs
function getFallbackLocation(): GeolocationData {
  return {
    country: 'Unknown',
    countryCode: 'XX',
    region: 'Unknown',
    city: 'Unknown',
    lat: 0,
    lon: 0,
    timezone: 'Unknown',
    isp: 'Unknown',
    status: 'unknown'
  };
}

// Get client IP address from request headers
export function getClientIP(request: Request): string {
  // Check various headers for the real IP
  const headers = request.headers;
  
  // Check common proxy headers
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Take the first IP in the chain
    return xForwardedFor.split(',')[0].trim();
  }
  
  const xRealIP = headers.get('x-real-ip');
  if (xRealIP) {
    return xRealIP;
  }
  
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  const xClientIP = headers.get('x-client-ip');
  if (xClientIP) {
    return xClientIP;
  }
  
  // Fallback to a default for development
  return '127.0.0.1';
}

// Rate limiting for geolocation API calls
class GeolocationRateLimit {
  private calls: number = 0;
  private resetTime: number = Date.now() + (60 * 60 * 1000); // Reset every hour
  private readonly maxCalls: number = 900; // Leave some buffer from 1000 limit
  
  canMakeCall(): boolean {
    const now = Date.now();
    
    // Reset counter if hour has passed
    if (now > this.resetTime) {
      this.calls = 0;
      this.resetTime = now + (60 * 60 * 1000);
    }
    
    return this.calls < this.maxCalls;
  }
  
  recordCall(): void {
    this.calls++;
  }
  
  getRemainingCalls(): number {
    return Math.max(0, this.maxCalls - this.calls);
  }
  
  getResetTime(): number {
    return this.resetTime;
  }
}

// Global rate limiter instance
const rateLimiter = new GeolocationRateLimit();

// Enhanced geolocation with rate limiting and fallbacks
export async function getLocationWithFallback(ipAddress: string): Promise<GeolocationData> {
  // Check rate limit
  if (!rateLimiter.canMakeCall()) {
    console.warn('Geolocation rate limit reached, using fallback');
    return getFallbackLocation();
  }
  
  try {
    rateLimiter.recordCall();
    
    // Try primary service first
    const location = await getLocationFromIP(ipAddress);
    
    // If primary service fails, try fallback
    if (location.status === 'unknown') {
      return await getLocationFromIPFallback(ipAddress);
    }
    
    return location;
  } catch (error) {
    console.error('All geolocation services failed:', error);
    return getFallbackLocation();
  }
}

// Utility to validate coordinates
export function isValidCoordinates(lat?: number, lon?: number): boolean {
  return (
    lat !== undefined && 
    lon !== undefined && 
    lat >= -90 && 
    lat <= 90 && 
    lon >= -180 && 
    lon <= 180 &&
    lat !== 0 && 
    lon !== 0
  );
}

// Get country flag emoji from country code
export function getCountryFlag(countryCode?: string): string {
  if (!countryCode || countryCode === 'XX' || countryCode.length !== 2) {
    return '🌍';
  }
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
}

// Format location string for display
export function formatLocation(city?: string, region?: string, country?: string): string {
  const parts = [city, region, country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
}