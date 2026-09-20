'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  CalendarClock, 
  CalendarDays, 
  CircleDollarSign, 
  FileBarChart, 
  Settings, 
  LogOut,
  Fingerprint,
  Languages,
  X,
  MapPin,
  PackageCheck,
  Smartphone,
  Crown
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t, language, toggleLanguage } = useLanguage();
  const { currentUser, role, switchRole, logout } = useAuth();

  const navItems = [
    { name: t.navDashboard, href: '/dashboard', icon: LayoutDashboard },
    { name: t.navStaff, href: '/staff', icon: Users },
    { name: t.navAttendance, href: '/attendance', icon: Clock },
    { name: t.navShifts, href: '/shifts', icon: CalendarClock },
    { name: t.navLeaves, href: '/leaves', icon: CalendarDays },
    { name: t.navFieldDuty, href: '/field-duty', icon: MapPin },
    { name: t.navAssets, href: '/assets', icon: PackageCheck },
    { name: t.navPortal, href: '/portal', icon: Smartphone },
    { name: t.navPayroll, href: '/payroll', icon: CircleDollarSign },
    { name: t.navReports, href: '/reports', icon: FileBarChart },
    { name: t.navSettings, href: '/settings', icon: Settings },
  ];

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Dimmed Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed lg:static top-0 bottom-0 left-0 z-50
          w-72 sm:w-64 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col h-screen
          border-r border-slate-800 select-none transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header & Mobile Close Button */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <Link 
            href="/dashboard"
            onClick={handleNavClick}
            className="flex items-center gap-3 group cursor-pointer transition-transform active:scale-95"
            title="Go to Dashboard"
          >
            <img 
              src="/ap1-logo.png" 
              alt="AP1 Television" 
              className="h-10 w-auto shrink-0 object-contain drop-shadow group-hover:scale-105 transition-transform" 
              style={{ aspectRatio: '800/339' }} 
            />
            <div className="border-l border-slate-700/80 pl-2.5">
              <h1 className="font-bold text-white text-base tracking-tight leading-none group-hover:text-blue-300 transition-colors">
                AP1 Television
              </h1>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Corporate HRMS & Biometric
              </p>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button 
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Biometric Status Indicator */}
        <div className="px-3.5 py-2 mx-3 my-2 bg-slate-800/60 rounded-lg border border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-slate-300">ZKTeco LAN</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
            TCP 4370
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Role Switcher (Admin / HR / Employee) */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 px-1 font-semibold uppercase tracking-wider">
            <span>{t.colRole}</span>
            <span className="text-blue-400 capitalize">{role}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-medium">
            <button
              onClick={() => switchRole('admin')}
              className={`py-1 rounded text-center transition-colors cursor-pointer ${
                role === 'admin' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => switchRole('hr')}
              className={`py-1 rounded text-center transition-colors cursor-pointer ${
                role === 'hr' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              HR
            </button>
            <button
              onClick={() => switchRole('employee')}
              className={`py-1 rounded text-center transition-colors cursor-pointer ${
                role === 'employee' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Staff
            </button>
          </div>
        </div>

        {/* Bottom Profile Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
          {/* User Card */}
          {currentUser && (
            <div className="flex items-center justify-between pt-1 gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {currentUser.photo_url && !currentUser.photo_url.includes('unsplash') ? (
                  <img
                    src={currentUser.photo_url}
                    alt={currentUser.full_name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center border shrink-0 ${
                    currentUser.is_master_admin 
                      ? 'bg-gradient-to-tr from-amber-500 to-purple-600 text-white border-amber-400/50' 
                      : 'bg-gradient-to-tr from-purple-700 to-indigo-600 text-white border-purple-400/30'
                  }`}>
                    {currentUser.is_master_admin ? <Crown className="w-4 h-4 text-amber-200" /> : currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate leading-snug">
                      {currentUser.full_name}
                    </p>
                    {currentUser.is_master_admin && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black uppercase tracking-wider shrink-0 border border-amber-400/30">
                        Master
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {currentUser.designation}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign Out / Logout (लगआउट गर्नुहोस्)"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-900/50 shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
