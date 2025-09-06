// TypeScript interfaces and types for the tracking system

export interface TrackingLink {
  id: number;
  short_code: string;
  original_url: string;
  title?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  clicks: number;
  active: boolean;
}

export interface ClickEvent {
  id: number;
  link_id: number;
  ip_address: string;
  user_agent?: string;
  referer?: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  timestamp: string;
}

export interface GeolocationData {
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query?: string;
  status?: string;
  message?: string;
}

export interface LinkAnalytics {
  link: TrackingLink;
  totalClicks: number;
  uniqueClicks: number;
  clicksToday: number;
  clicksThisWeek: number;
  clicksThisMonth: number;
  topCountries: CountryStats[];
  topCities: CityStats[];
  recentClicks: ClickEvent[];
  clicksOverTime: TimeSeriesData[];
  geographicData: GeographicPoint[];
}

export interface CountryStats {
  country: string;
  country_code: string;
  clicks: number;
  percentage: number;
}

export interface CityStats {
  city: string;
  country: string;
  clicks: number;
  percentage: number;
}

export interface TimeSeriesData {
  date: string;
  clicks: number;
}

export interface GeographicPoint {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  clicks: number;
}

export interface CreateLinkRequest {
  original_url: string;
  title?: string;
  description?: string;
  custom_code?: string;
}

export interface UpdateLinkRequest {
  title?: string;
  description?: string;
  active?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  country?: string;
  city?: string;
  limit?: number;
  offset?: number;
}

// Dashboard statistics
export interface DashboardStats {
  totalLinks: number;
  totalClicks: number;
  activeLinks: number;
  clicksToday: number;
  clicksThisWeek: number;
  clicksThisMonth: number;
  topPerformingLinks: TrackingLink[];
  recentActivity: ClickEvent[];
}

// Map visualization data
export interface MapDataPoint {
  coordinates: [number, number]; // [longitude, latitude]
  country: string;
  city?: string;
  clicks: number;
  percentage: number;
}

// Export data formats
export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  dateRange: {
    start: string;
    end: string;
  };
  includeGeolocation: boolean;
  includeUserAgent: boolean;
}

// Error types
export interface TrackingError {
  code: string;
  message: string;
  details?: any;
}

// Rate limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}