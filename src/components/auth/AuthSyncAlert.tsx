"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function AuthSyncAlert() {
    const { authError } = useAuth();
    const router = useRouter();
    const t = useTranslations("Auth");

    if (!authError || authError.code !== "ID_MISMATCH") return null;

    return (
        <div className="p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <Alert variant="destructive" className="max-w-7xl mx-auto border-destructive/50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-bold">{t("sync_required_title")}</AlertTitle>
                <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                    <span>{t("sync_required_desc")}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/dashboard/diagnostics")}
                        className="bg-white text-destructive hover:bg-destructive/10 border-destructive shrink-0"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t("fix_now")}
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    );
}
