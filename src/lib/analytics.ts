// Analytics calculations and data processing utilities
import type { ClickEvent, TimeSeriesData, MapDataPoint } from './types';

// Calculate click trends over time periods
export function calculateClickTrends(clicks: ClickEvent[], days: number = 30): TimeSeriesData[] {
  const now = new Date();
  const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  
  // Create date range
  const dateRange: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
    dateRange.push(date.toISOString().split('T')[0]);
  }
  
  // Count clicks per day
  const clicksByDate = new Map<string, number>();
  clicks.forEach(click => {
    const clickDate = new Date(click.timestamp).toISOString().split('T')[0];
    clicksByDate.set(clickDate, (clicksByDate.get(clickDate) || 0) + 1);
  });
  
  // Return formatted data
  return dateRange.map(date => ({
    date,
    clicks: clicksByDate.get(date) || 0
  }));
}

// Calculate hourly distribution of clicks
export function calculateHourlyDistribution(clicks: ClickEvent[]): { hour: number; clicks: number }[] {
  const hourlyData = new Map<number, number>();
  
  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    hourlyData.set(i, 0);
  }
  
  // Count clicks per hour
  clicks.forEach(click => {
    const hour = new Date(click.timestamp).getHours();
    hourlyData.set(hour, (hourlyData.get(hour) || 0) + 1);
  });
  
  return Array.from(hourlyData.entries()).map(([hour, clicks]) => ({
    hour,
    clicks
  }));
}

// Calculate weekly distribution
export function calculateWeeklyDistribution(clicks: ClickEvent[]): { day: string; clicks: number }[] {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weeklyData = new Map<number, number>();
  
  // Initialize all days
  for (let i = 0; i < 7; i++) {
    weeklyData.set(i, 0);
  }
  
  // Count clicks per day of week
  clicks.forEach(click => {
    const dayOfWeek = new Date(click.timestamp).getDay();
    weeklyData.set(dayOfWeek, (weeklyData.get(dayOfWeek) || 0) + 1);
  });
  
  return Array.from(weeklyData.entries()).map(([dayIndex, clicks]) => ({
    day: dayNames[dayIndex],
    clicks
  }));
}

// Calculate geographic distribution for map visualization
export function calculateGeographicDistribution(clicks: ClickEvent[]): MapDataPoint[] {
  const locationMap = new Map<string, {
    coordinates: [number, number];
    country: string;
    city?: string;
    clicks: number;
  }>();
  
  // Group clicks by location
  clicks.forEach(click => {
    if (click.latitude && click.longitude) {
      const key = `${click.latitude},${click.longitude}`;
      const existing = locationMap.get(key);
      
      if (existing) {
        existing.clicks++;
      } else {
        locationMap.set(key, {
          coordinates: [click.longitude, click.latitude],
          country: click.country || 'Unknown',
          city: click.city,
          clicks: 1
        });
      }
    }
  });
  
  const totalClicks = clicks.length;
  
  return Array.from(locationMap.values()).map(location => ({
    ...location,
    percentage: totalClicks > 0 ? Math.round((location.clicks / totalClicks) * 100 * 100) / 100 : 0
  }));
}

// Calculate top referrers
export function calculateTopReferrers(clicks: ClickEvent[], limit: number = 10): { referrer: string; clicks: number; percentage: number }[] {
  const referrerMap = new Map<string, number>();
  
  clicks.forEach(click => {
    const referrer = click.referer || 'Direct';
    const domain = extractDomain(referrer);
    referrerMap.set(domain, (referrerMap.get(domain) || 0) + 1);
  });
  
  const totalClicks = clicks.length;
  
  return Array.from(referrerMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([referrer, clicks]) => ({
      referrer,
      clicks,
      percentage: totalClicks > 0 ? Math.round((clicks / totalClicks) * 100 * 100) / 100 : 0
    }));
}

// Extract domain from referrer URL
function extractDomain(url: string): string {
  if (!url || url === 'Direct') return 'Direct';
  
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url.length > 50 ? url.substring(0, 50) + '...' : url;
  }
}

