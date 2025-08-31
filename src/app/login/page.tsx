"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/constants";
import { LogIn } from "lucide-react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Local loading state

  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setError("");
    setIsLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      // On success, redirect to the dashboard.
      // The middleware will ensure the user is authenticated.
      // router.refresh() is important to re-fetch server components.
      router.push("/dashboard");
      router.refresh();
    }
    
    setIsLoading(false);
  };

  const isLoginDisabled = !email || !password || isLoading;

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
                required
              />
            </div>
            
            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

            <Button type="submit" className="w-full text-lg py-6" disabled={isLoginDisabled}>
              {isLoading ? 'Logging in...' : <><LogIn className="mr-2 h-5 w-5" /> Login</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

