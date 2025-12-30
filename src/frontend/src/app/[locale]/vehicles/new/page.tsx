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

import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { components } from "@/lib/schema";

// Type alias
type CityResult = components["schemas"]["CityResult"];

// Schema
// Note: File validation is tricky in Zod client-side with React Hook Form, 
// usually we use 'any' or check instanceof FileList
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 20;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Car Data
const CAR_DATA: Record<string, string[]> = {
    "Toyota": ["Corolla", "Camry", "RAV4", "Hilux", "Land Cruiser", "Yaris", "Highlander", "Prado"],
    "Hyundai": ["Elantra", "Sonata", "Tucson", "Santa Fe", "Accent", "Creta", "Kona"],
    "Honda": ["Civic", "Accord", "CR-V", "Pilot", "HR-V", "City"],
    "Kia": ["Rio", "Sportage", "Sorento", "Picanto", "Cerato", "Seltos"],
    "Nissan": ["Sentra", "Altima", "Patrol", "X-Trail", "Qashqai", "Sunny"],
    "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "G-Class"],
    "BMW": ["3 Series", "5 Series", "X3", "X5", "X7", "7 Series"],
    "Ford": ["Focus", "Explorer", "Ranger", "Everest", "Escape"],
    "Suzuki": ["Swift", "Vitara", "Jimny", "Alto", "Baleno"],
    "Mitsubishi": ["Pajero", "L200", "Outlander", "ASX", "Eclipse Cross"],
    "Lexus": ["RX", "LX", "ES", "GX", "NX"],
    "Volkswagen": ["Golf", "Tiguan", "Touareg", "Passat", "Polo"],
    "Peugeot": ["208", "3008", "5008", "2008", "508"],
    "Renault": ["Clio", "Duster", "Megane", "Koleos", "Captur"],
    "Other": []
};

const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid"];
const TRANSMISSIONS = ["Automatic", "Manual"];
const OPTIONAL_FEATURES = [
    "Air Conditioning", "Bluetooth", "Backup Camera", "Power Windows",
    "Cruise Control", "Leather Seats", "Sunroof", "Apple CarPlay/Android Auto",
    "Third Row Seating", "Roof Rack", "Tinted Windows"
];

const createVehicleSchema = z.object({
    make: z.string().min(1, "Make is required"),
    model: z.string().min(1, "Model is required"),
    year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
    licensePlate: z.string().min(1, "Required"),
    vin: z.string().min(1, "Required"),
    baseDailyRate: z.coerce.number().min(0),
    cityId: z.coerce.number().min(1, "Select a city"),
    description: z.string().optional(),
    isChauffeurAvailable: z.boolean().default(false),
    chauffeurDailyFee: z.coerce.number().optional(),

    // New Fields
    fuelType: z.string().min(1),
    transmission: z.string().min(1),
    features: z.array(z.string()).default([]),

    photos: z.any()
        .refine((files) => files?.length >= 1, "At least one photo is required.")
});

// Explicit type definition to fix Zod inference issues with React Hook Form
type FormValues = {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    vin: string;
    baseDailyRate: number;
    cityId: number;
    description?: string;
    isChauffeurAvailable: boolean;
    chauffeurDailyFee?: number;
    fuelType: string;
    transmission: string;
    features: string[];
    photos: any;
};

