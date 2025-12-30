"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { LocationMap } from "@/components/location-map";
import { SimilarVehicles } from "@/components/similar-vehicles";
import { useTranslations } from "next-intl";

interface VehicleDetail {
    vehicleID: string;
    make: string;
    model: string;
    year: number;
    description?: string;
    baseDailyRate: number;
    currencyCode: string;
    cityID: number;
    cityName: string;
    isChauffeurAvailable: boolean;
    chauffeurDailyFee?: number;
    ownerName: string;
    isVerified: boolean;
    photoURLs: string[];
    vehicleAttributes?: string;
}

interface ReviewData {
    reviewID: string;
    overallRating: number;
    cleanlinessRating: number;
    maintenanceRating: number;
    communicationRating: number;
    convenienceRating: number;
    accuracyRating: number;
    comment?: string;
    reviewerName: string;
    createdAt: string;
}

interface VehicleReviewsResult {
    vehicleID: string;
    totalReviews: number;
    averageRating: number;
    averageCleanliness: number;
    averageMaintenance: number;
    averageCommunication: number;
    averageConvenience: number;
    averageAccuracy: number;
    ownerName: string;
    ownerRating: number;
    ownerTotalTrips: number;
    ownerMemberSince: string;
    reviews: ReviewData[];
}

