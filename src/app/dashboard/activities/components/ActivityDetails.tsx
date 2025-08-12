"use client";

import React from 'react';
import type { Activity } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Flag, Tag, BarChart2, CheckCircle, Clock } from 'lucide-react';

interface ActivityDetailsProps {
  activity: Activity;
}

export function ActivityDetails({ activity }: ActivityDetailsProps) {
  const getStatusBadgeVariant = (status: Activity['status']) => {
    const variants: Partial<Record<Activity['status'], 'success' | 'default' | 'destructive' | 'secondary'>> = {
      planned: 'secondary',
      in_progress: 'default',
      delayed: 'destructive',
      executed: 'success',
      canceled: 'destructive',
    };
    return variants[status] || 'default';
  };

  const detailItems = [
    { icon: Calendar, label: 'Date', value: new Date(activity.date).toLocaleDateString() },
    { icon: Clock, label: 'Status', value: <Badge variant={getStatusBadgeVariant(activity.status)}>{activity.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Badge> },
    { icon: BarChart2, label: 'Level', value: activity.level.replace(/_/g, ' ') },
    { icon: Tag, label: 'Thematic', value: activity.thematic },
    { icon: Flag, label: 'Activity Type', value: activity.activityTypeName || 'N/A' },
    { icon: MapPin, label: 'Site', value: activity.siteName || 'N/A' },
    { icon: Users, label: 'Small Group', value: activity.smallGroupName || 'N/A' },
    { icon: Users, label: 'Participants Planned', value: activity.participants_count_planned ?? 'N/A' },
    { icon: CheckCircle, label: 'Participants Attended', value: activity.participantsCount ?? 'N/A' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{activity.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {detailItems.map((item, index) => (
            <div key={index} className="flex items-start space-x-4">
              <item.icon className="h-6 w-6 text-gray-500 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-600">{item.label}</p>
                <div className="text-lg font-semibold">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
