"use client";

import { useTranslations } from "next-intl";

interface LocationMapProps {
    cityName: string;
}

export function LocationMap({ cityName }: LocationMapProps) {
    const t = useTranslations('Listing'); // Use appropriate translation scope

    return (
        <div className="bg-slate-100 rounded-xl overflow-hidden h-80 relative flex items-center justify-center">
            {/* Placeholder for actual Map implementation (e.g. Leaflet or Google Maps) */}
            <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(cityName + ", Guinea")}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                className="opacity-80 hover:opacity-100 transition-opacity"
            ></iframe>
            <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded shadow text-sm font-bold text-slate-800 pointer-events-none">
                📍 {cityName}
            </div>
        </div>
    );
}
