"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, CheckCircle, AlertCircle, RefreshCw, Database } from "lucide-react";
import { getIdentityReport, syncIdentity } from "@/actions/maintenance";
import { useToast } from "@/hooks/use-toast";

export default function DiagnosticsPage() {
    const [report, setReport] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const { toast } = useToast();

    const fetchReport = async () => {
        setIsLoading(true);
        try {
            const data = await getIdentityReport();
            setReport(data);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to fetch identity report.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await syncIdentity();
            if (result.success) {
                toast({
                    title: "Identity Synced",
                    description: result.message,
                });
                await fetchReport();
                // ✅ Force a full page reload to ensure all contexts (AuthContext, etc.) are refreshed
                setTimeout(() => window.location.reload(), 2000);
            }
        } catch (error: any) {
            toast({
                title: "Sync Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSyncing(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Analysing identity state...</div>;
    }

    const isMismatched = report?.prisma?.foundByEmail && report?.sql?.db_profile_id !== report?.kinde?.id;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Identity & RLS Diagnostics"
                description="Check synchronization between Kinde authentication and Database profiles."
                icon={Shield}
            />

            {isMismatched ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Identity Mismatch Detected!</AlertTitle>
                    <AlertDescription className="space-y-4">
                        <p>
                            Your Kinde ID (<strong>{report.kinde.id}</strong>) does not match your Database Profile ID (<strong>{report.sql.db_profile_id}</strong>).
                            This is why you see 0 stats: the database filters all data because it doesn&apos;t recognize your new identity.
                        </p>
                        <Button variant="outline" onClick={handleSync} disabled={isSyncing} className="bg-white text-destructive hover:bg-destructive/10 border-destructive">
                            {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Fix My Account Now
                        </Button>
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert className="border-green-500 bg-green-50 text-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle>Identity OK</AlertTitle>
                    <AlertDescription>
                        Your Kinde identity is correctly mapped to your database profile.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Kinde Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Kinde ID:</span>
                            <span className="font-mono">{report?.kinde?.id}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Email:</span>
                            <span>{report?.kinde?.email}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            RLS Context
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Session ID (SQL):</span>
                            <span className="font-mono">{report?.sql?.session_id || 'null'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">DB Role:</span>
                            <span className="font-bold">{report?.sql?.db_profile_role || 'NONE'}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Technical Summary</CardTitle>
                    <CardDescription>Raw inspection of the identity bridge.</CardDescription>
                </CardHeader>
                <CardContent>
                    <pre className="p-4 bg-muted rounded-md text-xs overflow-auto">
                        {JSON.stringify(report, null, 2)}
                    </pre>
                </CardContent>
            </Card>
        </div>
    );
}
