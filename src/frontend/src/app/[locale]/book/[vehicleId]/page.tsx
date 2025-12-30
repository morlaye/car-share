"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";

interface VehicleInfo {
    vehicleID: string;
    make: string;
    model: string;
    year: number;
    baseDailyRate: number;
    currencyCode: string;
    isChauffeurAvailable: boolean;
    chauffeurDailyFee?: number;
    cityName: string;
    ownerName: string;
    photoURLs: string[];
}

interface BookedDateRange {
    startDate: string;
    endDate: string;
    status: string;
}

export default function BookingPage() {
    const params = useParams();
    const vehicleId = params.vehicleId as string;
    const t = useTranslations('Booking');

    const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
    const [bookedDates, setBookedDates] = useState<BookedDateRange[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [includeChauffeur, setIncludeChauffeur] = useState(false);
    const [pickupAddress, setPickupAddress] = useState("");

    // Calculated pricing
    const [pricing, setPricing] = useState({
        days: 0,
        dailyTotal: 0,
        chauffeurTotal: 0,
        platformFee: 0,
        securityDeposit: 0,
        total: 0
    });

    // Auth check + fetch vehicle + booked dates
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            window.location.href = "/login";
            return;
        }

        if (vehicleId) {
            Promise.all([
                api.get<VehicleInfo>(`/api/vehicles/${vehicleId}`),
                api.get<BookedDateRange[]>(`/api/bookings/booked-dates/${vehicleId}`)
            ]).then(([vehicleRes, bookedRes]) => {
                setVehicle(vehicleRes.data);
                setBookedDates(bookedRes.data);
            }).catch(() => {
                toast.error("Vehicle not found");
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [vehicleId]);

    // Calculate pricing when dates change
    useEffect(() => {
        if (!vehicle || !startDate || !endDate) {
            setPricing({ days: 0, dailyTotal: 0, chauffeurTotal: 0, platformFee: 0, securityDeposit: 0, total: 0 });
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

        if (days <= 0) {
            setPricing({ days: 0, dailyTotal: 0, chauffeurTotal: 0, platformFee: 0, securityDeposit: 0, total: 0 });
            return;
        }

        const dailyTotal = vehicle.baseDailyRate * days;
        const chauffeurTotal = includeChauffeur && vehicle.isChauffeurAvailable
            ? (vehicle.chauffeurDailyFee || 0) * days
            : 0;
        const subtotal = dailyTotal + chauffeurTotal;
        const platformFee = subtotal * 0.12;
        const securityDeposit = vehicle.baseDailyRate * 2;
        const total = subtotal + platformFee;

        setPricing({ days, dailyTotal, chauffeurTotal, platformFee, securityDeposit, total });
    }, [vehicle, startDate, endDate, includeChauffeur]);

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('fr-GN', {
            style: 'currency',
            currency: vehicle?.currencyCode || 'GNF',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!startDate || !endDate || pricing.days <= 0) {
            toast.error("Please select valid dates");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post("/api/bookings", {
                vehicleID: vehicleId,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
                includesChauffeur: includeChauffeur,
                pickupAddress: pickupAddress || null
            });

            toast.success(t('success'));
            window.location.href = "/";
        } catch (error: any) {
            const msg = error.response?.data || "Booking failed";
            toast.error(typeof msg === 'string' ? msg : "Booking failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-pulse text-slate-500">Loading...</div>
            </div>
        );
    }

    if (!vehicle) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <h1 className="text-2xl font-bold text-primary">Vehicle not found</h1>
                <Link href="/"><Button>Back to Home</Button></Link>
            </div>
        );
    }

    const mainImage = vehicle.photoURLs?.[0]
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${vehicle.photoURLs[0]}`
        : "https://placehold.co/400x300/f1f5f9/1e1b4b?text=G-MoP";

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-bold text-primary tracking-tight">G-MoP</Link>
                    <Link href={`/vehicles/${vehicleId}`}><Button variant="ghost">← Back</Button></Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-primary mb-8">{t('title')}</h1>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Vehicle Summary */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 mb-4">
                                    <img src={mainImage} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover" />
                                </div>
                                <h2 className="text-xl font-bold text-primary">{vehicle.year} {vehicle.make} {vehicle.model}</h2>
                                <p className="text-slate-500">{vehicle.cityName} • {vehicle.ownerName}</p>
                                <p className="text-2xl font-bold text-primary mt-2">
                                    {formatPrice(vehicle.baseDailyRate)} <span className="text-sm font-normal text-slate-500">/ day</span>
                                </p>
                            </CardContent>
                        </Card>

                        {/* Booking Form */}
                        <div className="space-y-6">
                            <Card>
                                <CardContent className="p-6">
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>{t('startDate')}</Label>
                                                <Input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <Label>{t('endDate')}</Label>
                                                <Input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    min={startDate || new Date().toISOString().split('T')[0]}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Availability Calendar */}
                                        {bookedDates.length > 0 && (
                                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                                <p className="text-sm font-medium text-orange-800 mb-2">📅 Dates indisponibles:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {bookedDates.map((range, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded"
                                                        >
                                                            {new Date(range.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                            {' → '}
                                                            {new Date(range.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {vehicle.isChauffeurAvailable && (
                                            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                                                <input
                                                    type="checkbox"
                                                    id="chauffeur"
                                                    checked={includeChauffeur}
                                                    onChange={(e) => setIncludeChauffeur(e.target.checked)}
                                                    className="h-4 w-4"
                                                />
                                                <Label htmlFor="chauffeur" className="flex-1">{t('withChauffeur')}</Label>
                                                <span className="text-sm text-slate-500">+{formatPrice(vehicle.chauffeurDailyFee || 0)}/day</span>
                                            </div>
                                        )}

                                        <div>
                                            <Label>{t('pickupAddress')}</Label>
                                            <Input
                                                value={pickupAddress}
                                                onChange={(e) => setPickupAddress(e.target.value)}
                                                placeholder="Optional"
                                            />
                                        </div>

                                        {/* Price Summary */}
                                        {pricing.days > 0 && (
                                            <div className="border-t pt-4 space-y-2">
                                                <h3 className="font-bold text-primary">{t('priceSummary')}</h3>
                                                <div className="flex justify-between text-sm">
                                                    <span>{formatPrice(vehicle.baseDailyRate)} × {pricing.days} {t('days')}</span>
                                                    <span>{formatPrice(pricing.dailyTotal)}</span>
                                                </div>
                                                {pricing.chauffeurTotal > 0 && (
                                                    <div className="flex justify-between text-sm">
                                                        <span>{t('chauffeurFee')}</span>
                                                        <span>{formatPrice(pricing.chauffeurTotal)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-sm text-slate-500">
                                                    <span>{t('platformFee')}</span>
                                                    <span>{formatPrice(pricing.platformFee)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-slate-500">
                                                    <span>{t('securityDeposit')}</span>
                                                    <span>{formatPrice(pricing.securityDeposit)}</span>
                                                </div>
                                                <div className="flex justify-between font-bold text-lg border-t pt-2">
                                                    <span>{t('total')}</span>
                                                    <span className="text-primary">{formatPrice(pricing.total)}</span>
                                                </div>
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            className="w-full bg-primary-action hover:bg-primary-action/90 text-white py-6 text-lg"
                                            disabled={isSubmitting || pricing.days <= 0}
                                        >
                                            {isSubmitting ? "..." : t('submitButton')}
                                        </Button>

                                        <p className="text-xs text-center text-slate-400">{t('pending')}</p>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
