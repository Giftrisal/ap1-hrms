'use client';

import React from 'react';
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
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Dark Sidebar */}
      <Sidebar />

      {/* Main White Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header 
          title={title} 
          subtitle={subtitle} 
          onSyncTriggered={onSyncTriggered} 
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
