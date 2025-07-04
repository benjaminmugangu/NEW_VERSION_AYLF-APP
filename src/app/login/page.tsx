// src/app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/constants";
import { LogIn } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { login, currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, isLoading, router]);

    const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setError("");

    const { success, error } = await login(email, password);

    if (!success && error) {
      setError(error);
    }
    // On success, the useEffect will handle the redirect
  };

  const isLoginDisabled = !email; // Simplified condition

  // If authentication data is loading, or if the user is already logged in
  // (and will be redirected soon), display a loading state.
  // This prevents a hydration mismatch where the server renders the login form
  // but the client, upon finding a session, tries to render null or redirect immediately.
  if (isLoading || currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="items-center text-center">
            <div className="p-2 mb-4">
              <Image 
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROsJ0oRg8RYoAuUWm025MBmI5tjiHUI-Pcgw&s" 
                alt="AYLF Logo" 
                width={100} 
                height={100} 
                className="rounded-full mx-auto" 
                data-ai-hint="logo organization"
              />
            </div>
            <CardTitle className="text-3xl font-bold">Welcome to {APP_NAME}</CardTitle>
            <CardDescription className="text-muted-foreground">Loading your experience...</CardDescription>
          </CardHeader>
          <CardContent className="animate-pulse">
             <div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
             <div className="h-10 bg-muted rounded w-full mb-6"></div>
             <div className="h-12 bg-primary/50 rounded w-full"></div>
          </CardContent>
        </Card>
      </div>
    );
  } 

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl dark:bg-gray-800/60 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROsJ0oRg8RYoAuUWm025MBmI5tjiHUI-Pcgw&s" 
              alt="AYLF Logo" 
              width={100} 
              height={100} 
              className="rounded-full border-4 border-white dark:border-gray-700 shadow-lg"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800 dark:text-gray-100">Welcome to {APP_NAME}</CardTitle>
          <CardDescription className="text-base text-gray-600 dark:text-gray-400">
            Sign in to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-base"
              />
            </div>
            
            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

            <Button type="submit" className="w-full text-lg py-6" disabled={isLoginDisabled || isLoading}>
              {isLoading ? 'Logging in...' : <><LogIn className="mr-2 h-5 w-5" /> Login</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

