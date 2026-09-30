'use client';

import React, { useState, useEffect } from 'react';
import { useLicense } from '@/lib/license/use-license';
import { ShieldAlert, KeyRound, CheckCircle2, AlertTriangle, Phone, Mail, X, Eye } from 'lucide-react';

interface LicenseExpiredGuardProps {
  children: React.ReactNode;
  forceDemo?: boolean;
  onCloseDemo?: () => void;
}

export default function LicenseExpiredGuard({ children, forceDemo = false, onCloseDemo }: LicenseExpiredGuardProps) {
  const { isExpired, loading, activate } = useLicense();
  const [key, setKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [urlDemo, setUrlDemo] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo_expired') === 'true') {
        setUrlDemo(true);
      }
    }
  }, []);

  const isDemo = forceDemo || urlDemo;

  if (loading && !isDemo) {
    return <>{children}</>;
  }

  if (!isExpired && !isDemo) {
    return <>{children}</>;
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      setMessage({ type: 'error', text: 'कृपया लाइसेन्स की प्रविष्ट गर्नुहोस्।' });
      return;
    }

    setActivating(true);
    setMessage(null);

    const res = await activate(key);
    setActivating(false);

    if (res.success) {
      setMessage({ type: 'success', text: 'लाइसेन्स सफलतापूर्वक नवीकरण भयो! पेज लोड हुँदैछ...' });
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('demo_expired');
          window.location.href = url.pathname;
        }
      }, 1500);
    } else {
      setMessage({ type: 'error', text: res.error || 'लाइसेन्स प्रमाणीकरण हुन सकेन।' });
    }
  };

  const handleCloseDemo = () => {
    setUrlDemo(false);
    if (onCloseDemo) {
      onCloseDemo();
    }
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('demo_expired');
      window.history.replaceState({}, '', url.pathname);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
      {/* Demo Banner */}
      {isDemo && (
        <div className="mb-4 max-w-md w-full bg-amber-500/20 border border-amber-500/40 rounded-2xl p-3 flex items-center justify-between gap-3 text-amber-200 text-xs">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>[डेमो मोड]</strong> ८:०० PM पछि लाइसेन्स समाप्त हुँदा देखिने स्क्रिन:
            </span>
          </div>
          <button
            type="button"
            onClick={handleCloseDemo}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>डेमो बन्द गर्नुहोस्</span>
          </button>
        </div>
      )}

      {/* Main Expired Lock Card */}
      <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-center relative">
        <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400 mb-4 animate-bounce">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <h2 className="text-xl font-black text-white tracking-tight">सफ्टवेयर लाइसेन्स समाप्त भएको छ</h2>
        <p className="text-xs text-red-400 font-semibold mt-1 uppercase tracking-wider">
          Software License Expired
        </p>

        <p className="text-xs text-slate-300 mt-3 leading-relaxed">
          AP1 Television HRMS को आधिकारिक सदस्यता म्याद सकिएको छ। सेवा सुचारु राख्न कृपया नयाँ लाइसेन्स की प्रविष्ट गर्नुहोस्।
        </p>

        <form onSubmit={handleActivate} className="mt-5 space-y-3 text-left">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              नयाँ लाइसेन्स की (Enter License Key):
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="GFHR-AP1-1Y-XXXX-XXXX-XXXX-XXXX"
              className="w-full font-mono text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-red-500 uppercase"
              disabled={activating}
            />
          </div>

          {message && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={activating}
            className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>{activating ? 'प्रमाणीकरण हुँदैछ...' : 'लाइसेन्स सक्रिय गर्नुहोस् (Activate)'}</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
          <p className="font-semibold text-slate-300">Technical Support & Renewal:</p>
          <div className="flex items-center justify-center gap-4 text-slate-400">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-red-400" /> +977-9715300300</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-red-400" /> support@goinfi.biz</span>
          </div>
          <p className="text-[10px] text-slate-500 pt-1">Goinfi Technologies Pvt. Ltd. • All Rights Reserved</p>
        </div>
      </div>
    </div>
  );
}