export default function VehicleDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const tNav = useTranslations('Navigation');
    const tReviews = useTranslations('Reviews');

    const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
    const [reviewsData, setReviewsData] = useState<VehicleReviewsResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    // State for tabs
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (!id) return;

        Promise.all([
            api.get<VehicleDetail>(`/api/vehicles/${id}`),
            api.get<VehicleReviewsResult>(`/api/reviews/vehicle/${id}`)
        ]).then(([vehicleRes, reviewsRes]) => {
            setVehicle(vehicleRes.data);
            setReviewsData(reviewsRes.data);
        }).catch(err => {
            setError(err.response?.data?.message || "Vehicle not found");
        }).finally(() => {
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

    // Safe features parsing
    let features: Record<string, any> = {};
    try {
        if (vehicle.vehicleAttributes) {
            features = JSON.parse(vehicle.vehicleAttributes);
        }
    } catch (e) {
        console.error("Failed to parse attributes", e);
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
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
                    {/* Left Column: Photos & Details */}
                    <div className="lg:col-span-2">
                        {/* Image Gallery */}
                        <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 group mb-8">
                            <img
                                src={getImageUrl(mainImage)}
                                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                className="w-full h-full object-cover"
                            />

                            {/* Navigation Arrows */}
                            {photos.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setSelectedImageIndex(prev => prev === 0 ? photos.length - 1 : prev - 1)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Previous photo"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setSelectedImageIndex(prev => prev === photos.length - 1 ? 0 : prev + 1)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Next photo"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </>
                            )}

                            {/* Counter */}
                            <div className="absolute bottom-4 right-4 bg-black/60 text-white text-sm font-medium px-3 py-1 rounded-full backdrop-blur-sm">
                                {selectedImageIndex + 1} / {photos.length}
                            </div>
                        </div>

                        {/* Thumbnail Strip */}
                        {photos.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
                                {photos.map((photo, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedImageIndex(index)}
                                        className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${index === selectedImageIndex ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-70 hover:opacity-100'
                                            }`}
                                    >
                                        <img src={getImageUrl(photo)} className="w-full h-full object-cover" alt="" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Title & Owner Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-2">
                                {vehicle.make} {vehicle.model} {vehicle.year}
                            </h1>
                            <div className="flex items-center gap-2 text-slate-500 mb-4">
                                <span className="font-medium text-slate-700">{reviewsData?.averageRating?.toFixed(1) || "New"} ★</span>
                                <span>•</span>
                                <span>{reviewsData?.totalReviews || 0} avis</span>
                                <span>•</span>
                                <span>{vehicle.cityName}</span>
                            </div>

                            <div className="flex items-center gap-4 mt-6 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold">
                                    {vehicle.ownerName?.charAt(0) || "?"}
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Hébergé par</p>
                                    <p className="font-bold text-slate-900">{vehicle.ownerName}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="border-b border-slate-200 mb-8">
                            <div className="flex gap-8">
                                {['overview', 'features', 'reviews', 'location'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`pb-4 text-sm font-semibold capitalize transition-colors relative ${activeTab === tab
                                            ? 'text-primary'
                                            : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                    >
                                        {tab === 'overview' ? 'Aperçu' :
                                            tab === 'features' ? 'Caractéristiques' :
                                                tab === 'reviews' ? 'Avis' : 'Lieu'}
                                        {activeTab === tab && (
                                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tabs Content */}
                        <div className="min-h-[300px]">
                            {activeTab === 'overview' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <section>
                                        <h3 className="text-xl font-bold mb-4">Description</h3>
                                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                            {vehicle.description || "Aucune description fournie."}
                                        </p>
                                    </section>

                                    <section className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-xl">
                                            <p className="text-sm text-slate-500">Plaque</p>
                                            <p className="font-mono font-medium">{vehicle.make.substring(0, 3).toUpperCase()}***</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl">
                                            <p className="text-sm text-slate-500">Carburant</p>
                                            <p className="font-medium">Essence (Exemple)</p>
                                        </div>
                                        {/* Add dynamic attributes here if available from JSON */}
                                    </section>
                                </div>
                            )}

                            {activeTab === 'features' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="text-xl font-bold mb-6">Caractéristiques</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                                        {/* Base features */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-400">🚗</span>
                                            <span>{vehicle.isChauffeurAvailable ? "Chauffeur inclus/option" : "Conduite autonome"}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-400">📍</span>
                                            <span>GPS</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-400">❄️</span>
                                            <span>Climatisation</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-400">🎵</span>
                                            <span>Bluetooth</span>
                                        </div>

                                        {/* Dynamic features from JSON */}
                                        {Object.entries(features).map(([key, val]) => (
                                            <div key={key} className="flex items-center gap-3">
                                                <span className="text-slate-400">✨</span>
                                                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'reviews' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                        ★ {reviewsData?.averageRating.toFixed(1)} <span className="text-slate-400 font-normal">({reviewsData?.totalReviews} avis)</span>
                                    </h3>

                                    {reviewsData?.reviews.length === 0 ? (
                                        <p className="text-slate-500 italic">Aucun avis pour le moment.</p>
                                    ) : (
                                        <div className="space-y-6">
                                            {reviewsData?.reviews.map(review => (
                                                <div key={review.reviewID} className="border-b border-slate-100 pb-6 last:border-0">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                                            {review.reviewerName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900">{review.reviewerName}</p>
                                                            <p className="text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="ml-auto flex text-yellow-500 text-sm">
                                                            {"★".repeat(Math.round(review.overallRating))}
                                                            {"☆".repeat(5 - Math.round(review.overallRating))}
                                                        </div>
                                                    </div>
                                                    <p className="text-slate-700 leading-relaxed">{review.comment}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'location' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="text-xl font-bold mb-4">Emplacement</h3>
                                    <p className="text-slate-500 mb-4">Le véhicule est situé à {vehicle.cityName}. L'adresse exacte sera communiquée après la réservation.</p>
                                    <LocationMap cityName={vehicle.cityName} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Sticky Booking Card */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <Card className="shadow-xl border-slate-200 overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-end mb-6">
                                        <div>
                                            <p className="text-slate-500 line-through text-sm">
                                                {formatPrice(vehicle.baseDailyRate * 1.1, vehicle.currencyCode)}
                                            </p>
                                            <p className="text-3xl font-extrabold text-primary">
                                                {formatPrice(vehicle.baseDailyRate, vehicle.currencyCode)}
                                            </p>
                                        </div>
                                        <span className="text-slate-500 font-medium mb-1">par jour</span>
                                    </div>

                                    {vehicle.isChauffeurAvailable && (
                                        <div className="bg-indigo-50 text-indigo-700 px-4 py-3 rounded-xl text-sm font-medium mb-6 flex items-start gap-2">
                                            <span className="mt-0.5">ℹ️</span>
                                            Option chauffeur disponible pour {formatPrice(vehicle.chauffeurDailyFee || 0, vehicle.currencyCode)}/jour
                                        </div>
                                    )}

                                    <div className="space-y-3 mb-6">
                                        <div className="border rounded-xl p-3">
                                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Début du voyage</p>
                                            <p className="font-medium">Sélectionner une date</p>
                                        </div>
                                        <div className="border rounded-xl p-3">
                                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Fin du voyage</p>
                                            <p className="font-medium">Sélectionner une date</p>
                                        </div>
                                    </div>

                                    <Link href={`/book/${vehicle.vehicleID}`}>
                                        <Button className="w-full h-14 text-lg font-bold bg-primary-action hover:bg-primary-action/90 shadow-lg shadow-primary-action/20 rounded-xl">
                                            Continuer
                                        </Button>
                                    </Link>

                                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                                        <span>🔒 Paiement sécurisé</span>
                                        <span>•</span>
                                        <span>Annulation gratuite 24h</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Similar Vehicles Section */}
                <SimilarVehicles vehicleId={vehicle.vehicleID} />
            </main>
        </div>
    );
}
