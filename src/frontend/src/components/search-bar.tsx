"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface City {
    cityID: number;
    cityName: string;
}

interface SearchBarProps {
    cities: City[];
    onSearch: (params: SearchParams) => void;
}

export interface SearchParams {
    cityId?: number;
    cityName?: string;
    startDate?: string;
    endDate?: string;
    durationMonths?: number;
    priceMin?: number;
    priceMax?: number;
    hasChauffeur?: boolean;
}

export function SearchBar({ cities, onSearch }: SearchBarProps) {
    // Location state
    const [locationOpen, setLocationOpen] = useState(false);
    const [selectedCity, setSelectedCity] = useState<City | null>(null);
    const [locationSearch, setLocationSearch] = useState("");

    // Date state
    const [dateOpen, setDateOpen] = useState(false);
    const [dateMode, setDateMode] = useState<'days' | 'months'>('days');
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [durationMonths, setDurationMonths] = useState(3);

    // Filter state
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
    const [hasChauffeur, setHasChauffeur] = useState(false);

    // Refs for outside click
    const locationRef = useRef<HTMLDivElement>(null);
    const dateRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
                setLocationOpen(false);
            }
            if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
                setDateOpen(false);
            }
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setFiltersOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter cities based on search
    const filteredCities = cities.filter(city =>
        city.cityName.toLowerCase().includes(locationSearch.toLowerCase())
    );

    // Calculate end date from months
    useEffect(() => {
        if (dateMode === 'months' && startDate) {
            const start = new Date(startDate);
            start.setMonth(start.getMonth() + durationMonths);
            setEndDate(start.toISOString().split('T')[0]);
        }
    }, [dateMode, durationMonths, startDate]);

    // Set default start date to today if not set
    useEffect(() => {
        if (!startDate) {
            setStartDate(new Date().toISOString().split('T')[0]);
        }
    }, [startDate]);

    const handleSearch = () => {
        onSearch({
            cityId: selectedCity?.cityID,
            cityName: selectedCity?.cityName,
            startDate,
            endDate,
            durationMonths: dateMode === 'months' ? durationMonths : undefined,
            priceMin: priceRange[0] > 0 ? priceRange[0] : undefined,
            priceMax: priceRange[1] < 500000 ? priceRange[1] : undefined,
            hasChauffeur: hasChauffeur || undefined
        });
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return "Dates";
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="space-y-3">
            <div className="glass max-w-4xl w-full mx-auto rounded-2xl p-2 flex flex-col md:flex-row items-stretch shadow-xl border border-white/40 relative z-30">
                {/* Location Selector */}
                <div ref={locationRef} className="relative flex-1">
                    <button
                        type="button"
                        onClick={() => { setLocationOpen(!locationOpen); setDateOpen(false); }}
                        className="w-full px-6 py-3 text-left hover:bg-white/50 rounded-xl transition-colors"
                    >
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lieu</div>
                        <div className="text-lg text-gray-900 truncate">
                            {selectedCity?.cityName || "Ville, région..."}
                        </div>
                    </button>

                    {locationOpen && (
                        <div className="absolute top-full left-0 right-0 mt-16 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[60] max-h-80 overflow-y-auto">
                            <div className="p-3 border-b">
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={locationSearch}
                                    onChange={(e) => setLocationSearch(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    autoFocus
                                />
                            </div>

                            <div className="py-2">
                                <button
                                    type="button"
                                    onClick={() => { setSelectedCity(null); setLocationOpen(false); setLocationSearch(""); }}
                                    className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3"
                                >
                                    <span className="text-xl">🌍</span>
                                    <div>
                                        <div className="font-medium">N'importe où</div>
                                        <div className="text-xs text-slate-500">Toutes les villes</div>
                                    </div>
                                </button>

                                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Villes</div>
                                {filteredCities.map(city => (
                                    <button
                                        key={city.cityID}
                                        type="button"
                                        onClick={() => { setSelectedCity(city); setLocationOpen(false); setLocationSearch(""); }}
                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3"
                                    >
                                        <span className="text-xl">🏙️</span>
                                        <div className="font-medium">{city.cityName}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="hidden md:block w-px bg-slate-200 my-2"></div>

                {/* Date Selector */}
                <div ref={dateRef} className="relative flex-1">
                    <button
                        type="button"
                        onClick={() => { setDateOpen(!dateOpen); setLocationOpen(false); }}
                        className="w-full px-6 py-3 text-left hover:bg-white/50 rounded-xl transition-colors"
                    >
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dates</div>
                        <div className="text-lg text-gray-900 truncate">
                            {dateMode === 'months'
                                ? `${durationMonths} mois`
                                : startDate && endDate
                                    ? `${formatDateDisplay(startDate)} → ${formatDateDisplay(endDate)}`
                                    : "Sélectionner"
                            }
                        </div>
                    </button>

                    {dateOpen && (
                        <div className="absolute top-full left-0 right-0 mt-16 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[60] min-w-[320px]">
                            {/* Mode Toggle */}
                            <div className="flex justify-center p-4 border-b">
                                <div className="inline-flex bg-slate-100 rounded-full p-1">
                                    <button
                                        type="button"
                                        onClick={() => setDateMode('days')}
                                        className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${dateMode === 'days' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        Jours
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDateMode('months')}
                                        className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${dateMode === 'months' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-800'}`}
                                    >
                                        Mois
                                    </button>
                                </div>
                            </div>

                            {dateMode === 'days' ? (
                                <div className="p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Départ</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Retour</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                min={startDate || new Date().toISOString().split('T')[0]}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 text-center">
                                    <p className="text-lg font-medium text-slate-700 mb-4">Je cherche une voiture pour</p>
                                    <div className="flex items-center justify-center gap-4 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setDurationMonths(Math.max(1, durationMonths - 1))}
                                            className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                                        >
                                            −
                                        </button>
                                        <div className="text-center">
                                            <span className="text-5xl font-bold text-primary">{durationMonths}</span>
                                            <div className="text-slate-500">mois</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setDurationMonths(Math.min(12, durationMonths + 1))}
                                            className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        {formatDateDisplay(startDate)} à {formatDateDisplay(endDate)}
                                    </p>
                                </div>
                            )}

                            <div className="p-4 border-t flex justify-between">
                                <button
                                    type="button"
                                    onClick={() => { setStartDate(""); setEndDate(""); setDurationMonths(3); }}
                                    className="text-sm text-slate-600 hover:text-slate-800"
                                >
                                    Réinitialiser
                                </button>
                                <Button
                                    type="button"
                                    onClick={() => setDateOpen(false)}
                                    className="bg-primary-action hover:bg-primary-action/90 text-white px-6"
                                >
                                    Enregistrer
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Search Button */}
                <div className="p-2">
                    <Button
                        type="button"
                        onClick={handleSearch}
                        className="h-full w-full md:w-14 md:h-14 rounded-xl md:rounded-full bg-primary-action hover:bg-primary-action/90 text-white shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="md:hidden">Rechercher</span>
                    </Button>
                </div>
            </div>

            {/* Filter Chips Row */}
            <div className="max-w-4xl mx-auto flex flex-wrap gap-2 justify-center relative z-10">
                <button
                    type="button"
                    onClick={() => setHasChauffeur(!hasChauffeur)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${hasChauffeur
                        ? 'bg-primary text-white'
                        : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200'
                        }`}
                >
                    🚗 Avec chauffeur {hasChauffeur && '✓'}
                </button>

                <div ref={filterRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setFiltersOpen(!filtersOpen)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${priceRange[0] > 0 || priceRange[1] < 500000
                            ? 'bg-primary text-white'
                            : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200'
                            }`}
                    >
                        💰 Prix {priceRange[0] > 0 || priceRange[1] < 500000
                            ? `${formatPrice(priceRange[0])} - ${formatPrice(priceRange[1])}`
                            : ''}
                    </button>

                    {filtersOpen && (
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 p-4 z-50 min-w-[280px]">
                            <p className="text-sm font-medium text-slate-700 mb-3">Fourchette de prix (par jour)</p>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500">Min</label>
                                        <input
                                            type="number"
                                            value={priceRange[0]}
                                            onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">Max</label>
                                        <input
                                            type="number"
                                            value={priceRange[1]}
                                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 500000])}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                            placeholder="500000"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setPriceRange([0, 500000])}
                                        className="text-sm text-slate-600 hover:text-slate-800"
                                    >
                                        Réinitialiser
                                    </button>
                                    <Button
                                        type="button"
                                        onClick={() => setFiltersOpen(false)}
                                        size="sm"
                                        className="bg-primary-action text-white"
                                    >
                                        Appliquer
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
