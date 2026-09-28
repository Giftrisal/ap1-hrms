'use client';

import React from 'react';
import Link from 'next/link';
import LicenseGeneratorModal from '@/components/license/LicenseGeneratorModal';
import { ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';

export default function GoinfiLabsLicensePortal() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full relative z-10 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-400 tracking-wider uppercase">Goinfi Labs</span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400">Vendor Management Console</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Enterprise License Key Authority</span>
                <Sparkles className="w-5 h-5 text-purple-400" />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cryptographic HMAC-SHA256</span>
          </div>
        </div>

        {/* Notice Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 leading-relaxed">
          <p>
            <strong className="text-slate-200">गोपनीय भेन्डर कन्सोल:</strong> यो पृष्ठ Goinfi Labs प्राविधिक टोलीको लागि मात्र हो। यहाँबाट <strong>AP1 Television Network</strong> वा अन्य क्लाइन्टहरूका लागि आधिकारिक १ दिन, १ महिना, १ वर्ष, २ वर्ष वा ५ वर्षे डिजिटल लाइसेन्स की उत्पादन गर्न सकिन्छ।
          </p>
        </div>

        {/* The Generator Modal Component */}
        <LicenseGeneratorModal />
      </div>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full pt-8 text-center text-xs text-slate-500 relative z-10">
        <p>Goinfi Labs Pvt. Ltd. • Cloud HRMS & Biometrics Engineering Authority</p>
      </footer>
    </div>
  );
}
