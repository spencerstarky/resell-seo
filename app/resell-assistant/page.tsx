import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Resell Assistant | Chrome Extension for eBay Sellers',
    description: 'The ultimate Chrome Extension for eBay sellers to streamline product research, market analytics, and AI-optimized listing titles directly from the listing page.',
};

export default function ResellAssistantPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-brand-500 selection:text-white pb-32">
            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                ResellSEO
                            </span>
                        </div>
                        <Link
                            href="/"
                            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            Back to Main App
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
                {/* Background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-indigo-500/20 blur-[100px] rounded-full point-events-none opacity-50" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Private Beta
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
                        The Ultimate <br className="hidden md:block" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                            eBay Listing Assistant
                        </span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 leading-relaxed">
                        A powerful Chrome extension designed exclusively for eBay sellers. Analyze photos, check live comparables, and generate AI-optimized titles directly from your listing workflow.
                    </p>

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button disabled className="px-8 py-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 font-semibold text-white shadow-lg shadow-indigo-500/25 opacity-70 cursor-not-allowed">
                            Add to Chrome (Restricted Access)
                        </button>
                        <p className="text-sm text-slate-500 sm:hidden">Currently in closed beta for select sellers.</p>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-slate-900/50 border-y border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need, right where you list.</h2>
                        <p className="text-slate-400">Resell Assistant lives directly on the eBay listing page as a convenient sidebar, so you never have to break your workflow or switch tabs to check market prices.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            title="Instant Item Recognition"
                            description="Drop your product photos into the sidebar. Our AI instantly identifies the brand, model, and style details directly from your images."
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            }
                        />
                        <FeatureCard
                            title="Real-Time Active & Sold Comps"
                            description="Pull live market data straight from eBay. See exactly what your item is currently selling for and check recent completed sales to price aggressively."
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            }
                        />
                        <FeatureCard
                            title="SEO SEO-Optimized Titles"
                            description="Automatically generate the perfect 80-character eBay listing title using current high-volume search keywords derived directly from sold listings."
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            }
                        />
                    </div>
                </div>
            </section>

            {/* Tech Stack & Compliance */}
            <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 space-y-6">
                        <h2 className="text-2xl font-bold">Built for scale. Built securely.</h2>
                        <p className="text-slate-400 leading-relaxed">
                            This extension utilizes the official <strong>eBay Developer API</strong> to assist sellers without scraping or violating terms of service. It integrates natively into the eBay seller hub, providing a fast, secure, and compliant way to do market research.
                        </p>
                        <ul className="space-y-3 text-sm text-slate-300">
                            <li className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Strictly uses authorized OAuth tokens and API requests.
                            </li>
                            <li className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Zero user data sold or exposed to third parties.
                            </li>
                            <li className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Compliant with eBay Marketplace Account Deletion rules.
                            </li>
                        </ul>
                    </div>
                    <div className="w-full max-w-sm rounded-2xl bg-slate-950 border border-slate-800 p-6 shadow-2xl">
                        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-800">
                            <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center">
                                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <div className="text-left">
                                <h3 className="font-semibold text-white">Private Application</h3>
                                <p className="text-xs text-slate-400">Not for public download</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed text-left">
                            This extension is maintained for specialized resale research and is not currently accepting new users. For inquiries, please contact the developer via the ResellSEO portal.
                        </p>
                    </div>
                </div>
            </section>

        </div>
    );
}

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) {
    return (
        <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition-colors shadow-lg shadow-black/50">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-3">{title}</h3>
            <p className="text-slate-400 leading-relaxed">{description}</p>
        </div>
    );
}
