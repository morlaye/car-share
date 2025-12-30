"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";

interface BookingItem {
    bookingID: string;
    bookingReference: string;
    vehicleName: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    totalAmount: number;
    status: string;
    currencyCode: string;
    ownerName: string;
    renterName: string;
}

interface VehicleItem {
    vehicleID: string;
    make: string;
    model: string;
    year: number;
    baseDailyRate: number;
    currencyCode: string;
    listingStatus: string;
    cityName: string;
}

export default function DashboardPage() {
    const t = useTranslations('Dashboard');
    const tNav = useTranslations('Navigation');
    const tReviews = useTranslations('Reviews');

    const [myBookings, setMyBookings] = useState<BookingItem[]>([]);
    const [myVehicles, setMyVehicles] = useState<VehicleItem[]>([]);
    const [ownerRequests, setOwnerRequests] = useState<BookingItem[]>([]);
    const [pendingReviews, setPendingReviews] = useState<{ bookingID: string; bookingReference: string; vehicleName: string; endDate: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'bookings' | 'vehicles' | 'requests' | 'reviews'>('bookings');

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            window.location.href = "/login";
            return;
        }

        // Fetch all data
        Promise.all([
            api.get<BookingItem[]>("/api/bookings/my-bookings").catch(() => ({ data: [] })),
            api.get<VehicleItem[]>("/api/vehicles/my-vehicles").catch(() => ({ data: [] })),
            api.get<BookingItem[]>("/api/bookings/owner-requests").catch(() => ({ data: [] })),
            api.get<{ bookingID: string; bookingReference: string; vehicleName: string; endDate: string }[]>("/api/reviews/pending").catch(() => ({ data: [] }))
        ]).then(([bookingsRes, vehiclesRes, requestsRes, reviewsRes]) => {
            setMyBookings(bookingsRes.data);
            setMyVehicles(vehiclesRes.data);
            setOwnerRequests(requestsRes.data);
            setPendingReviews(reviewsRes.data);
        }).finally(() => setIsLoading(false));
    }, []);

    const formatPrice = (amount: number, currency: string) => {
        return new Intl.NumberFormat('fr-GN', {
            style: 'currency',
            currency: currency || 'GNF',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return 'bg-green-100 text-green-700';
            case 'requested': return 'bg-yellow-100 text-yellow-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            case 'completed': return 'bg-blue-100 text-blue-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const handleUpdateStatus = async (bookingId: string, status: string) => {
        try {
            await api.put(`/api/bookings/${bookingId}/status`, { status });
            toast.success(`Booking ${status.toLowerCase()}`);
            // Refresh requests
            const res = await api.get<BookingItem[]>("/api/bookings/owner-requests");
            setOwnerRequests(res.data);
        } catch (error: any) {
            toast.error(error.response?.data || "Failed to update booking");
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        try {
            await api.put(`/api/bookings/${bookingId}/cancel`);
            toast.success("Booking cancelled");
            // Refresh my bookings
            const res = await api.get<BookingItem[]>("/api/bookings/my-bookings");
            setMyBookings(res.data);
        } catch (error: any) {
            toast.error(error.response?.data || "Failed to cancel booking");
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-pulse text-slate-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-bold text-primary tracking-tight">G-MoP</Link>
                    <Link href="/"><Button variant="ghost">← {tNav('home')}</Button></Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-primary mb-8">{t('title')}</h1>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b">
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'bookings' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-primary'}`}
                    >
                        {t('myBookings')} ({myBookings.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('vehicles')}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'vehicles' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-primary'}`}
                    >
                        {t('myVehicles')} ({myVehicles.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'requests' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-primary'}`}
                    >
                        {t('bookingRequests')} ({ownerRequests.filter(r => r.status === 'Requested').length})
                    </button>
                    {pendingReviews.length > 0 && (
                        <button
                            onClick={() => setActiveTab('reviews')}
                            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'reviews' ? 'text-primary border-b-2 border-primary' : 'text-orange-500 hover:text-orange-600'}`}
                        >
                            ⭐ {tReviews('pendingReviews')} ({pendingReviews.length})
                        </button>
                    )}
                </div>

                {/* My Bookings Tab */}
                {activeTab === 'bookings' && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Link href="/">
                                <Button className="bg-primary-action hover:bg-primary-action/90 text-white">Louer un véhicule</Button>
                            </Link>
                        </div>
                        {myBookings.length === 0 ? (
                            <Card><CardContent className="p-8 text-center text-slate-500">{t('noBookings')}</CardContent></Card>
                        ) : (
                            myBookings.map(booking => (
                                <Card key={booking.bookingID}>
                                    <CardContent className="p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <p className="font-bold text-primary">{booking.vehicleName}</p>
                                                <p className="text-sm text-slate-500">{booking.bookingReference}</p>
                                            </div>
                                            <div className="text-sm">
                                                <p className="font-medium">{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</p>
                                                <p className="text-slate-500">{booking.totalDays} {t('days')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-primary">{formatPrice(booking.totalAmount, booking.currencyCode)}</p>
                                                <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                                            </div>
                                            {(booking.status === 'Requested' || booking.status === 'Confirmed') && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCancelBooking(booking.bookingID)}
                                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                                >
                                                    {t('cancel')}
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* My Vehicles Tab */}
                {activeTab === 'vehicles' && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Link href="/vehicles/new">
                                <Button className="bg-primary-action hover:bg-primary-action/90 text-white">{t('addVehicle')}</Button>
                            </Link>
                        </div>
                        {myVehicles.length === 0 ? (
                            <Card><CardContent className="p-8 text-center text-slate-500">{t('noVehicles')}</CardContent></Card>
                        ) : (
                            myVehicles.map(vehicle => (
                                <Card key={vehicle.vehicleID}>
                                    <CardContent className="p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <p className="font-bold text-primary">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                                                <p className="text-sm text-slate-500">{vehicle.cityName}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-primary">{formatPrice(vehicle.baseDailyRate, vehicle.currencyCode)} {t('perDay')}</p>
                                                <Badge className={vehicle.listingStatus === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                                                    {vehicle.listingStatus}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* Booking Requests Tab (for owners) */}
                {activeTab === 'requests' && (
                    <div className="space-y-4">
                        {ownerRequests.length === 0 ? (
                            <Card><CardContent className="p-8 text-center text-slate-500">{t('noRequests')}</CardContent></Card>
                        ) : (
                            ownerRequests.map(request => (
                                <Card key={request.bookingID}>
                                    <CardContent className="p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <p className="font-bold text-primary">{request.vehicleName}</p>
                                                <p className="text-sm text-slate-500">{t('renter')}: {request.renterName}</p>
                                            </div>
                                            <div className="text-sm">
                                                <p className="font-medium">{formatDate(request.startDate)} → {formatDate(request.endDate)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-primary">{formatPrice(request.totalAmount, request.currencyCode)}</p>
                                                <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                                            </div>
                                            {request.status === 'Requested' && (
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={() => handleUpdateStatus(request.bookingID, 'Confirmed')} className="bg-green-600 hover:bg-green-700 text-white">
                                                        {t('confirm')}
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(request.bookingID, 'Cancelled')} className="text-red-600 border-red-300 hover:bg-red-50">
                                                        {t('reject')}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* Pending Reviews Tab */}
                {activeTab === 'reviews' && (
                    <div className="space-y-4">
                        <div className="text-sm text-slate-500 mb-4">
                            ⭐ Vous avez {pendingReviews.length} location(s) à évaluer
                        </div>
                        {pendingReviews.map(review => (
                            <Card key={review.bookingID}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-primary">{review.vehicleName}</p>
                                        <p className="text-sm text-slate-500">
                                            {review.bookingReference} • Terminée le {new Date(review.endDate).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                    <Link href={`/reviews?bookingId=${review.bookingID}`}>
                                        <Button className="bg-primary-action hover:bg-primary-action/90 text-white">
                                            {tReviews('writeReview')}
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
