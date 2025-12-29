import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface VehicleCardProps {
    id: string;
    make: string;
    model: string;
    year: number;
    baseDailyRate: number;
    currencyCode: string;
    isChauffeurAvailable: boolean;
    cityName: string;
    imageUrl?: string;
}

export function VehicleCard({
    id,
    make,
    model,
    year,
    baseDailyRate,
    currencyCode,
    isChauffeurAvailable,
    cityName,
    imageUrl,
}: VehicleCardProps) {
    const t = useTranslations('VehicleCard');
    const displayImage = imageUrl || "https://placehold.co/600x400/f1f5f9/1e1b4b?text=G-MoP";

    // Format price
    const priceFormatter = new Intl.NumberFormat('fr-GN', {
        style: 'currency',
        currency: currencyCode || 'GNF',
        maximumFractionDigits: 0,
    });

    return (
        <Card className="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
            {/* Image Container with aspect ratio */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                <img
                    src={displayImage}
                    alt={`${year} ${make} ${model}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {isChauffeurAvailable && (
                    <Badge variant="secondary" className="absolute top-3 right-3 bg-white/90 text-indigo-700 backdrop-blur-sm shadow-sm hover:bg-white">
                        {t('chauffeurIncluded')}
                    </Badge>
                )}
            </div>

            <CardContent className="p-4">
                <div className="mb-1">
                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-primary-action transition-colors">
                        {make} {model} <span className="font-normal text-gray-500 text-base">'{year.toString().slice(-2)}</span>
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                        <span className="truncate">{cityName || "Conakry"}</span>
                        <span className="mx-2">•</span>
                        <span className="flex items-center text-amber-500">
                            ★ 5.0 <span className="text-gray-400 ml-1 font-normal">(New)</span>
                        </span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-gray-50 p-4 bg-gray-50/50">
                <div>
                    <p className="text-lg font-bold text-primary">
                        {priceFormatter.format(baseDailyRate)}
                        <span className="text-sm font-normal text-gray-500"> /j</span>
                    </p>
                </div>
                <Button asChild size="sm" className="bg-primary-action hover:bg-primary-action/90 text-white shadow-none rounded-lg px-6 font-medium">
                    <Link href={`/vehicles/${id}`}>{t('viewDetails')}</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
