"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const { currentUser, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // If user is not authenticated, redirect to login
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // If user already has a complete profile, redirect to dashboard
    if (currentUser.name && currentUser.role) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  const handleSetupComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      // Update password
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update password.');
      }

      toast({
        title: 'Success',
        description: 'Your account setup is complete!',
      });

      // Refresh user data and redirect
      await refreshUser();
      router.push('/dashboard');

    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <UserCheck className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="mt-4 text-xl font-semibold text-gray-900">
            Complete Your Setup
          </CardTitle>
          <CardDescription className="mt-2">
            Welcome! Please set a secure password to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetupComplete} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={currentUser.email || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
            
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={currentUser.name || ''}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                type="text"
                value={currentUser.role?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || ''}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a secure password"
                required
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Setting up...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
