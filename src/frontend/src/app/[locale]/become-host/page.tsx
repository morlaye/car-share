"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

export default function BecomeHostPage() {
    const t = useTranslations('BecomeHost');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Check auth status
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token && !isLoggedIn) setIsLoggedIn(true);
    }

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section className="relative py-20 lg:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-6xl font-bold text-primary leading-tight mb-6">
                            Faites travailler votre voiture pendant que{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-action to-purple-600">
                                vous vous reposez.
                            </span>
                        </h1>
                        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                            Partagez votre voiture quand vous ne l'utilisez pas et gagnez en moyenne{" "}
                            <span className="font-bold text-primary-action">10 000 000 GNF par mois</span>{" "}
                            grâce à G-MoP, la première plateforme d'autopartage en Guinée.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                            <Link href={isLoggedIn ? "/vehicles/new" : "/register"}>
                                <Button size="lg" className="bg-primary-action hover:bg-primary-action/90 text-white rounded-full px-10 text-lg shadow-lg shadow-primary-action/30">
                                    Commencer maintenant
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="rounded-full px-10 text-lg" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                                Comment ça marche
                            </Button>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex flex-wrap justify-center gap-8 items-center opacity-60">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🛡️</span>
                                <span className="text-sm font-medium text-slate-600">Assurance incluse</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">✅</span>
                                <span className="text-sm font-medium text-slate-600">Locataires vérifiés</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">💳</span>
                                <span className="text-sm font-medium text-slate-600">Paiement sécurisé</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hero Image */}
                <div className="mt-16 container mx-auto px-4">
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl max-w-5xl mx-auto">
                        <img
                            src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&h=600&fit=crop"
                            alt="Propriétaire heureux avec sa voiture"
                            className="w-full h-[400px] object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 right-6 text-white">
                            <p className="text-lg font-medium">"Ma Toyota RAV4 me rapporte plus de 600 000 GNF par mois!"</p>
                            <p className="text-sm opacity-80">— Mamadou B., Conakry</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-24 bg-white">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-primary mb-16">
                        Fonctionnement
                    </h2>

                    <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
                        {/* Steps */}
                        <div className="space-y-10">
                            {[
                                {
                                    num: "1",
                                    title: "Inscrivez votre voiture gratuitement",
                                    desc: "Vous pouvez partager pratiquement n'importe quel véhicule, qu'il s'agisse d'une berline ou d'un 4x4. L'inscription ne prend que quelques minutes et ne vous coûte rien."
                                },
                                {
                                    num: "2",
                                    title: "Fixez votre prix et vos règles",
                                    desc: "Établissez vos propres règles et modifiez votre calendrier en fonction de vos disponibilités. Fixez votre propre prix par jour selon le marché guinéen."
                                },
                                {
                                    num: "3",
                                    title: "Accueillez les voyageurs",
                                    desc: "Lorsqu'un voyageur réserve votre voiture, confirmez avec lui les détails relatifs à la prise en charge du véhicule. C'est simple et rapide!"
                                },
                                {
                                    num: "4",
                                    title: "Gagnez de l'argent facilement",
                                    desc: "Recevez vos revenus après chaque location. Vous obtenez 80% du prix du voyage. Une façon simple d'arrondir vos fins de mois."
                                }
                            ].map((step, i) => (
                                <div key={i} className="flex gap-6">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-primary-action text-primary-action flex items-center justify-center font-bold text-lg">
                                        {step.num}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-primary mb-2">{step.title}</h3>
                                        <p className="text-slate-600 leading-relaxed">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Image */}
                        <div className="relative">
                            <img
                                src="https://images.unsplash.com/photo-1560472355-536de3962603?w=600&h=800&fit=crop"
                                alt="Remise des clés"
                                className="rounded-3xl shadow-xl w-full object-cover h-[500px]"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust & Insurance Section */}
            <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
                        {/* Image */}
                        <div className="order-2 lg:order-1">
                            <img
                                src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=500&fit=crop"
                                alt="Voyage en voiture"
                                className="rounded-3xl shadow-xl w-full object-cover h-[400px]"
                            />
                        </div>

                        {/* Content */}
                        <div className="order-1 lg:order-2">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-action/10 rounded-2xl mb-6">
                                <span className="text-3xl">🛡️</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
                                Louez en toute assurance
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-primary mb-2">Assurance responsabilité civile</h3>
                                    <p className="text-slate-600">
                                        Notre protection standard inclut une assurance responsabilité civile fournie par nos partenaires locaux en Guinée.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-primary mb-2">Protection contre les dommages</h3>
                                    <p className="text-slate-600">
                                        Partagez votre voiture en toute confiance et recevez 80% du prix du voyage. Votre voiture est protégée par contrat contre les dommages matériels.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Grid */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-primary mb-16">
                        Nous sommes là pour vous
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            {
                                icon: "🌍",
                                title: "Communauté fiable",
                                desc: "Grâce au processus de vérification des voyageurs de G-MoP, vous savez que votre voiture se trouve entre bonnes mains."
                            },
                            {
                                icon: "📞",
                                title: "Support disponible",
                                desc: "Vous pouvez contacter notre Service à la clientèle par téléphone ou WhatsApp. Nous sommes là pour vous aider."
                            },
                            {
                                icon: "⭐",
                                title: "Commentaires et évaluations",
                                desc: "Les hôtes et les voyageurs s'évaluent après chaque voyage. Consultez les avis avant de partager votre voiture."
                            }
                        ].map((benefit, i) => (
                            <div key={i} className="text-center p-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-6 text-3xl">
                                    {benefit.icon}
                                </div>
                                <h3 className="text-xl font-bold text-primary mb-3">{benefit.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{benefit.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <Link href={isLoggedIn ? "/vehicles/new" : "/register"}>
                            <Button size="lg" className="bg-primary-action hover:bg-primary-action/90 text-white rounded-full px-10 text-lg">
                                Inscrire votre voiture
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-24 bg-slate-50">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-primary mb-16">
                        Ce que les hôtes en disent
                    </h2>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {[
                            {
                                quote: "Le partage de ma voiture me rapporte environ 500 000 GNF par jour, ce qui équivaut à un excellent complément de revenus. Ce revenu m'a été très utile pour payer mes factures.",
                                name: "Ibrahima S.",
                                location: "Conakry, Kaloum"
                            },
                            {
                                quote: "J'ai acheté ma Toyota Fortuner et je l'ai inscrite sur G-MoP. Depuis, les réservations vont bon train et le revenu que j'en tire couvre les mensualités et l'assurance.",
                                name: "Fatoumata D.",
                                location: "Conakry, Ratoma"
                            }
                        ].map((testimonial, i) => (
                            <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                                <div className="text-4xl text-primary-action mb-4">"</div>
                                <p className="text-slate-700 mb-6 leading-relaxed italic">
                                    {testimonial.quote}
                                </p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary-action to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                        {testimonial.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-primary">{testimonial.name}</p>
                                        <p className="text-sm text-slate-500">{testimonial.location}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 bg-primary">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Inscrivez votre voiture dès aujourd'hui
                    </h2>
                    <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                        Faites comme des centaines de propriétaires G-MoP et commencez à gagner de l'argent dès demain.
                    </p>
                    <Link href={isLoggedIn ? "/vehicles/new" : "/register"}>
                        <Button size="lg" className="bg-white hover:bg-slate-100 text-primary rounded-full px-12 text-lg font-bold">
                            Commencer
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}
