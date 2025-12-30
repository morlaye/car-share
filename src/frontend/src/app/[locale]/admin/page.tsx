"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";

interface AdminStats {
    totalUsers: number;
    totalVehicles: number;
    activeVehicles: number;
    totalBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    pendingPayments: number;
}

interface AdminBooking {
    bookingID: string;
    bookingReference: string;
    vehicleName: string;
    renterName: string;
    renterEmail: string;
    startDate: string;
    endDate: string;
    totalAmount: number;
    securityDeposit: number;
    currencyCode: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
}

export default function AdminPage() {
    const t = useTranslations('Admin');
    const tNav = useTranslations('Navigation');

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [bookings, setBookings] = useState<AdminBooking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState<'stats' | 'bookings'>('stats');

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            window.location.href = "/login";
            return;
        }

        // Fetch admin data
        Promise.all([
            api.get<AdminStats>("/api/admin/stats"),
            api.get<AdminBooking[]>("/api/admin/bookings")
        ]).then(([statsRes, bookingsRes]) => {
            setStats(statsRes.data);
            setBookings(bookingsRes.data);
            setIsAdmin(true);
        }).catch((err) => {
            if (err.response?.status === 403) {
                toast.error("Access denied. Admin only.");
                window.location.href = "/dashboard";
            }
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
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return 'bg-green-100 text-green-700';
            case 'requested': return 'bg-yellow-100 text-yellow-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            case 'completed': return 'bg-blue-100 text-blue-700';
            case 'active': return 'bg-purple-100 text-purple-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'fullypaid': return 'bg-green-100 text-green-700';
            case 'depositpaid': return 'bg-blue-100 text-blue-700';
            case 'pendingdeposit': return 'bg-orange-100 text-orange-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const confirmPayment = async (bookingId: string, paymentType: string) => {
        try {
            await api.put(`/api/admin/bookings/${bookingId}/confirm-payment`, { paymentType });
            toast.success(`Payment confirmed: ${paymentType}`);
            // Refresh bookings
            const res = await api.get<AdminBooking[]>("/api/admin/bookings");
            setBookings(res.data);
        } catch (error) {
            toast.error("Failed to confirm payment");
        }
    };

    const completeBooking = async (bookingId: string) => {
        try {
            await api.put(`/api/admin/bookings/${bookingId}/complete`);
            toast.success("Booking completed");
            const res = await api.get<AdminBooking[]>("/api/admin/bookings");
            setBookings(res.data);
        } catch (error) {
            toast.error("Failed to complete booking");
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-pulse text-slate-500">Loading...</div>
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-indigo-900 text-white">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-bold tracking-tight">G-MoP Admin</Link>
                    <Link href="/dashboard"><Button variant="ghost" className="text-white hover:bg-white/10">← Dashboard</Button></Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-primary mb-8">{t('title')}</h1>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b">
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'stats' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
                    >
                        {t('stats')}
                    </button>
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'bookings' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
                    >
                        {t('bookings')} ({bookings.length})
                    </button>
                </div>

                {/* Stats Tab */}
                {activeTab === 'stats' && stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-6 text-center">
                                <p className="text-4xl font-bold text-primary">{stats.totalUsers}</p>
                                <p className="text-slate-500">{t('totalUsers')}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 text-center">
                                <p className="text-4xl font-bold text-primary">{stats.totalVehicles}</p>
                                <p className="text-slate-500">{t('totalVehicles')}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 text-center">
                                <p className="text-4xl font-bold text-primary">{stats.totalBookings}</p>
                                <p className="text-slate-500">{t('bookings')}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 text-center">
                                <p className="text-4xl font-bold text-orange-600">{stats.pendingPayments}</p>
                                <p className="text-slate-500">{t('pendingPayments')}</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Bookings Tab */}
                {activeTab === 'bookings' && (
                    <div className="space-y-4">
                        {bookings.map(booking => (
                            <Card key={booking.bookingID}>
                                <CardContent className="p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="min-w-[200px]">
                                            <p className="font-bold text-primary">{booking.vehicleName}</p>
                                            <p className="text-sm text-slate-500">{booking.bookingReference}</p>
                                            <p className="text-sm text-slate-600">{booking.renterName} • {booking.renterEmail}</p>
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-medium">{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-primary">{formatPrice(booking.totalAmount, booking.currencyCode)}</p>
                                            <p className="text-xs text-slate-500">Caution: {formatPrice(booking.securityDeposit, booking.currencyCode)}</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                                            <Badge className={getPaymentStatusColor(booking.paymentStatus)}>{booking.paymentStatus}</Badge>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {booking.paymentStatus === 'PendingDeposit' && (
                                                <Button size="sm" onClick={() => confirmPayment(booking.bookingID, 'Deposit')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                                                    {t('confirmDeposit')}
                                                </Button>
                                            )}
                                            {booking.paymentStatus === 'DepositPaid' && (
                                                <Button size="sm" onClick={() => confirmPayment(booking.bookingID, 'Full')} className="bg-green-600 hover:bg-green-700 text-white text-xs">
                                                    {t('confirmFull')}
                                                </Button>
                                            )}
                                            {booking.status === 'Active' && (
                                                <Button size="sm" onClick={() => completeBooking(booking.bookingID)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                                                    {t('complete')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
