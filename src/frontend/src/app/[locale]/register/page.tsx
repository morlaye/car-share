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
import { Checkbox } from "@/components/ui/checkbox";

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const t = useTranslations('Auth');
    const tVal = useTranslations('Validation');

    // Validation Schema
    const formSchema = z.object({
        firstName: z.string().min(2, {
            message: tVal('minChar', { min: 2 }),
        }),
        lastName: z.string().min(2, {
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
        termsAccepted: z.boolean().refine((val) => val === true, {
            message: tVal('termsRequired'),
        }),
        marketingAccepted: z.boolean().optional(),
    }).refine((data) => data.password === data.confirmPassword, {
        message: tVal('passwordMismatch'),
        path: ["confirmPassword"],
    });

    // 1. Define your form.
    const [success, setSuccess] = useState(false);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
            termsAccepted: false,
            marketingAccepted: false,
        },
    });

    // 2. Define a submit handler.
    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            // Call G-MoP API
            // Combine names
            const fullName = `${values.firstName} ${values.lastName}`;

            await api.post("/api/auth/register", {
                fullName: fullName,
                email: values.email,
                phone: values.phone,
                password: values.password,
                userType: "Renter", // Default value, users can be both
                countryCode: "GN" // Default to Guinea
            });

            setSuccess(true);
            toast.success(t('successRegister'));

        } catch (error: any) {
            console.error(error);
            const msg = error?.response?.data?.message || "Une erreur est survenue.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    }

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-3xl">📧</span>
                        </div>
                        <CardTitle className="text-2xl">{t('checkEmailTitle')}</CardTitle>
                        <CardDescription>
                            {t('checkEmailDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Link href="/login">
                            <Button variant="outline">{t('backToLogin')}</Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
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

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('firstNameLabel')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Mory" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('lastNameLabel')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Kanté" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

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

                            <FormField
                                control={form.control}
                                name="termsAccepted"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-2">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="text-sm font-normal text-slate-600">
                                                {t('termsAgreement')}
                                            </FormLabel>
                                            <FormMessage />
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="marketingAccepted"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-2 -mt-2">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="text-sm font-normal text-slate-600">
                                                {t('promotionsAgreement')}
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full bg-primary-action hover:bg-primary-action/90" disabled={isLoading}>
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
