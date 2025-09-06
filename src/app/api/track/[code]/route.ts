// API endpoint for click tracking and redirect handling
import { NextRequest, NextResponse } from 'next/server';
import { getLinkByCode, recordClick, initDatabase } from '@/lib/database';
import { getLocationWithFallback, getClientIP } from '@/lib/geolocation';
import type { ApiResponse } from '@/lib/types';

// Initialize database on first request
initDatabase();

// GET /api/track/[code] - Track click and redirect to original URL
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const shortCode = params.code;
    
    if (!shortCode) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing tracking code'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // Find the link
    const link = getLinkByCode(shortCode);
    
    if (!link) {
      // Return a 404 page or redirect to a default URL
      const response: ApiResponse = {
        success: false,
        error: 'Link not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Check if link is active
    if (!link.active) {
      const response: ApiResponse = {
        success: false,
        error: 'Link is disabled'
      };
      return NextResponse.json(response, { status: 410 }); // Gone
    }
    
    // Extract tracking data from request
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    const referer = request.headers.get('referer') || undefined;
    
    // Get geolocation data (async, but don't block redirect)
    getLocationWithFallback(ipAddress).then(async (locationData) => {
      try {
        // Record the click with location data
        await recordClick(link.id, {
          ip_address: ipAddress,
          user_agent: userAgent,
          referer: referer,
          country: locationData.country,
          country_code: locationData.countryCode,
          region: locationData.region,
          city: locationData.city,
          latitude: locationData.lat,
          longitude: locationData.lon,
          timezone: locationData.timezone,
          isp: locationData.isp
        });
        
        console.log(`Click tracked for ${shortCode}: ${ipAddress} -> ${link.original_url}`);
      } catch (error) {
        console.error('Error recording click:', error);
        // Don't fail the redirect if tracking fails
      }
    }).catch(error => {
      console.error('Error in background click tracking:', error);
    });
    
    // Immediate redirect to original URL
    return NextResponse.redirect(link.original_url, 302);
  } catch (error) {
    console.error('Error in tracking handler:', error);
    
    // Return error response instead of redirect
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/track/[code] - Track click via API (for JavaScript tracking)
export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const shortCode = params.code;
    
    if (!shortCode) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing tracking code'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // Find the link
    const link = getLinkByCode(shortCode);
    
    if (!link) {
      const response: ApiResponse = {
        success: false,
        error: 'Link not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Check if link is active
    if (!link.active) {
      const response: ApiResponse = {
        success: false,
        error: 'Link is disabled'
      };
      return NextResponse.json(response, { status: 410 });
    }
    
    // Extract tracking data
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    const referer = request.headers.get('referer') || undefined;
    
    // Get additional data from request body if provided
    const body = await request.json().catch(() => ({}));
    const customReferer = body.referer || referer;
    
    // Get geolocation and record click
    const locationData = await getLocationWithFallback(ipAddress);
    
    const clickRecord = recordClick(link.id, {
      ip_address: ipAddress,
      user_agent: userAgent,
      referer: customReferer,
      country: locationData.country,
      country_code: locationData.countryCode,
      region: locationData.region,
      city: locationData.city,
      latitude: locationData.lat,
      longitude: locationData.lon,
      timezone: locationData.timezone,
      isp: locationData.isp
    });
    
    const response: ApiResponse = {
      success: true,
      data: {
        original_url: link.original_url,
        click_id: clickRecord.id,
        timestamp: clickRecord.timestamp
      },
      message: 'Click tracked successfully'
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in POST tracking handler:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to track click',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// Handle unsupported methods
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