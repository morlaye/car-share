"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useTranslations } from 'next-intl';

export function Header() {
    const tNav = useTranslations('Navigation');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            setIsLoggedIn(true);
            api.get("/api/auth/me")
                .then(res => {
                    setUserName(res.data.fullName || res.data.email);
                })
                .catch(() => {
                    localStorage.removeItem("token");
                    setIsLoggedIn(false);
                });
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        setUserName(null);
        window.location.reload();
    };

    return (
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
                            <Link href="/become-host" className="hidden md:block">
                                <Button variant="outline" className="rounded-full px-5 border-primary-action text-primary-action hover:bg-primary-action/5">
                                    Devenez hôte
                                </Button>
                            </Link>
                            <Link href="/login">
                                <Button variant="ghost" className="text-slate-600 hover:text-primary hover:bg-slate-100">{tNav('login')}</Button>
                            </Link>
                            <Link href="/register">
                                <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 shadow-md hover:shadow-lg transition-all">S'inscrire</Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