// Calculate device/browser statistics
export function calculateDeviceStats(clicks: ClickEvent[]): {
  browsers: { name: string; clicks: number; percentage: number }[];
  devices: { name: string; clicks: number; percentage: number }[];
  operatingSystems: { name: string; clicks: number; percentage: number }[];
} {
  const browserMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const osMap = new Map<string, number>();
  
  clicks.forEach(click => {
    if (click.user_agent) {
      const parsed = parseUserAgent(click.user_agent);
      
      browserMap.set(parsed.browser, (browserMap.get(parsed.browser) || 0) + 1);
      deviceMap.set(parsed.device, (deviceMap.get(parsed.device) || 0) + 1);
      osMap.set(parsed.os, (osMap.get(parsed.os) || 0) + 1);
    } else {
      browserMap.set('Unknown', (browserMap.get('Unknown') || 0) + 1);
      deviceMap.set('Unknown', (deviceMap.get('Unknown') || 0) + 1);
      osMap.set('Unknown', (osMap.get('Unknown') || 0) + 1);
    }
  });
  
  const totalClicks = clicks.length;
  
  const createStats = (map: Map<string, number>) =>
    Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, clicks]) => ({
        name,
        clicks,
        percentage: totalClicks > 0 ? Math.round((clicks / totalClicks) * 100 * 100) / 100 : 0
      }));
  
  return {
    browsers: createStats(browserMap),
    devices: createStats(deviceMap),
    operatingSystems: createStats(osMap)
  };
}

// Simple user agent parser
function parseUserAgent(userAgent: string): { browser: string; device: string; os: string } {
  const ua = userAgent.toLowerCase();
  
  // Browser detection
  let browser = 'Unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera')) browser = 'Opera';
  
  // Device type detection
  let device = 'Desktop';
  if (ua.includes('mobile')) device = 'Mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) device = 'Tablet';
  
  // Operating system detection
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
  return { browser, device, os };
}

// Calculate click velocity (clicks per time period)
export function calculateClickVelocity(clicks: ClickEvent[], hours: number = 24): number {
  const now = new Date();
  const startTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));
  
  const recentClicks = clicks.filter(click => 
    new Date(click.timestamp) >= startTime
  );
  
  return Math.round((recentClicks.length / hours) * 100) / 100;
}

// Calculate peak activity times
export function calculatePeakTimes(clicks: ClickEvent[]): {
  peakHour: number;
  peakDay: string;
  peakHourClicks: number;
  peakDayClicks: number;
} {
  const hourlyDist = calculateHourlyDistribution(clicks);
  const weeklyDist = calculateWeeklyDistribution(clicks);
  
  const peakHourData = hourlyDist.reduce((max, current) => 
    current.clicks > max.clicks ? current : max
  );
  
  const peakDayData = weeklyDist.reduce((max, current) => 
    current.clicks > max.clicks ? current : max
  );
  
  return {
    peakHour: peakHourData.hour,
    peakDay: peakDayData.day,
    peakHourClicks: peakHourData.clicks,
    peakDayClicks: peakDayData.clicks
  };
}

// Calculate conversion rate (if you have conversion tracking)
export function calculateConversionRate(clicks: number, conversions: number): number {
  if (clicks === 0) return 0;
  return Math.round((conversions / clicks) * 100 * 100) / 100;
}

// Generate analytics summary
export function generateAnalyticsSummary(clicks: ClickEvent[]): {
  totalClicks: number;
  uniqueClicks: number;
  avgClicksPerDay: number;
  clickVelocity: number;
  topCountry?: string;
  topCity?: string;
  peakHour: number;
  peakDay: string;
} {
  const totalClicks = clicks.length;
  const uniqueIPs = new Set(clicks.map(c => c.ip_address)).size;
  
  // Calculate average clicks per day over the period
  const dateRange = clicks.length > 0 
    ? Math.max(1, Math.ceil((Date.now() - new Date(clicks[clicks.length - 1].timestamp).getTime()) / (24 * 60 * 60 * 1000)))
    : 1;
  const avgClicksPerDay = Math.round((totalClicks / dateRange) * 100) / 100;
  
  // Get top geographic locations
  const countryCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  
  clicks.forEach(click => {
    if (click.country) {
      countryCounts.set(click.country, (countryCounts.get(click.country) || 0) + 1);
    }
    if (click.city) {
      cityCounts.set(click.city, (cityCounts.get(click.city) || 0) + 1);
    }
  });
  
  const topCountry = countryCounts.size > 0 
    ? Array.from(countryCounts.entries()).sort(([, a], [, b]) => b - a)[0][0]
    : undefined;
    
  const topCity = cityCounts.size > 0 
    ? Array.from(cityCounts.entries()).sort(([, a], [, b]) => b - a)[0][0]
    : undefined;
  
  const peakTimes = calculatePeakTimes(clicks);
  
  return {
    totalClicks,
    uniqueClicks: uniqueIPs,
    avgClicksPerDay,
    clickVelocity: calculateClickVelocity(clicks),
    topCountry,
    topCity,
    peakHour: peakTimes.peakHour,
    peakDay: peakTimes.peakDay
  };
}

// Format numbers for display
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Format percentage for display
export function formatPercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}

// Calculate growth rate between two periods
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}