import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-3xl font-bold leading-6 text-gray-900 mb-2">Privacy Policy</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Last updated: December 26, 2024</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">ResellSEO is committed to protecting your privacy. This policy explains how we collect and use your information.</p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. eBay Data</h2>
              <p className="text-gray-700 leading-relaxed">We access your eBay listings solely to optimize titles. We never store your eBay password.</p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Contact</h2>
              <p className="text-gray-700 leading-relaxed">For questions, contact us via our website.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
