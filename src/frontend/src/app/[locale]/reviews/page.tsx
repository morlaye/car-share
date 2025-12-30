"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "sonner";

interface PendingReview {
    bookingID: string;
    bookingReference: string;
    vehicleName: string;
    endDate: string;
}

export default function WriteReviewPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('bookingId');
    const t = useTranslations('Reviews');

    const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<PendingReview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Ratings state
    const [cleanliness, setCleanliness] = useState(5);
    const [maintenance, setMaintenance] = useState(5);
    const [communication, setCommunication] = useState(5);
    const [convenience, setConvenience] = useState(5);
    const [accuracy, setAccuracy] = useState(5);
    const [comment, setComment] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            window.location.href = "/login";
            return;
        }

        api.get<PendingReview[]>("/api/reviews/pending")
            .then(res => {
                setPendingReviews(res.data);
                // If bookingId is provided, pre-select it
                if (bookingId) {
                    const found = res.data.find(p => p.bookingID === bookingId);
                    if (found) setSelectedBooking(found);
                }
            })
            .catch(() => toast.error("Failed to load pending reviews"))
            .finally(() => setIsLoading(false));
    }, [bookingId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedBooking) {
            toast.error("Please select a booking to review");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post("/api/reviews", {
                bookingID: selectedBooking.bookingID,
                cleanlinessRating: cleanliness,
                maintenanceRating: maintenance,
                communicationRating: communication,
                convenienceRating: convenience,
                accuracyRating: accuracy,
                comment: comment || null
            });

            toast.success(t('success'));
            window.location.href = "/dashboard";
        } catch (error: any) {
            toast.error(error.response?.data || "Failed to submit review");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Star rating component
    const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
        <div className="flex items-center justify-between py-2">
            <Label className="text-slate-700">{label}</Label>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        className={`text-2xl transition-colors ${star <= value ? 'text-yellow-400' : 'text-slate-300'} hover:text-yellow-500`}
                    >
                        ★
                    </button>
                ))}
            </div>
        </div>
    );

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
                    <Link href="/dashboard"><Button variant="ghost">← Dashboard</Button></Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold text-primary mb-8">{t('writeReview')}</h1>

                    {pendingReviews.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center text-slate-500">
                                <p className="mb-4">Aucune location à évaluer pour le moment.</p>
                                <Link href="/dashboard">
                                    <Button variant="outline">Retour au tableau de bord</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Select Booking */}
                            {!selectedBooking && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Sélectionnez une location</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {pendingReviews.map(review => (
                                            <button
                                                key={review.bookingID}
                                                type="button"
                                                onClick={() => setSelectedBooking(review)}
                                                className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                                            >
                                                <p className="font-medium text-primary">{review.vehicleName}</p>
                                                <p className="text-sm text-slate-500">
                                                    {review.bookingReference} • Terminée le {new Date(review.endDate).toLocaleDateString('fr-FR')}
                                                </p>
                                            </button>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Review Form */}
                            {selectedBooking && (
                                <>
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <p className="font-bold text-primary">{selectedBooking.vehicleName}</p>
                                                    <p className="text-sm text-slate-500">{selectedBooking.bookingReference}</p>
                                                </div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedBooking(null)}>
                                                    Changer
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Évaluez votre expérience</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <StarRating label={t('cleanliness')} value={cleanliness} onChange={setCleanliness} />
                                            <StarRating label={t('maintenance')} value={maintenance} onChange={setMaintenance} />
                                            <StarRating label={t('communication')} value={communication} onChange={setCommunication} />
                                            <StarRating label={t('convenience')} value={convenience} onChange={setConvenience} />
                                            <StarRating label={t('accuracy')} value={accuracy} onChange={setAccuracy} />
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>{t('comment')}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <textarea
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                placeholder="Partagez votre expérience avec ce véhicule..."
                                                className="w-full h-32 p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </CardContent>
                                    </Card>

                                    <Button
                                        type="submit"
                                        className="w-full bg-primary-action hover:bg-primary-action/90 text-white py-6 text-lg"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "..." : t('submit')}
                                    </Button>
                                </>
                            )}
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
