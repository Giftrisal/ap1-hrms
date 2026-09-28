'use client';

import React, { useState } from 'react';
import { LICENSE_TIERS, LicenseTier } from '@/lib/license/license-manager';
import { useLicense } from '@/lib/license/use-license';
import { 
  KeyRound, 
  Crown, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  Calendar, 
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function LicenseGeneratorModal() {
  const { activate } = useLicense();
  const [clientCode, setClientCode] = useState('AP1');
  const [clientName, setClientName] = useState('AP1 Television Network');
  const [selectedTier, setSelectedTier] = useState<LicenseTier>('1_YEAR');
  const [adminPin, setAdminPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedResult, setGeneratedResult] = useState<{
    key: string;
    payload: any;
    tierInfo: any;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [appliedNotice, setAppliedNotice] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPin.trim()) {
      setError('कृपया Master Admin PIN (999) प्रविष्ट गर्नुहोस्।');
      return;
    }

    setLoading(true);
    setError('');
    setAppliedNotice('');

    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          clientCode,
          clientName,
          tier: selectedTier,
          adminPin
        })
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'लाइसेन्स की बनाउन सकिएन।');
      } else {
        setGeneratedResult({
          key: data.key,
          payload: data.payload,
          tierInfo: data.tierInfo
        });
      }
    } catch (err: any) {
      setError(err.message || 'नेटवर्क त्रुटि');
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    if (generatedResult?.key) {
      navigator.clipboard.writeText(generatedResult.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const applyNow = async () => {
    if (generatedResult?.key) {
      const res = await activate(generatedResult.key);
      if (res.success) {
        setAppliedNotice('यो प्रणालीमा नयाँ लाइसेन्स तुरुन्त सक्रिय गरियो!');
      } else {
        setError(res.error || 'सक्रिय गर्न सकिएन');
      }
    }
  };

  return (
    <div className="bg-slate-900/90 border border-purple-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md mt-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Crown className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>Master Admin: लाइसेन्स जेनेरेटर (License Generator Tool)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
              Vendor Only (PIN: 999)
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Goinfi Technologies बाट AP1 वा अन्य ग्राहकहरूको लागि नयाँ आधिकारिक डिजिटल लाइसेन्स की उत्पादन गर्नुहोस्।
          </p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="mt-5 space-y-4">
        {/* Tier selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            लाइसेन्स अवधि छान्नुहोस् (Select Duration Tier):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
            {(Object.keys(LICENSE_TIERS) as LicenseTier[]).map((tierKey) => {
              const info = LICENSE_TIERS[tierKey];
              const isSelected = selectedTier === tierKey;
              return (
                <button
                  type="button"
                  key={tierKey}
                  onClick={() => setSelectedTier(tierKey)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/20 ring-1 ring-purple-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                      {info.code}
                    </span>
                    <Clock className="w-3.5 h-3.5 opacity-60" />
                  </div>
                  <div className="text-xs font-bold text-white">{info.labelNp}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{info.days} दिन ({info.label})</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Client details & PIN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              क्लाइन्ट कोड (Client Code):
            </label>
            <input
              type="text"
              value={clientCode}
              onChange={(e) => setClientCode(e.target.value.toUpperCase().slice(0, 5))}
              placeholder="AP1"
              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              क्लाइन्ट नाम (Client Name):
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="AP1 Television Network"
              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Master Admin PIN (आवश्यक):
            </label>
            <input
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="999"
              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/20"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>नयाँ लाइसेन्स की बनाउनुहोस् (Generate License Key)</span>
        </button>
      </form>

      {/* Generated Result Box */}
      {generatedResult && (
        <div className="mt-5 p-4 bg-slate-950/90 border border-emerald-500/30 rounded-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>प्रमाणीकृत नयाँ लाइसेन्स की (Generated & Signed):</span>
            </div>
            <span className="text-[11px] text-slate-400">
              अवधि: <strong className="text-white">{generatedResult.tierInfo.labelNp}</strong> ({generatedResult.tierInfo.days} दिन)
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-3">
            <span className="font-mono text-sm font-bold text-emerald-300 tracking-wider flex-1 select-all break-all">
              {generatedResult.key}
            </span>
            <button
              type="button"
              onClick={copyKey}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'कपी गरियो' : 'Copy Key'}</span>
            </button>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 text-xs text-slate-400">
            <span>Client: <strong className="text-slate-200">{generatedResult.payload.clientName}</strong></span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={applyNow}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg"
              >
                <span>यसै सिस्टममा तुरुन्त लागु गर्नुहोस्</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {appliedNotice && (
            <div className="mt-3 p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{appliedNotice}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
