import { getInvitationByToken } from '@/services/invitationService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, ArrowRight, LogOut } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { cookies } from "next/headers";

interface PageProps {
    searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitationPage({ searchParams }: PageProps) {
    const { token } = await searchParams;

    const { getUser, isAuthenticated } = getKindeServerSession();
    const isAuth = await isAuthenticated();
    const currentUser = isAuth ? await getUser() : null;

    if (token && !currentUser) {
        (await cookies()).set('invitation_token', token, {
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60 * 24 // 24 hours
        });
    }

    if (!token) {
        if (currentUser) {
            redirect('/dashboard');
        }
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md border-red-200">
                    <CardHeader className="text-center">
                        <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                        <CardTitle className="text-xl text-red-700">Invitation Invalid</CardTitle>
                        <CardDescription>
                            No invitation token was provided. Please check the link you received.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Button asChild variant="outline">
                            <Link href="/api/auth/login">Go to Login</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const invitation = await getInvitationByToken(token);

    if (!invitation || invitation.status === 'accepted') {
        if (currentUser) {
            redirect('/dashboard');
        }
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md border-red-200">
                    <CardHeader className="text-center">
                        <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                        <CardTitle className="text-xl text-red-700">Invitation Invalid or Expired</CardTitle>
                        <CardDescription>
                            This invitation link is invalid or has already been used.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Button asChild variant="outline">
                            <Link href="/api/auth/login">Go to Login</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // If user is logged in with a different email, show logout warning
    const needsLogout = currentUser && currentUser.email !== invitation.email;

    // Format role for display
    const formatRole = (role: string) => {
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                    <CardTitle className="text-2xl font-bold">You're Invited!</CardTitle>
                    <CardDescription className="text-base mt-2">
                        You have been invited to join the <strong>AYLF Group Tracker</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium">{invitation.email}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Role:</span>
                            <span className="font-medium">{formatRole(invitation.role)}</span>
                        </div>
                        {invitation.site && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Site:</span>
                                <span className="font-medium">{invitation.site.name}</span>
                            </div>
                        )}
                        {invitation.smallGroup && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Small Group:</span>
                                <span className="font-medium">{invitation.smallGroup.name}</span>
                            </div>
                        )}
                    </div>

                    {needsLogout ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                            <p className="text-sm text-amber-900 font-medium">⚠️ You're currently signed in</p>
                            <p className="text-xs text-amber-700">
                                You're logged in as <strong>{currentUser.email}</strong>. To accept this invitation for <strong>{invitation.email}</strong>, you need to log out first.
                            </p>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground text-center">
                            Click the button below to sign in or create your account using <strong>{invitation.email}</strong>.
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    {needsLogout ? (
                        <Button asChild className="w-full h-12 text-lg" variant="destructive">
                            <Link href={`/api/auth/logout?post_logout_redirect_url=${encodeURIComponent(`/auth/accept-invitation?token=${token}`)}`}>
                                <LogOut className="mr-2 h-4 w-4" /> Log Out & Continue
                            </Link>
                        </Button>
                    ) : (
                        <Button asChild className="w-full h-12 text-lg">
                            <Link href={`/api/auth/login?login_hint=${invitation.email}`}>
                                Accept & Login <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
