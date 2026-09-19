'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  RefreshCw, 
  Wifi, 
  Send, 
  Clock, 
  CheckCircle2,
  Menu,
  Fingerprint,
  Calendar
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { getNepaliDate } from '@/lib/nepali-date';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onSyncTriggered?: () => void;
  onToggleMobileMenu?: () => void;
}

export default function Header({ 
  title, 
  subtitle, 
  onSyncTriggered,
  onToggleMobileMenu 
}: HeaderProps) {
  const { t } = useLanguage();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [lastSyncText, setLastSyncText] = useState('Just now');
  const [isWhatsAppDigestOn, setIsWhatsAppDigestOn] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_whatsapp_digest_enabled');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  const handleToggleWhatsAppDigest = () => {
    const nextState = !isWhatsAppDigestOn;
    setIsWhatsAppDigestOn(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_whatsapp_digest_enabled', String(nextState));
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncSuccess(false);
    try {
      const res = await fetch('/api/biometric/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: [
            {
              biometric_pin: '101',
              punch_time: new Date().toISOString(),
              punch_type: 0,
              verify_type: 1
            }
          ],
          device_ip: '192.168.1.201'
        })
      });
      if (res.ok) {
        setSyncSuccess(true);
        setLastSyncText('Just now');
        if (onSyncTriggered) onSyncTriggered();
        setTimeout(() => setSyncSuccess(false), 3500);
      }
    } catch (e) {
      console.error('Failed to trigger sync', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'absent_digest',
          payload: {
            date: new Date().toISOString().split('T')[0],
            absentStaff: ['Puja Bhandari', 'Roshan Ghimire'],
            lateStaff: ['Rajeev Khadka (25m)', 'Alina Baral (32m)']
          }
        })
      });
      const data = await res.json();
      if (data.detail?.link) {
        window.open(data.detail.link, '_blank');
      } else {
        alert('WhatsApp alert sent successfully via Meta Cloud API!');
      }
    } catch (e) {
      alert('Could not trigger WhatsApp: ' + e);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sticky top-0 z-20 shadow-xs">
      {/* Top Left: Hamburger Button + Title */}
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="flex items-center gap-2.5">
          {/* Mobile Hamburger Button */}
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 -ml-1 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile AP1 Logo */}
          <Link href="/dashboard" className="lg:hidden shrink-0 cursor-pointer active:scale-95 transition-transform" title="Go to Dashboard">
            <img 
              src="/ap1-logo.png" 
              alt="AP1 Television" 
              className="h-8 sm:h-9 w-auto shrink-0 object-contain drop-shadow" 
              style={{ aspectRatio: '800/339' }} 
            />
          </Link>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">{title}</h2>
            {subtitle && <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1">{subtitle}</p>}
          </div>
        </div>

        {/* Mobile Quick Sync Icon button */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`p-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              syncSuccess ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
            }`}
            title="Sync Biometric Machine"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Right Actions & Biometric Status (Desktop / Tablet) */}
      <div className="hidden md:flex items-center flex-wrap gap-2.5">
        {/* Bikram Sambat Dual Date */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/80 rounded-lg border border-blue-200/80 text-xs font-semibold text-blue-900 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>{getNepaliDate().formattedEn}</span>
          <span className="text-blue-400">|</span>
          <span className="text-[11px] text-blue-700 font-normal">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Live Clock */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime || '09:00:00 AM'} (NPT)</span>
        </div>

        {/* Machine Status Card */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs text-emerald-900 font-semibold">
            Last Synced: {lastSyncText}
          </span>
        </div>

        {/* Sync Now Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer ${
            syncSuccess 
              ? 'bg-emerald-600 text-white' 
              : 'bg-slate-900 hover:bg-slate-800 text-white'
          }`}
        >
          {syncSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Synced!</span>
            </>
          ) : (
            <>
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? t.syncing : t.syncNow}</span>
            </>
          )}
        </button>

        {/* WhatsApp Digest ON/OFF Toggle Switch */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
          <button
            type="button"
            onClick={handleToggleWhatsAppDigest}
            title={`Click to turn automated WhatsApp Digest ${isWhatsAppDigestOn ? 'OFF' : 'ON'}`}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              isWhatsAppDigestOn
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isWhatsAppDigestOn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>WhatsApp Digest:</span>
            <span className={`font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded ${
              isWhatsAppDigestOn ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
            }`}>
              {isWhatsAppDigestOn ? 'ON' : 'OFF'}
            </span>
          </button>

          {isWhatsAppDigestOn && (
            <button
              type="button"
              onClick={handleSendTestWhatsApp}
              title="Send WhatsApp Digest Test to Admin"
              className="p-1.5 text-emerald-700 hover:bg-emerald-100/70 rounded-md transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
