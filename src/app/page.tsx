"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import LinkCreator from '@/components/LinkCreator';
import LinkManager from '@/components/LinkManager';
import StatsCards from '@/components/StatsCards';
import type { DashboardStats, TrackingLink } from '@/lib/types';

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load dashboard statistics
        const statsResponse = await fetch('/api/dashboard');
        if (statsResponse.ok) {
          const statsResult = await statsResponse.json();
          if (statsResult.success) {
            setStats(statsResult.data);
          }
        }
        
        // Load recent links
        const linksResponse = await fetch('/api/links?limit=10');
        if (linksResponse.ok) {
          const linksResult = await linksResponse.json();
          if (linksResult.success) {
            setLinks(linksResult.data);
          }
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [refreshTrigger]);

  const handleLinkCreated = (newLink: TrackingLink) => {
    setLinks(prev => [newLink, ...prev.slice(0, 9)]);
    setShowCreateForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLinkUpdated = (updatedLink: TrackingLink) => {
    setLinks(prev => prev.map(link => 
      link.id === updatedLink.id ? updatedLink : link
    ));
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLinkDeleted = (deletedLinkId: number) => {
    setLinks(prev => prev.filter(link => link.id !== deletedLinkId));
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Location Tracking Links
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Create tracking links and discover the geographic locations of your visitors. 
          Monitor clicks in real-time with detailed analytics.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={() => setShowCreateForm(true)}
          className="px-8 py-3 text-lg"
          size="lg"
        >
          Create New Tracking Link
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          className="px-8 py-3 text-lg"
          size="lg"
        >
          Refresh Data
        </Button>
      </div>

      <Separator />

      {/* Create Link Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Tracking Link</CardTitle>
            <CardDescription>
              Generate a short link that tracks visitor locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LinkCreator 
              onLinkCreated={handleLinkCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Recent Links */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Recent Tracking Links</h2>
          {links.length > 0 && (
            <Badge variant="outline">
              {links.length} link{links.length !== 1 ? 's' : ''} shown
            </Badge>
          )}
        </div>

        {links.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-500 space-y-4">
                <div className="text-6xl">🔗</div>
                <h3 className="text-xl font-medium">No tracking links yet</h3>
                <p>Create your first tracking link to get started</p>
                <Button onClick={() => setShowCreateForm(true)}>
                  Create First Link
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <LinkManager
            links={links}
            onLinkUpdated={handleLinkUpdated}
            onLinkDeleted={handleLinkDeleted}
          />
        )}
      </div>

      {/* Features Overview */}
      <Separator />
      
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🌍</span>
              Geographic Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Track visitor locations with IP geolocation including country, region, 
              city, and coordinates for mapping.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Real-time Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              View detailed statistics including click trends, top countries, 
              device information, and more.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              Privacy Focused
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Transparent data collection with clear privacy policies. 
              No personal information is stored.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm pt-8">
        <p>
          Track responsibly and ensure compliance with privacy laws in your jurisdiction.
        </p>
      </div>
    </div>
  );
}