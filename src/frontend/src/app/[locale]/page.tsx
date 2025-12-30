"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { VehicleCard } from "@/components/vehicle-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "sonner";
import { components } from "@/lib/schema";
import { useTranslations } from 'next-intl';

// Use generated type from Contract
type VehicleSearchResult = components["schemas"]["VehicleSearchResult"];

export default function Home() {
  const tNav = useTranslations('Navigation');
  const tHero = useTranslations('Hero');
  const tHome = useTranslations('Home');

  const [vehicles, setVehicles] = useState<VehicleSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  // Check auth + Fetch vehicles on mount
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
    fetchVehicles();
  }, []);

  async function fetchVehicles(query?: string) {
    setIsLoading(true);
    try {
      // Build query string
      const url = query ? `/api/vehicles?query=${encodeURIComponent(query)}` : "/api/vehicles";
      const res = await api.get<VehicleSearchResult[]>(url);
      setVehicles(res.data);
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVehicles(searchQuery);
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
                <Link href="/dashboard" className="text-sm text-slate-600 hidden md:block hover:text-primary">
                  👋 {userName || "User"}
                </Link>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-slate-600 hover:text-primary">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/vehicles/new">
                  <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 shadow-md hover:shadow-lg transition-all">
                    {tNav('listCar')}
                  </Button>
                </Link>
                <Button variant="ghost" onClick={handleLogout} className="text-slate-600 hover:text-red-600">
                  Déconnexion
                </Button>
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
      <section className="relative flex flex-col items-center justify-center pt-24 pb-32 text-center bg-gradient-to-b from-indigo-50/50 to-white overflow-hidden">
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

          {/* Search Bar - Floating Island */}
          <form onSubmit={handleSearch} className="group glass max-w-2xl w-full mx-auto rounded-full p-2 flex items-center shadow-xl transform transition-all hover:scale-[1.01] hover:shadow-2xl border border-white/40">
            <div className="flex-1 px-6 border-r border-gray-200 py-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{tHero('where') || "LOCATION"}</label>
              <Input
                type="text"
                placeholder="Conakry, Guinée"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none p-0 h-auto text-lg text-gray-900 placeholder-gray-400 focus-visible:ring-0"
              />
            </div>
            <div className="pl-4 pr-1">
              <Button size="icon" type="submit" className="h-12 w-12 rounded-full bg-primary-action hover:bg-primary-action/90 text-white shadow-lg flex items-center justify-center transition-transform group-hover:rotate-12">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Featured / Results Section */}
      <main className="container mx-auto px-4 py-16 flex-grow bg-white relative z-20 rounded-t-[3rem] shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)] -mt-10">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-2xl font-bold text-primary">{tHome('availableVehicles')}</h2>
            <p className="text-slate-500">Les meilleures voitures autour de vous</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[350px] bg-slate-100 rounded-xl animate-pulse"></div>
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
          <div className="text-center py-24 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="text-4xl mb-4">🚗</div>
            <h3 className="text-xl font-bold text-primary">{tHome('noVehiclesTitle')}</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">{tHome('noVehiclesDesc')}</p>
            <Link href="/register" className="mt-6 inline-block">
              <Button className="rounded-full px-8 bg-primary text-white">{tHome('addVehicleButton')}</Button>
            </Link>
          </div>
        )}

        {/* Bento Grid Features (Only show if no search results or at bottom) */}
        {!searchQuery && vehicles.length < 5 && (
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
