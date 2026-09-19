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
  Smartphone
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Fingerprint className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg tracking-tight leading-none">
                {t.appName}
              </h1>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {t.appSubTitle}
              </p>
            </div>
          </div>

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

        {/* Bottom Profile & Language Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-200 transition-colors border border-slate-700/60 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Languages className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === 'en' ? 'English (EN)' : 'नेपाली (NE)'}</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/40">
              {language === 'en' ? 'Switch' : 'फेर्नुहोस्'}
            </span>
          </button>

          {/* User Card */}
          {currentUser && (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <img
                  src={currentUser.photo_url || "https://images.unsplash.com/photo-1534528741775?w=150"}
                  alt={currentUser.full_name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-700"
                />
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate leading-snug">
                    {currentUser.full_name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {currentUser.designation}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                title={t.logout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
