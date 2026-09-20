'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '@/lib/auth/auth-context';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
