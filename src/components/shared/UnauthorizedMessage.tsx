// src/components/shared/UnauthorizedMessage.tsx
import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function UnauthorizedMessage() {
  return (
    <div className="flex items-center justify-center h-full">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-red-100 rounded-full p-3 w-fit">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="mt-4">Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            You do not have the necessary permissions to view this page.
          </p>
          <Link href="/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