export default function NewVehiclePage() {
    const t = useTranslations('Listing');
    const tVal = useTranslations('Validation');
    const router = useRouter();
    const [cities, setCities] = useState<CityResult[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const form = useForm<FormValues>({
        resolver: zodResolver(createVehicleSchema) as any,
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
            fuelType: "Petrol",
            transmission: "Automatic",
            features: []
        },
    });

    // Watch 'make' to update 'model' options
    const selectedMake = form.watch("make");
    const availableModels = selectedMake && CAR_DATA[selectedMake] ? CAR_DATA[selectedMake] : [];

    // Auth check & Fetch Cities logic remains...
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login"); // or router.push
            return;
        }

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

            // New Attributes
            formData.append("fuelType", data.fuelType);
            formData.append("transmission", data.transmission);

            // Append each feature
            data.features.forEach((feature, index) => {
                formData.append(`features[${index}]`, feature);
            });

            // Multiple Files
            if (selectedFiles.length > 0) {
                selectedFiles.forEach((file: File) => {
                    formData.append("photos", file);
                });
            } else if (data.photos && data.photos.length > 0) {
                // Fallback if selectedFiles state wasn't used correctly (but we use it in custom UI)
                // Actually the custom UI updates form 'photos' but we should use selectedFiles state logic from previous turn
                // Wait, in previous turn I used `selectedFiles` state in the UI section BUT did I update onSubmit to use it?
                // Let's check the previous `onSubmit`... it used `data.photos`.
                // My Custom UI sets `data.photos` using `form.setValue("photos", files)`.
                // So `data.photos` IS valid if I kept that logic.
                // However, `data.photos` might be a `FileList` or `File[]`.
                // Let's safe guard.
                Array.from(data.photos as any).forEach((file: any) => {
                    formData.append("photos", file);
                });
            }

            await api.post("/api/vehicles", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success(t('success'));
            // window.location.href = "/"; // Force refresh to clear cache if needed
            router.push('/');
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data || "Error creating vehicle";
            toast.error(typeof msg === 'string' ? msg : "Error creating vehicle");
        } finally {
            setIsSubmitting(false);
        }
    }

    // Helper to handle Make change
    const handleMakeChange = (val: string) => {
        form.setValue("make", val);
        form.setValue("model", ""); // Reset model
    };

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
                                    <Select onValueChange={handleMakeChange} value={form.watch("make")}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Make" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(CAR_DATA).map(make => (
                                                <SelectItem key={make} value={make}>{make}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.formState.errors.make && <p className="text-red-500 text-xs">{tVal('required')}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('modelLabel')}</Label>
                                    {selectedMake === "Other" ? (
                                        <Input {...form.register("model")} placeholder="Enter Model" />
                                    ) : (
                                        <Select
                                            onValueChange={(val) => form.setValue("model", val)}
                                            value={form.watch("model")}
                                            disabled={!selectedMake}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Model" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableModels.map(model => (
                                                    <SelectItem key={model} value={model}>{model}</SelectItem>
                                                ))}
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {form.formState.errors.model && <p className="text-red-500 text-xs">{tVal('required')}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('yearLabel')}</Label>
                                    <Input type="number" {...form.register("year")} />
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
                            </div>

                            {/* Fuel & Transmission */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Fuel Type</Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("fuelType", val)}
                                        defaultValue={form.watch("fuelType")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Fuel" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {FUEL_TYPES.map(f => (
                                                <SelectItem key={f} value={f}>{f}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Transmission</Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("transmission", val)}
                                        defaultValue={form.watch("transmission")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Transmission" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TRANSMISSIONS.map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Features */}
                            <div className="space-y-3">
                                <Label className="text-base">Features</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {OPTIONAL_FEATURES.map((feature) => (
                                        <div key={feature} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={feature}
                                                checked={form.watch("features")?.includes(feature)}
                                                onCheckedChange={(checked: boolean | "indeterminate") => {
                                                    const current = form.getValues("features") || [];
                                                    if (checked === true) {
                                                        form.setValue("features", [...current, feature]);
                                                    } else {
                                                        form.setValue("features", current.filter(f => f !== feature));
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={feature} className="text-sm font-normal cursor-pointer">
                                                {feature}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* City & Rate */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('cityLabel')}</Label>
                                    <Select
                                        onValueChange={(val) => form.setValue("cityId", parseInt(val))}
                                        defaultValue={form.watch("cityId")?.toString()}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('cityPlaceholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cities.map((city, idx) => (
                                                <SelectItem key={city.cityID || idx} value={city.cityID?.toString() || ""}>
                                                    {city.cityName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.formState.errors.cityId && <p className="text-red-500 text-xs">{tVal('required')}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('rateLabel')} (GNF)</Label>
                                    <Input type="number" {...form.register("baseDailyRate")} />
                                    {form.formState.errors.baseDailyRate && <p className="text-red-500 text-xs">{tVal('required')}</p>}
                                </div>
                            </div>

                            {/* Chauffeur Option */}
                            <div className="flex items-center space-x-2 border p-4 rounded-xl">
                                <Checkbox
                                    id="chauffeur"
                                    checked={form.watch("isChauffeurAvailable")}
                                    onCheckedChange={(checked: boolean | "indeterminate") => form.setValue("isChauffeurAvailable", checked === true)}
                                />
                                <div className="flex-1">
                                    <Label htmlFor="chauffeur" className="font-bold cursor-pointer">{t('chauffeurLabel')}</Label>
                                    <p className="text-sm text-slate-500">{t('chauffeurDescription')}</p>
                                </div>
                            </div>

                            {form.watch("isChauffeurAvailable") && (
                                <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                                    <Label>{t('chauffeurFeeLabel')}</Label>
                                    <Input type="number" {...form.register("chauffeurDailyFee")} />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>{t('descriptionLabel')}</Label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    {...form.register("description")}
                                    placeholder={t('descriptionPlaceholder')}
                                />
                            </div>

                            {/* Photo Upload - Custom UI */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">{t('photoLabel')} (max 20)</Label>
                                    <span className="text-sm text-slate-500">{selectedFiles.length} / {MAX_FILES}</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {selectedFiles.map((file, index) => (
                                        <div key={index} className="relative group aspect-[4/3] rounded-lg overflow-hidden border bg-slate-100">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={`Preview ${index}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                {index > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newFiles = [...selectedFiles];
                                                            [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
                                                            setSelectedFiles(newFiles);
                                                            form.setValue("photos", newFiles);
                                                        }}
                                                        className="p-1 bg-white rounded hover:bg-slate-100"
                                                        title="Move Left"
                                                    >
                                                        ⬅️
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newFiles = selectedFiles.filter((_, i) => i !== index);
                                                        setSelectedFiles(newFiles);
                                                        form.setValue("photos", newFiles);
                                                    }}
                                                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                                    title="Remove"
                                                >
                                                    🗑️
                                                </button>
                                                {index < selectedFiles.length - 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newFiles = [...selectedFiles];
                                                            [newFiles[index + 1], newFiles[index]] = [newFiles[index], newFiles[index + 1]];
                                                            setSelectedFiles(newFiles);
                                                            form.setValue("photos", newFiles);
                                                        }}
                                                        className="p-1 bg-white rounded hover:bg-slate-100"
                                                        title="Move Right"
                                                    >
                                                        ➡️
                                                    </button>
                                                )}
                                            </div>
                                            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                                                {index + 1}
                                            </div>
                                        </div>
                                    ))}

                                    {selectedFiles.length < MAX_FILES && (
                                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors aspect-[4/3]">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <span className="text-3xl text-slate-400">+</span>
                                                <p className="mb-2 text-sm text-slate-500 font-semibold">{t('addPhoto') || "Add Photo"}</p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                multiple
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (e.target.files) {
                                                        const newFiles = Array.from(e.target.files);
                                                        const validFiles = newFiles.filter(f => f.size <= MAX_FILE_SIZE);
                                                        if (validFiles.length < newFiles.length) {
                                                            toast.error("Some files were skipped (min 5MB limit)");
                                                        }

                                                        const updated = [...selectedFiles, ...validFiles].slice(0, MAX_FILES);
                                                        setSelectedFiles(updated);
                                                        form.setValue("photos", updated, { shouldValidate: true });
                                                    }
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
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
