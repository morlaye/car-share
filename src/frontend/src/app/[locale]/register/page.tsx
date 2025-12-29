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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const t = useTranslations('Auth');
    const tVal = useTranslations('Validation');

    // Validation Schema
    const formSchema = z.object({
        fullName: z.string().min(2, {
            message: tVal('minChar', { min: 2 }),
        }),
        email: z.string().email({
            message: tVal('email'),
        }),
        phone: z.string().min(8, {
            message: tVal('minChar', { min: 8 }),
        }),
        password: z.string().min(6, {
            message: tVal('minChar', { min: 6 }),
        }),
        confirmPassword: z.string(),
        userType: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
        message: tVal('passwordMismatch'),
        path: ["confirmPassword"],
    });

    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
            userType: "Renter",
        },
    });

    // 2. Define a submit handler.
    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            // Call G-MoP API
            // Note: We only send relevant fields to schema
            await api.post("/api/auth/register", {
                fullName: values.fullName,
                email: values.email,
                phone: values.phone,
                password: values.password,
                userType: values.userType,
                countryCode: "GN" // Default to Guinea
            });

            toast.success(t('successRegister'));

            // Redirect to login or dashboard
            setTimeout(() => {
                router.push("/login?registered=true");
            }, 1500);

        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.message || "Une erreur est survenue.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">{t('registerTitle')}</CardTitle>
                    <CardDescription className="text-center">
                        {t('registerDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                            <FormField
                                control={form.control}
                                name="fullName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('fullNameLabel')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Mory Kanté" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="userType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('iWantToLabel')}</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('renterOption')} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Renter">{t('renterOption')}</SelectItem>
                                                    <SelectItem value="Owner">{t('ownerOption')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('phoneLabel')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="620 00 00 00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('emailLabel')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder="mory@exemple.com" {...field} />
                                        </FormControl>
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
                                        <FormControl>
                                            <Input type="password" placeholder="******" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('confirmPasswordLabel')}</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="******" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? t('registering') : t('registerButton')}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="justify-center text-sm text-gray-500">
                    {t('alreadyHaveAccount')}
                    <Link href="/login" className="ml-1 font-semibold text-primary hover:underline">
                        {t('loginLink')}
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
