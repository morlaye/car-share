"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Assuming generic mapping or I'll use simple textarea
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { components } from "@/lib/schema";

// Type alias
type CityResult = components["schemas"]["CityResult"];

// Schema
// Note: File validation is tricky in Zod client-side with React Hook Form, 
// usually we use 'any' or check instanceof FileList
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const createVehicleSchema = z.object({
    make: z.string().min(1, "Required"),
    model: z.string().min(1, "Required"),
    year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
    licensePlate: z.string().min(1, "Required"),
    vin: z.string().min(1, "Required"),
    baseDailyRate: z.coerce.number().min(0),
    cityId: z.coerce.number().min(1, "Select a city"),
    description: z.string().optional(),
    isChauffeurAvailable: z.boolean().default(false),
    chauffeurDailyFee: z.coerce.number().optional(),
    // Multiple photos validation
    photos: z.any()
        .refine((files) => files?.length >= 1, "At least one photo is required.")
        .refine((files) => files?.length <= MAX_FILES, `Maximum ${MAX_FILES} photos allowed.`)
        .refine(
            (files) => Array.from(files || []).every((f: any) => f.size <= MAX_FILE_SIZE),
            "Each file must be under 5MB."
        )
});

type FormValues = z.infer<typeof createVehicleSchema>;

export default function NewVehiclePage() {
    const t = useTranslations('Listing');
    const tVal = useTranslations('Validation');
    const router = useRouter();
    const [cities, setCities] = useState<CityResult[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const form = useForm<FormValues>({
        resolver: zodResolver(createVehicleSchema),
        defaultValues: {
            make: "",
            model: "",
            year: 2020,
            licensePlate: "",
            vin: "",
            baseDailyRate: 500000,
            description: "",
            isChauffeurAvailable: false,
            chauffeurDailyFee: 0,
        },
    });

    // Auth check & Fetch Cities
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        // Fetch cities
        api.get<CityResult[]>("/api/vehicles/cities")
            .then(res => setCities(res.data))
            .catch(err => console.error(err));
    }, [router]);

    async function onSubmit(data: FormValues) {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("make", data.make);
            formData.append("model", data.model);
            formData.append("year", data.year.toString());
            formData.append("licensePlate", data.licensePlate);
            formData.append("vin", data.vin);
            formData.append("baseDailyRate", data.baseDailyRate.toString());
            formData.append("cityId", data.cityId.toString());
            if (data.description) formData.append("description", data.description);
            formData.append("isChauffeurAvailable", data.isChauffeurAvailable.toString());
            if (data.chauffeurDailyFee) formData.append("chauffeurDailyFee", data.chauffeurDailyFee.toString());

            // Multiple Files
            if (data.photos && data.photos.length > 0) {
                Array.from(data.photos as FileList).forEach((file: File) => {
                    formData.append("photos", file);
                });
            }

            await api.post("/api/vehicles", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success(t('success'));
            window.location.href = "/";
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data || "Error creating vehicle";
            toast.error(typeof msg === 'string' ? msg : "Error creating vehicle");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-primary">{t('title')}</h1>
                    <p className="text-slate-500 mt-2">{t('subtitle')}</p>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* Car Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('makeLabel')}</Label>
                                    <Input {...form.register("make")} placeholder="Toyota" />
                                    {form.formState.errors.make && <p className="text-red-500 text-xs">{tVal('required')}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('modelLabel')}</Label>
                                    <Input {...form.register("model")} placeholder="Corolla" />
                                    {form.formState.errors.model && <p className="text-red-500 text-xs">{tVal('required')}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('yearLabel')}</Label>
                                    <Input type="number" {...form.register("year")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('cityLabel')}</Label>
                                    <Select onValueChange={(val) => form.setValue("cityId", parseInt(val))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select city" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cities.map(c => (
                                                <SelectItem key={c.cityID} value={c.cityID?.toString() || "0"}>
                                                    {c.cityName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.formState.errors.cityId && <p className="text-red-500 text-xs">{tVal('required')}</p>}
                                </div>
                            </div>

                            {/* Legal & Price */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('plateLabel')}</Label>
                                    <Input {...form.register("licensePlate")} placeholder="RC-1234-A" />
                                    {form.formState.errors.licensePlate && <p className="text-red-500 text-xs">{tVal('required')}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('vinLabel')}</Label>
                                    <Input {...form.register("vin")} placeholder="ABC1234567..." />
                                    {form.formState.errors.vin && <p className="text-red-500 text-xs">{tVal('required')}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('rateLabel')}</Label>
                                    <Input type="number" step="5000" {...form.register("baseDailyRate")} />
                                </div>
                            </div>

                            {/* Chauffeur */}
                            <div className="flex items-center space-x-2 border p-4 rounded-lg bg-slate-50">
                                <input type="checkbox" id="chauffeur" {...form.register("isChauffeurAvailable")} className="h-4 w-4" />
                                <Label htmlFor="chauffeur" className="flex-1">{t('chauffeurOption')}</Label>
                                <Input
                                    type="number"
                                    placeholder={t('chauffeurFeeLabel')}
                                    className="w-40"
                                    {...form.register("chauffeurDailyFee")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('descLabel')}</Label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    {...form.register("description")}
                                />
                            </div>

                            {/* Photo Upload - Multiple */}
                            <div className="space-y-2">
                                <Label>{t('photoLabel')} (max 5, 5MB each)</Label>
                                <Input type="file" accept="image/*" multiple {...form.register("photos")} />
                                {form.formState.errors.photos && <p className="text-red-500 text-xs">{String(form.formState.errors.photos.message)}</p>}
                            </div>

                            <Button type="submit" className="w-full bg-primary-action text-white hover:bg-primary-action/90" disabled={isSubmitting}>
                                {isSubmitting ? "..." : t('submitButton')}
                            </Button>

                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
