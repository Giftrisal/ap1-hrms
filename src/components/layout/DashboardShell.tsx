'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '@/lib/auth/auth-context';
import { useLicense } from '@/lib/license/use-license';
import LicenseExpiredGuard from '@/components/license/LicenseExpiredGuard';
import Link from 'next/link';
import { AlertTriangle, KeyRound, Eye } from 'lucide-react';

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSyncTriggered?: () => void;
}

export default function DashboardShell({
  title,
  subtitle,
  children,
  onSyncTriggered
}: DashboardShellProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { isExpiringSoon, daysRemaining } = useLicense();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showExpiredDemo, setShowExpiredDemo] = useState(false);

  // Enforce authentication guard across all admin dashboard routes
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Loading screen while checking authentication session
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <img 
            src="/ap1-logo.png" 
            alt="AP1 Television" 
            className="h-14 sm:h-16 w-auto object-contain drop-shadow mb-1 animate-pulse" 
            style={{ aspectRatio: '800/339' }} 
          />
          <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-300 tracking-wide">
            Verifying AP1 Television Security Session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <LicenseExpiredGuard forceDemo={showExpiredDemo} onCloseDemo={() => setShowExpiredDemo(false)}>
      <div className="flex h-screen overflow-hidden bg-slate-100">
        {/* Sidebar (Responsive: Permanent on desktop, Slide-over Drawer on mobile) */}
        <Sidebar 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
        />

        {/* Main Content Area (Takes full 100% width on mobile) */}
        <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
          {/* Top Header with Hamburger Toggle for Mobile */}
          <Header 
            title={title} 
            subtitle={subtitle} 
            onSyncTriggered={onSyncTriggered}
            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />

          {/* Scrollable Page Body */}
          <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 bg-slate-50 flex flex-col justify-between">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 w-full flex-1">
              {/* License Expiring Warning Banner - Pure Red Theme */}
              {isExpiringSoon && (
                <div className="p-3.5 bg-red-600 border border-red-700 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white shadow-lg shadow-red-600/30 animate-pulse">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-white">
                    <AlertTriangle className="w-5 h-5 text-yellow-300 shrink-0" />
                    <span>
                      सूचना: AP1 Television HRMS सफ्टवेयर लाइसेन्सको म्याद <strong>आज साँझ ६:०० बजे</strong> समाप्त हुँदैछ।
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setShowExpiredDemo(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-800/90 hover:bg-red-900 text-white rounded-xl text-xs font-bold transition-all border border-red-400/40 cursor-pointer shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-yellow-300" />
                      <span>डेमो हेर्नुहोस् (Preview Lock)</span>
                    </button>
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-red-50 text-red-700 rounded-xl text-xs font-black transition-all shadow-md shrink-0"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-red-600" />
                      <span>लाइसेन्स नवीकरण गर्नुहोस्</span>
                    </Link>
                  </div>
                </div>
              )}

              {children}
            </div>

            {/* Global Enterprise Footer with Goinfi Promotion */}
            <footer className="max-w-7xl mx-auto w-full pt-8 pb-3 border-t border-slate-200 mt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">AP1 Television HRMS</span>
                <span>•</span>
                <span>Enterprise Biometric Network</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Engineered & Developed by</span>
                <a
                  href="https://www.goinfi.biz/labs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 transition-colors"
                >
                  Goinfi Labs
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 font-semibold">goinfi.biz/labs</span>
                </a>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </LicenseExpiredGuard>
  );
}
