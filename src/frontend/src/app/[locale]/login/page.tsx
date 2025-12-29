"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { useRouter } from "@/i18n/routing"; // Use i18n router
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/i18n/routing"; // Use i18n Link
import { useTranslations } from "next-intl";

// Validation Schema (We can't easily translate Zod messages schema-level dynamically without advanced hacks, 
// so we'll keep hardcoded strings or move schema inside component)
// Ideally schema should be created inside component or use a function.

export default function LoginPage() {
    const t = useTranslations('Auth');
    // ... logic ...
    // Since I need the full component logic which was previously lost/mangled, I will provide a minimal working version that imports the form or defines it.
    // Actually, the previous view_file (Step 794) showed the imports are there, but the body is broken.
    // I will rewrite the whole component body.
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // ... (I need the form schema too?)
    // The view_file showed the imports but schema was missing?
    // No, view_file Step 794 shows imports.
    // But where is the schema?
    // It was at the top but not shown in lines 1-39?
    // Wait, Step 794 shows lines 1-39.
    // Line 35: export default function...
    // So schema is missing if it was supposed to be before it.
    // I will re-add the schema and component.

    return (
        <LoginForm />
    );
}

function LoginForm() {
    const t = useTranslations('Auth');
    const tVal = useTranslations('Validation');
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Schema
    const formSchema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const res = await api.post("/api/auth/login", values);

            // Check if login was actually successful
            if (res.data.success && res.data.token) {
                localStorage.setItem("token", res.data.token);
                toast.success(t('successLogin'));
                // Use window.location for more reliable redirect
                window.location.href = "/";
            } else {
                // API returned 200 but success=false
                toast.error(res.data.message || "Login failed");
            }
        } catch (error: any) {
            // API returned non-2xx status (401, 400, etc.)
            const message = error.response?.data?.message || "Login failed";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">{t('loginTitle')}</CardTitle>
                    <CardDescription>{t('loginDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('emailLabel')}</FormLabel>
                                        <FormControl><Input placeholder="email@example.com" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('passwordLabel')}</FormLabel>
                                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? t('loggingIn') : t('loginButton')}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex flex-col items-center gap-2 text-sm text-slate-600">
                    <p>{t('dontHaveAccount')} <Link href="/register" className="text-primary font-medium hover:underline">{t('registerLink')}</Link></p>
                </CardFooter>
            </Card>
        </div>
    );
}
