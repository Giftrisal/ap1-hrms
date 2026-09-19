'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
