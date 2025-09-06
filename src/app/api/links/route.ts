// API endpoints for CRUD operations on tracking links
import { NextRequest, NextResponse } from 'next/server';
import { createLink, getAllLinks, initDatabase } from '@/lib/database';
import type { CreateLinkRequest, ApiResponse } from '@/lib/types';

// Initialize database on first request
initDatabase();

// GET /api/links - Get all tracking links
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const links = getAllLinks(offset, limit);
    
    const response: ApiResponse = {
      success: true,
      data: links,
      message: `Retrieved ${links.length} links`
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching links:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch links',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/links - Create new tracking link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateLinkRequest;
    
    // Validate required fields
    if (!body.original_url) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required field: original_url'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // Validate URL format
    try {
      new URL(body.original_url);
    } catch {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid URL format'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // Validate custom code if provided
    if (body.custom_code) {
      if (body.custom_code.length < 3 || body.custom_code.length > 20) {
        const response: ApiResponse = {
          success: false,
          error: 'Custom code must be between 3 and 20 characters'
        };
        return NextResponse.json(response, { status: 400 });
      }
      
      // Check for invalid characters
      if (!/^[a-zA-Z0-9-_]+$/.test(body.custom_code)) {
        const response: ApiResponse = {
          success: false,
          error: 'Custom code can only contain letters, numbers, hyphens, and underscores'
        };
        return NextResponse.json(response, { status: 400 });
      }
    }
    
    // Create the link
    const newLink = createLink({
      original_url: body.original_url,
      title: body.title?.trim() || null,
      description: body.description?.trim() || null,
      custom_code: body.custom_code?.trim() || undefined
    });
    
    const response: ApiResponse = {
      success: true,
      data: newLink,
      message: 'Link created successfully'
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating link:', error);
    
    let errorMessage = 'Failed to create link';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        errorMessage = 'Custom short code already exists';
        statusCode = 409;
      } else {
        errorMessage = error.message;
      }
    }
    
    const response: ApiResponse = {
      success: false,
      error: errorMessage
    };
    
    return NextResponse.json(response, { status: statusCode });
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