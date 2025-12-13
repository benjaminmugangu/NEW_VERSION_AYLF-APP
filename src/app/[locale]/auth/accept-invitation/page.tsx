import { getInvitationByToken } from '@/services/invitationService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, ArrowRight, LogOut } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";


interface PageProps {
    readonly searchParams: Promise<{ token?: string; error?: string }>;
}

export default async function AcceptInvitationPage({ searchParams }: PageProps) {
    const { token, error } = await searchParams;

    const { getUser, isAuthenticated } = getKindeServerSession();
    const isAuth = await isAuthenticated();
    const currentUser = isAuth ? await getUser() : null;



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

    // Action Buttons Logic
    let actionButtons;
    if (needsLogout) {
        actionButtons = <LogoutButton token={token} />;
    } else if (currentUser) {
        actionButtons = <ConfirmButton token={token} />;
    } else {
        actionButtons = <LoginButton email={invitation.email} token={token} />;
    }

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
                <CardFooter className="flex-col gap-3">
                    {/* Security Check Message */}
                    {error === 'email_mismatch' && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md w-full text-sm mb-2">
                            <strong>Authentication Error:</strong> The email you logged in with ({currentUser?.email}) does not match the invitation email ({invitation.email}). Please log out and sign in with the correct account.
                        </div>
                    )}

                    {actionButtons}
                </CardFooter>
            </Card>
        </div>
    );
}

// Extracted Components with ReadOnly Props

function LogoutButton({ token }: { readonly token: string }) {
    const redirectUrl = `/auth/accept-invitation?token=${token}`;
    const logoutUrl = `/api/auth/logout?post_logout_redirect_url=${encodeURIComponent(redirectUrl)}`;

    return (
        <Button asChild className="w-full h-12 text-lg" variant="destructive">
            <Link href={logoutUrl}>
                <LogOut className="mr-2 h-4 w-4" /> Log Out & Switch Account
            </Link>
        </Button>
    );
}

function ConfirmButton({ token }: { readonly token: string }) {
    const confirmUrl = `/api/invitations/accept?token=${token}`;
    return (
        <Button asChild className="w-full h-12 text-lg bg-green-600 hover:bg-green-700">
            <Link href={confirmUrl}>
                Confirm & Join <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
    );
}

function LoginButton({ email, token }: { readonly email: string; readonly token: string }) {
    // Construct URLs separately to avoid nested template literals
    const postLoginRedirect = `/api/invitations/accept?token=${token}`;
    const encodedRedirect = encodeURIComponent(postLoginRedirect);
    const loginUrl = `/api/auth/login?login_hint=${email}&post_login_redirect_url=${encodedRedirect}`;

    return (
        <Button asChild className="w-full h-12 text-lg">
            <Link href={loginUrl}>
                Accept & Login <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
    );
}
