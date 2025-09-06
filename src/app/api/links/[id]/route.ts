// API endpoints for individual tracking link operations
import { NextRequest, NextResponse } from 'next/server';
import { getLinkById, updateLink, deleteLink, initDatabase } from '@/lib/database';
import type { UpdateLinkRequest, ApiResponse } from '@/lib/types';

// Initialize database on first request
initDatabase();

// GET /api/links/[id] - Get specific tracking link
export async function GET(
  _request: NextRequest,
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
    
    const link = getLinkById(linkId);
    
    if (!link) {
      const response: ApiResponse = {
        success: false,
        error: 'Link not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    const response: ApiResponse = {
      success: true,
      data: link,
      message: 'Link retrieved successfully'
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching link:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch link',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/links/[id] - Update tracking link
export async function PUT(
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
    
    const body = await request.json() as UpdateLinkRequest;
    
    // Validate that at least one field is being updated
    if (
      body.title === undefined && 
      body.description === undefined && 
      body.active === undefined
    ) {
      const response: ApiResponse = {
        success: false,
        error: 'At least one field must be provided for update'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // Check if link exists
    const existingLink = getLinkById(linkId);
    if (!existingLink) {
      const response: ApiResponse = {
        success: false,
        error: 'Link not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Update the link
    const updatedLink = updateLink(linkId, {
      title: body.title?.trim() || undefined,
      description: body.description?.trim() || undefined,
      active: body.active
    });
    
    if (!updatedLink) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to update link'
      };
      return NextResponse.json(response, { status: 500 });
    }
    
    const response: ApiResponse = {
      success: true,
      data: updatedLink,
      message: 'Link updated successfully'
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating link:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update link',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/links/[id] - Delete tracking link
export async function DELETE(
  _request: NextRequest,
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
    
    // Check if link exists
    const existingLink = getLinkById(linkId);
    if (!existingLink) {
      const response: ApiResponse = {
        success: false,
        error: 'Link not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Delete the link
    const deleted = deleteLink(linkId);
    
    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to delete link'
      };
      return NextResponse.json(response, { status: 500 });
    }
    
    const response: ApiResponse = {
      success: true,
      message: 'Link deleted successfully'
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting link:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete link',
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