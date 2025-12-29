"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface VehicleDetail {
    vehicleID: string;
    make: string;
    model: string;
    year: number;
    description?: string;
    baseDailyRate: number;
    currencyCode: string;
    isChauffeurAvailable: boolean;
    chauffeurDailyFee?: number;
    cityName: string;
    ownerName: string;
    isVerified: boolean;
    photoURLs: string[];
}

export default function VehicleDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const tNav = useTranslations('Navigation');

    const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    useEffect(() => {
        if (!id) return;

        api.get<VehicleDetail>(`/api/vehicles/${id}`)
            .then(res => {
                setVehicle(res.data);
            })
            .catch(err => {
                setError(err.response?.data?.message || "Vehicle not found");
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [id]);

    // Format price
    const formatPrice = (amount: number, currency: string) => {
        return new Intl.NumberFormat('fr-GN', {
            style: 'currency',
            currency: currency || 'GNF',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Build full image URL
    const getImageUrl = (url: string) => {
        if (!url) return "https://placehold.co/800x500/f1f5f9/1e1b4b?text=G-MoP";
        return url.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${url}` : url;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-pulse text-slate-500">Chargement...</div>
            </div>
        );
    }

    if (error || !vehicle) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <h1 className="text-2xl font-bold text-primary">Véhicule non trouvé</h1>
                <p className="text-slate-500">{error}</p>
                <Link href="/">
                    <Button>Retour à l'accueil</Button>
                </Link>
            </div>
        );
    }

    const photos = vehicle.photoURLs?.length > 0 ? vehicle.photoURLs : ["https://placehold.co/800x500/f1f5f9/1e1b4b?text=G-MoP"];
    const mainImage = photos[selectedImageIndex];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-bold text-primary tracking-tight">
                        G-MoP
                    </Link>
                    <Link href="/">
                        <Button variant="ghost">← Retour</Button>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Image Gallery */}
                    <div className="lg:col-span-2">
                        {/* Main Image with Arrows */}
                        <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 group">
                            <img
                                src={getImageUrl(mainImage)}
                                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                className="w-full h-full object-cover"
                            />

                            {/* Navigation Arrows - only show if multiple photos */}
                            {photos.length > 1 && (
                                <>
                                    {/* Left Arrow */}
                                    <button
                                        onClick={() => setSelectedImageIndex(prev => prev === 0 ? photos.length - 1 : prev - 1)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Previous photo"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>

                                    {/* Right Arrow */}
                                    <button
                                        onClick={() => setSelectedImageIndex(prev => prev === photos.length - 1 ? 0 : prev + 1)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Next photo"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>

                                    {/* Photo Counter */}
                                    <div className="absolute bottom-3 right-3 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                                        {selectedImageIndex + 1} / {photos.length}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Thumbnail Gallery */}
                        {photos.length > 1 && (
                            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                                {photos.map((photo, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedImageIndex(index)}
                                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${index === selectedImageIndex
                                            ? 'border-primary-action ring-2 ring-primary-action/30'
                                            : 'border-transparent hover:border-slate-300'
                                            }`}
                                    >
                                        <img
                                            src={getImageUrl(photo)}
                                            alt={`Photo ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Description */}
                        <Card className="mt-6">
                            <CardContent className="p-6">
                                <h2 className="text-xl font-bold text-primary mb-4">Description</h2>
                                <p className="text-slate-600 leading-relaxed">
                                    {vehicle.description || "Aucune description disponible pour ce véhicule."}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Booking Card */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-24">
                            <CardContent className="p-6 space-y-6">
                                {/* Title */}
                                <div>
                                    <h1 className="text-2xl font-bold text-primary">
                                        {vehicle.make} {vehicle.model}
                                    </h1>
                                    <p className="text-slate-500">{vehicle.year} • {vehicle.cityName}</p>
                                </div>

                                {/* Badges */}
                                <div className="flex gap-2 flex-wrap">
                                    {vehicle.isChauffeurAvailable && (
                                        <Badge className="bg-indigo-100 text-indigo-700">Chauffeur disponible</Badge>
                                    )}
                                    {vehicle.isVerified && (
                                        <Badge className="bg-green-100 text-green-700">Vérifié ✓</Badge>
                                    )}
                                </div>

                                {/* Price */}
                                <div className="border-t border-b py-4">
                                    <p className="text-3xl font-bold text-primary">
                                        {formatPrice(vehicle.baseDailyRate, vehicle.currencyCode)}
                                        <span className="text-base font-normal text-slate-500"> / jour</span>
                                    </p>
                                    {vehicle.isChauffeurAvailable && vehicle.chauffeurDailyFee && (
                                        <p className="text-sm text-slate-500 mt-1">
                                            + {formatPrice(vehicle.chauffeurDailyFee, vehicle.currencyCode)} avec chauffeur
                                        </p>
                                    )}
                                </div>

                                {/* Owner */}
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                                        {vehicle.ownerName?.charAt(0) || "?"}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{vehicle.ownerName}</p>
                                        <p className="text-xs text-slate-500">Propriétaire</p>
                                    </div>
                                </div>

                                {/* CTA */}
                                <Button className="w-full bg-primary-action hover:bg-primary-action/90 text-white text-lg py-6 rounded-xl">
                                    Réserver ce véhicule
                                </Button>

                                <p className="text-xs text-center text-slate-400">
                                    Vous ne serez pas débité maintenant
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
