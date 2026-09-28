'use client';

import React, { useState } from 'react';
import { useLicense } from '@/lib/license/use-license';
import { LICENSE_TIERS, LicenseTier } from '@/lib/license/license-manager';
import { 
  ShieldCheck, 
  KeyRound, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Copy, 
  Check, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export default function LicenseStatusCard() {
  const { license, isValid, isExpired, isExpiringSoon, daysRemaining, timeRemainingLabel, activate, reload } = useLicense();
  const [activationKey, setActivationKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showActivateBox, setShowActivateBox] = useState(false);
  const [copied, setCopied] = useState(false);
  const [alertPhone, setAlertPhone] = useState('9801239000');
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    fetch('/api/license')
      .then(res => res.json())
      .then(data => {
        if (data.alertPhone) {
          setAlertPhone(data.alertPhone);
        }
      })
      .catch(() => {});
  }, []);

  const handleSendTestSms = async () => {
    setIsSendingTestSms(true);
    setSmsFeedback(null);

    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_and_notify',
          isTest: true,
          alertPhone
        })
      });

      const data = await res.json();
      if (data.success && data.result?.dispatched) {
        setSmsFeedback({
          type: 'success',
          text: `लाइसेन्स म्याद सूचना SMS सफलतापूर्वक +977-${alertPhone} मा पठाइयो!`
        });
      } else {
        setSmsFeedback({
          type: 'error',
          text: data.result?.gatewayResult?.error || data.result?.reason || 'SMS पठाउन सकिएन।'
        });
      }
    } catch (err: any) {
      setSmsFeedback({
        type: 'error',
        text: err.message || 'नेटवर्क त्रुटि'
      });
    } finally {
      setIsSendingTestSms(false);
      setTimeout(() => setSmsFeedback(null), 7000);
    }
  };

  const tierInfo = license?.tier ? LICENSE_TIERS[license.tier as LicenseTier] : null;

  const handleActivate = async () => {
    if (!activationKey.trim()) {
      setMessage({ type: 'error', text: 'कृपया लाइसेन्स की प्रविष्ट गर्नुहोस्।' });
      return;
    }

    setIsActivating(true);
    setMessage(null);

    const res = await activate(activationKey.trim().toUpperCase());
    setIsActivating(false);

    if (res.success) {
      setMessage({ type: 'success', text: res.message || 'लाइसेन्स सफलतापूर्वक सक्रिय भयो!' });
      setActivationKey('');
      reload();
      setTimeout(() => {
        setShowActivateBox(false);
        setMessage(null);
      }, 2500);
    } else {
      setMessage({ type: 'error', text: res.error || 'लाइसेन्स प्रमाणीकरण हुन सकेन।' });
    }
  };

  const copyKey = () => {
    if (license?.key) {
      navigator.clipboard.writeText(license.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (ms?: number) => {
    if (!ms) return 'N/A';
    return new Date(ms).toLocaleDateString('ne-NP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) + ` (${new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Background ambient gradient */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isExpired ? 'bg-red-500/10 text-red-400 border border-red-500/20' : isExpiringSoon ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
            {isExpired ? <ShieldAlert className="w-6 h-6" /> : isExpiringSoon ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">सफ्टवेयर लाइसेन्स तथा सदस्यता (Software License)</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${isExpired ? 'bg-red-500/20 text-red-400 border border-red-500/30' : isExpiringSoon ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                {isExpired ? 'म्याद सकिएको (Expired)' : isExpiringSoon ? 'चाँडै सकिने (Expiring Soon)' : 'सक्रिय (Active)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Client: <strong className="text-slate-200">{license?.clientName || 'AP1 Television Network'}</strong> • Goinfi Labs Enterprise HRMS
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowActivateBox(!showActivateBox)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
        >
          <KeyRound className="w-4 h-4" />
          <span>{showActivateBox ? 'रद्द गर्नुहोस्' : 'लाइसेन्स नवीकरण / नयाँ Key हाल्नुहोस्'}</span>
        </button>
      </div>

      {/* Expiry / Warning Banner */}
      {isExpiringSoon && (
        <div className="mt-4 p-3.5 bg-red-600 border border-red-700 rounded-xl flex items-center gap-3 text-white text-xs font-semibold shadow-md">
          <AlertTriangle className="w-5 h-5 text-yellow-300 shrink-0 animate-bounce" />
          <div>
            <span className="font-bold">चेतावनी:</span> सफ्टवेयर लाइसेन्सको म्याद <strong>आज साँझ ६:०० बजे</strong> समाप्त हुँदैछ। सेवा अवरुद्ध हुन नदिन कृपया समयमै नवीकरण गर्नुहोस्।
          </div>
        </div>
      )}

      {isExpired && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-300 text-xs">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">लाइसेन्स समाप्त:</span> तपाईंको लाइसेन्सको म्याद सकिएको छ। नयाँ Key प्राप्त गर्न Goinfi Labs मा सम्पर्क गर्नुहोस्।
          </div>
        </div>
      )}

      {/* Grid of details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
        {/* Tier */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>लाइसेन्स योजना (Plan)</span>
          </div>
          <p className="text-sm font-bold text-white">
            {tierInfo?.labelNp || tierInfo?.label || '१ वर्ष वार्षिक लाइसेन्स'}
          </p>
          <span className="text-[11px] text-purple-400 font-medium">Enterprise Unlimited</span>
        </div>

        {/* Remaining Days */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>बाँकी समय (Time Remaining)</span>
          </div>
          <p className={`text-base font-black ${isExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-emerald-400'}`}>
            {timeRemainingLabel}
          </p>
          <span className="text-[11px] text-slate-500">२४/७ स्वतः गणना</span>
        </div>

        {/* Expiry Date */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>म्याद सकिने मिति (Expires On)</span>
          </div>
          <p className="text-xs font-semibold text-slate-200">
            {formatDate(license?.expiresAt)}
          </p>
        </div>

        {/* Active Key */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <div className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>सक्रिय Key</span>
            </div>
            <button
              type="button"
              onClick={copyKey}
              className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-[11px] font-mono text-slate-300 truncate select-all">
            {license?.key || 'GFHR-AP1-1Y-...'}
          </p>
          <span className="text-[10px] text-slate-500">HMAC-SHA256 सुरक्षित</span>
        </div>
      </div>

      {/* Activation Input Container (No nested form!) */}
      {showActivateBox && (
        <div className="mt-5 p-4 bg-slate-950/90 border border-purple-500/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            <span>नयाँ लाइसेन्स की हाल्नुहोस् (Enter License Key):</span>
          </h4>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleActivate();
                }
              }}
              placeholder="GFHR-AP1-1D-XXXX-XXXX-XXXX-XXXX"
              className="w-full font-mono text-xs px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 uppercase tracking-wider"
              disabled={isActivating}
            />
            <button
              type="button"
              onClick={handleActivate}
              disabled={isActivating}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shrink-0 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              {isActivating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{isActivating ? 'प्रमाणीकरण हुँदैछ...' : 'सक्रिय गर्नुहोस् (Activate)'}</span>
            </button>
          </div>

          {message && (
            <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-400 mt-2">
            नयाँ लाइसेन्स की का लागि <strong>Goinfi Labs</strong> (+977-9715100200 | support@goinfi.biz) मा सम्पर्क गर्नुहोस्।
          </p>
        </div>
      )}

      {/* Automated Expiry SMS Notification Monitor Box */}
      <div className="mt-5 pt-4 border-t border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                स्वतः म्याद पूर्व SMS सूचना (Automated Expiry SMS Notification)
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Active / दैनिक निगरानी
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              लाइसेन्स समाप्त हुनु अगाडि प्रणालीले स्वतः क्लाइन्टको दर्ता नम्बर (<strong>+977-{alertPhone}</strong>) मा SMS पठाउँछ।
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-slate-400">
              <span className="text-slate-500 font-semibold">सूचना तालिका:</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-amber-300 font-medium">⚠️ ७ दिन अगाडि</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-orange-300 font-medium">⏰ ३ दिन अगाडि</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-red-300 font-medium">🚨 २४ घण्टा अगाडि</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-purple-300 font-medium">🔒 म्याद सकिँदा</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSendTestSms}
              disabled={isSendingTestSms}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white disabled:opacity-50 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700 shadow-sm"
              title="क्लाइन्टको नम्बरमा तुरुन्त टेस्ट सूचना SMS पठाएर हेर्नुहोस्"
            >
              {isSendingTestSms ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
              <span>{isSendingTestSms ? 'SMS पठाउँदै...' : 'अलर्ट SMS परीक्षण (Test SMS)'}</span>
            </button>
          </div>
        </div>

        {smsFeedback && (
          <div className={`mt-2.5 p-2.5 rounded-lg text-xs flex items-center gap-2 ${smsFeedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
            {smsFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />}
            <span>{smsFeedback.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
