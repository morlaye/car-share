"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { VehicleCard } from "@/components/vehicle-card";
import { SearchBar, SearchParams } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { components } from "@/lib/schema";
import { useTranslations } from 'next-intl';

// Use generated type from Contract
type VehicleSearchResult = components["schemas"]["VehicleSearchResult"];

interface City {
  cityID: number;
  cityName: string;
}

export default function Home() {
  const tNav = useTranslations('Navigation');
  const tHero = useTranslations('Hero');
  const tHome = useTranslations('Home');

  const [vehicles, setVehicles] = useState<VehicleSearchResult[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchParams>({});

  // Check auth + Fetch vehicles and cities on mount
  useEffect(() => {
    // Check for token
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      // Try to get user profile
      api.get("/api/auth/me")
        .then(res => {
          setUserName(res.data.fullName || res.data.email);
        })
        .catch(() => {
          // Token invalid, clear it
          localStorage.removeItem("token");
          setIsLoggedIn(false);
        });
    }

    // Fetch cities and vehicles in parallel
    Promise.all([
      api.get<City[]>("/api/cities").catch(() => ({ data: [] })),
      fetchVehicles()
    ]).then(([citiesRes]) => {
      setCities(citiesRes.data);
    });
  }, []);

  async function fetchVehicles(params?: SearchParams) {
    setIsLoading(true);
    try {
      // Build query string
      const queryParts: string[] = [];
      if (params?.cityId) queryParts.push(`cityId=${params.cityId}`);
      if (params?.cityName) queryParts.push(`query=${encodeURIComponent(params.cityName)}`);

      const url = queryParts.length > 0 ? `/api/vehicles?${queryParts.join('&')}` : "/api/vehicles";
      const res = await api.get<VehicleSearchResult[]>(url);
      setVehicles(res.data);
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSearch = (params: SearchParams) => {
    setSearchFilters(params);
    fetchVehicles(params);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUserName(null);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar - Glassmorphism */}
      <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary tracking-tight">
            G-MoP
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex text-sm font-medium text-slate-600 gap-4 mr-4">
              <a href="/fr" className="hover:text-primary-action transition-colors">FR</a>
              <span className="text-slate-300">|</span>
              <a href="/en" className="hover:text-primary-action transition-colors">EN</a>
            </div>

            {isLoggedIn ? (
              <>
                {/* User Dropdown Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <span className="hidden md:inline">👋 {userName || "User"}</span>
                    <svg className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                      <Link href="/dashboard" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        📊 Dashboard
                      </Link>
                      <Link href="/vehicles/new" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        🚗 {tNav('listCar')}
                      </Link>
                      <Link href="/admin" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        ⚙️ Admin
                      </Link>
                      <hr className="my-2 border-slate-100" />
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        🚪 Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-600 hover:text-primary hover:bg-slate-100">{tNav('login')}</Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 shadow-md hover:shadow-lg transition-all">{tNav('listCar')}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - Gradient & Clean */}
      <section className="relative z-40 flex flex-col items-center justify-center pt-24 pb-32 text-center bg-gradient-to-b from-indigo-50/50 to-white overflow-visible">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-indigo-200/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-purple-200/20 blur-3xl opacity-50" />

        <div className="relative z-10 container px-4 max-w-4xl space-y-8">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-primary leading-[1.1]">
            {tHero('title')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-action to-purple-600">
              {tHero('highlight') || "Simplement."}
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {tHero('subtitle')}
          </p>

          {/* Search Bar - Turo Style */}
          <SearchBar cities={cities} onSearch={handleSearch} />
        </div>
      </section>

      {/* Featured / Results Section */}
      <main className="container mx-auto px-4 py-16 flex-grow bg-white relative z-0 rounded-t-[3rem] shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)] -mt-10">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-2xl font-bold text-primary">{tHome('availableVehicles')}</h2>
            <p className="text-slate-500">Les meilleures voitures autour de vous</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 animate-pulse">
                {/* Image skeleton */}
                <div className="h-48 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] animate-shimmer"></div>
                {/* Content skeleton */}
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
                    <div className="h-6 w-24 bg-slate-100 rounded-full"></div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <div className="h-6 w-28 bg-slate-200 rounded"></div>
                    <div className="h-8 w-20 bg-primary/20 rounded-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : vehicles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.vehicleID}
                id={vehicle.vehicleID!}
                make={vehicle.make || ""}
                model={vehicle.model || ""}
                year={vehicle.year || 0}
                baseDailyRate={vehicle.baseDailyRate || 0}
                currencyCode={vehicle.currencyCode || "GNF"}
                isChauffeurAvailable={vehicle.isChauffeurAvailable || false}
                cityName={vehicle.cityName || ""}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-3xl border border-slate-100 shadow-sm">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-primary-action/20 blur-xl rounded-full"></div>
              <div className="relative text-6xl">🚗</div>
            </div>
            <h3 className="text-2xl font-bold text-primary mb-3">{tHome('noVehiclesTitle')}</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">{tHome('noVehiclesDesc')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button className="rounded-full px-8 bg-primary-action hover:bg-primary-action/90 text-white shadow-lg">
                  {tHome('addVehicleButton')}
                </Button>
              </Link>
              <Button
                variant="outline"
                className="rounded-full px-8"
                onClick={() => window.location.reload()}
              >
                🔄 Rafraîchir
              </Button>
            </div>
          </div>
        )}

        {/* Bento Grid Features (Only show if no search results or at bottom) */}
        {!searchFilters.cityId && vehicles.length < 5 && (
          <div className="mt-32">
            <h2 className="text-3xl font-bold text-primary text-center mb-14">Pourquoi G-MoP ?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 rounded-3xl bg-indigo-50/50 border border-indigo-100 hover:border-indigo-200 transition-colors">
                <div className="h-14 w-14 rounded-2xl bg-white text-indigo-600 flex items-center justify-center mb-6 shadow-sm text-2xl">🛡️</div>
                <h3 className="text-xl font-bold text-primary mb-3">Assurance Incluse</h3>
                <p className="text-slate-600 leading-relaxed">Voyagez l'esprit tranquille. Chaque location est couverte par notre partenaire.</p>
              </div>
              <div className="p-8 rounded-3xl bg-purple-50/50 border border-purple-100 hover:border-purple-200 transition-colors">
                <div className="h-14 w-14 rounded-2xl bg-white text-purple-600 flex items-center justify-center mb-6 shadow-sm text-2xl">📱</div>
                <h3 className="text-xl font-bold text-primary mb-3">100% Digital</h3>
                <p className="text-slate-600 leading-relaxed">Réservez, payez et déverrouillez. Tout se fait depuis votre smartphone.</p>
              </div>
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="h-14 w-14 rounded-2xl bg-white text-slate-700 flex items-center justify-center mb-6 shadow-sm text-2xl">🤝</div>
                <h3 className="text-xl font-bold text-primary mb-3">Confiance</h3>
                <p className="text-slate-600 leading-relaxed">Une communauté vérifiée de propriétaires et de locataires passionnés en Guinée.</p>
              </div>
            </div>
          </div>
        )}

      </main>

      <footer className="bg-primary text-slate-300 py-12 border-t border-indigo-900/50 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm">
          <p className="font-medium text-white mb-2">G-MoP</p>
          <p>&copy; {new Date().getFullYear()} Guinea Mobility Platform. Conçu à Conakry.</p>
        </div>
      </footer>
    </div>
  );
}
