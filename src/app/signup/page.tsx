"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { UserPlus, LogIn } from "lucide-react";
import Image from "next/image";
import { RegisterLink, LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl dark:bg-gray-800/60 backdrop-blur-sm border-2">
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
          <CardTitle className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Join {APP_NAME}
          </CardTitle>
          <CardDescription className="text-base text-gray-600 dark:text-gray-400">
            Create your account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RegisterLink>
            <Button className="w-full text-lg py-6" size="lg">
              <UserPlus className="mr-2 h-5 w-5" />
              Create Account
            </Button>
          </RegisterLink>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Already have an account?
              </span>
            </div>
          </div>

          <LoginLink>
            <Button variant="outline" className="w-full text-lg py-6" size="lg">
              <LogIn className="mr-2 h-5 w-5" />
              Sign In
            </Button>
          </LoginLink>

          <p className="text-xs text-center text-muted-foreground mt-4">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
