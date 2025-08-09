"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Calendar, MapPin, Users, Building } from 'lucide-react';
import type { MemberWithDetails } from '@/lib/types';

interface MemberDetailsProps {
  member: MemberWithDetails;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
  <div className="flex items-start space-x-4">
    <Icon className="h-5 w-5 text-muted-foreground mt-1" />
    <div className="flex flex-col">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium">{value || 'N/A'}</span>
    </div>
  </div>
);

export const MemberDetails = ({ member }: MemberDetailsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <User className="h-6 w-6" />
          <span>{member.name}</span>
          <Badge variant={member.type === 'student' ? 'default' : 'secondary'}>
            {member.type.charAt(0).toUpperCase() + member.type.slice(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DetailItem icon={Mail} label="Email" value={member.email} />
          <DetailItem icon={Phone} label="Phone" value={member.phone} />
          <DetailItem icon={Calendar} label="Join Date" value={new Date(member.joinDate).toLocaleDateString()} />
          <DetailItem icon={Users} label="Gender" value={member.gender.charAt(0).toUpperCase() + member.gender.slice(1)} />
          <DetailItem icon={Building} label="Site" value={member.siteName} />
          <DetailItem icon={MapPin} label="Small Group" value={member.smallGroupName} />
        </div>
      </CardContent>
    </Card>
  );
};
