// API endpoint for detailed analytics data
import { NextRequest, NextResponse } from 'next/server';
import { getLinkAnalytics, initDatabase } from '@/lib/database';
import { 
  calculateClickTrends, 
  calculateHourlyDistribution, 
  calculateWeeklyDistribution,
  calculateGeographicDistribution,
  calculateTopReferrers,
  calculateDeviceStats,
  generateAnalyticsSummary 
} from '@/lib/analytics';
import type { ApiResponse } from '@/lib/types';

// Initialize database on first request
initDatabase();

// GET /api/analytics/[id] - Get detailed analytics for a tracking link
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const linkId = parseInt(params.id);
    
    if (isNaN(linkId)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid link ID'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const includeAdvanced = searchParams.get('advanced') === 'true';
    
    // Get base analytics data
    const analytics = getLinkAnalytics(linkId);
    
    if (!analytics) {
      const response: ApiResponse = {
        success: false,
        error: 'Link not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Calculate additional analytics if requested
    let advancedAnalytics = {};
    
    if (includeAdvanced && analytics.recentClicks.length > 0) {
      advancedAnalytics = {
        clickTrends: calculateClickTrends(analytics.recentClicks, days),
        hourlyDistribution: calculateHourlyDistribution(analytics.recentClicks),
        weeklyDistribution: calculateWeeklyDistribution(analytics.recentClicks),
        geographicDistribution: calculateGeographicDistribution(analytics.recentClicks),
        topReferrers: calculateTopReferrers(analytics.recentClicks),
        deviceStats: calculateDeviceStats(analytics.recentClicks),
        summary: generateAnalyticsSummary(analytics.recentClicks)
      };
    }
    
    const response: ApiResponse = {
      success: true,
      data: {
        ...analytics,
        ...advancedAnalytics
      },
      message: 'Analytics retrieved successfully'
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}