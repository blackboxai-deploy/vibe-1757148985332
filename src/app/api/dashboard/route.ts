// API endpoint for dashboard statistics
import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats, initDatabase } from '@/lib/database';
import type { ApiResponse } from '@/lib/types';

// Initialize database on first request
initDatabase();

// GET /api/dashboard - Get dashboard statistics
export async function GET(_request: NextRequest) {
  try {
    const stats = getDashboardStats();
    
    const response: ApiResponse = {
      success: true,
      data: stats,
      message: 'Dashboard statistics retrieved successfully'
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch dashboard statistics',
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