"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { useTranslations } from "next-intl";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const t = useTranslations('Auth');

    useEffect(() => {
        if (!token) {
            setStatus("error");
            return;
        }

        api.get(`/api/auth/verify?token=${token}`)
            .then(() => setStatus("success"))
            .catch(() => setStatus("error"));
    }, [token]);

    if (status === "loading") {
        return (
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <CardTitle>{t('verifying')}</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    if (status === "success") {
        return (
            <Card className="w-full max-w-md text-center border-green-200 bg-green-50/50">
                <CardHeader>
                    <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 text-3xl">
                        ✅
                    </div>
                    <CardTitle className="text-green-700">{t('verifiedTitle')}</CardTitle>
                    <CardDescription className="text-green-800 font-medium">
                        {t('verifiedDesc')}
                    </CardDescription>
                </CardHeader>
                <CardFooter className="justify-center">
                    <Link href="/login">
                        <Button className="bg-green-600 hover:bg-green-700 text-white w-full">
                            {t('loginButton')}
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md text-center border-red-200 bg-red-50/50">
            <CardHeader>
                <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 text-3xl">
                    ⚠️
                </div>
                <CardTitle className="text-red-700">Erreur</CardTitle>
                <CardDescription className="text-red-800">
                    {t('verifiedError')}
                </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
                <Link href="/register">
                    <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-100">
                        {t('registerLink')}
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <VerifyEmailContent />
            </Suspense>
        </div>
    );
}
