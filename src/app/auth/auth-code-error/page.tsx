import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="mt-4 text-xl font-semibold text-gray-900">
            Authentication Error
          </CardTitle>
          <CardDescription className="mt-2">
            There was a problem processing your invitation link. This could happen if:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-600 space-y-2 mb-6">
            <li>• The invitation link has expired</li>
            <li>• The link has already been used</li>
            <li>• There was a technical issue</li>
          </ul>
          <div className="space-y-3">
            <Link href="/login" className="w-full">
              <Button className="w-full">
                Try Logging In
              </Button>
            </Link>
            <p className="text-xs text-gray-500 text-center">
              If you continue to have issues, please contact your administrator for a new invitation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
