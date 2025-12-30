"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useTranslations } from "next-intl";

interface VehicleSearchResult {
    vehicleID: string;
    make: string;
    model: string;
    year: number;
    baseDailyRate: number;
    currencyCode: string;
    cityName: string;
    primaryPhotoUrl?: string;
    averageRating?: number;
    tripCount: number;
}

interface SimilarVehiclesProps {
    vehicleId: string;
}

export function SimilarVehicles({ vehicleId }: SimilarVehiclesProps) {
    const [vehicles, setVehicles] = useState<VehicleSearchResult[]>([]);
    const t = useTranslations('Listing'); // Or common

    useEffect(() => {
        api.get<VehicleSearchResult[]>(`/api/vehicles/${vehicleId}/similar`)
            .then(res => setVehicles(res.data))
            .catch(err => console.error("Failed to load similar vehicles", err));
    }, [vehicleId]);

    if (vehicles.length === 0) return null;

    const formatPrice = (amount: number, currency: string) => {
        return new Intl.NumberFormat('fr-GN', {
            style: 'currency',
            currency: currency || 'GNF',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getImageUrl = (url?: string) => {
        if (!url) return "https://placehold.co/800x500/f1f5f9/1e1b4b?text=G-MoP";
        return url.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${url}` : url;
    };

    return (
        <div className="mt-12 pt-12 border-t">
            <h2 className="text-2xl font-bold text-primary mb-6">Véhicules similaires</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {vehicles.map(vehicle => (
                    <Link key={vehicle.vehicleID} href={`/vehicles/${vehicle.vehicleID}`}>
                        <Card className="h-full hover:shadow-md transition-shadow">
                            <div className="aspect-[4/3] bg-slate-100 relative">
                                <img
                                    src={getImageUrl(vehicle.primaryPhotoUrl)}
                                    alt={`${vehicle.make} ${vehicle.model}`}
                                    className="w-full h-full object-cover rounded-t-xl"
                                />
                                <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold text-primary">
                                    {formatPrice(vehicle.baseDailyRate, vehicle.currencyCode)}/j
                                </div>
                            </div>
                            <CardContent className="p-4">
                                <h3 className="font-bold text-slate-900 truncate">{vehicle.make} {vehicle.model}</h3>
                                <p className="text-sm text-slate-500">{vehicle.year} • {vehicle.cityName}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
