'use client';

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Wifi, 
  Send, 
  Bell, 
  Clock, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onSyncTriggered?: () => void;
}

export default function Header({ title, subtitle, onSyncTriggered }: HeaderProps) {
  const { t } = useLanguage();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [lastSyncText, setLastSyncText] = useState('Just now');

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
      // Trigger sync via internal API
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
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-20 shadow-xs">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      {/* Right Actions & Biometric Status */}
      <div className="flex items-center flex-wrap gap-3">
        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime || '09:00:00 AM'} (NPT)</span>
        </div>

        {/* ZKTeco Machine Status Card */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs">
          <Wifi className="w-4 h-4 text-emerald-600 animate-pulse" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-emerald-900">ZKTeco K40 (192.168.1.201)</span>
              <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            </div>
            <span className="text-[10px] text-emerald-700 font-medium">
              {t.lastSynced}: {lastSyncText}
            </span>
          </div>
        </div>

        {/* Sync Now Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-xs ${
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

        {/* WhatsApp Digest Action */}
        <button
          onClick={handleSendTestWhatsApp}
          title="Send Daily 10 AM WhatsApp Digest to Admin"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 border border-emerald-200 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">WhatsApp Digest</span>
        </button>
      </div>
    </header>
  );
}
