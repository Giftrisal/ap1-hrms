'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Crown, 
  UserCheck, 
  Users, 
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useLanguage } from '@/lib/i18n/context';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [identifier, setIdentifier] = useState('admin@ap1hdtv.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, direct straight to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('कृपया आफ्नो Admin Email, Username, वा Biometric PIN प्रविष्टि गर्नुहोस्');
      return;
    }

    if (!password) {
      setError('कृपया आफ्नो पासवर्ड (Password) प्रविष्टि गर्नुहोस्');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const success = login(identifier, password);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('गलत विवरण (Invalid credentials)। कृपया Email/Username र सुरक्षित पासवर्ड पुनः जाँच्नुहोस्।');
        setIsSubmitting(false);
      }
    }, 400);
  };

  const handleSelectAccount = (type: 'master' | 'gift' | 'hr') => {
    setError('');
    setPassword('');
    if (type === 'master') {
      setIdentifier('admin@ap1hdtv.com');
    } else if (type === 'gift') {
      setIdentifier('gift@ap1hdtv.com');
    } else if (type === 'hr') {
      setIdentifier('hr@ap1hdtv.com');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <img 
            src="/ap1-logo.png" 
            alt="AP1 Television" 
            className="h-14 sm:h-16 w-auto object-contain drop-shadow-2xl mb-3" 
            style={{ aspectRatio: '800/339' }} 
          />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800/50 text-purple-300 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>AP1 Administration Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            AP1 Television Network
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Biometric Attendance, Shifts & HR Management System
          </p>
        </div>

        {/* Error Notification Alert */}
        {error && (
          <div className="p-3.5 bg-red-950/70 border border-red-800/80 rounded-2xl text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">
              Email, Username or Biometric PIN
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@ap1hdtv.com or PIN"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="सुरक्षित पासवर्ड प्रविष्टि गर्नुहोस्"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-purple-500"
              />
              <span>Remember this station session</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Select Admin Accounts (NO Passwords Displayed) */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
            Select Station Role:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Master Admin */}
            <button
              type="button"
              onClick={() => handleSelectAccount('master')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                identifier === 'admin@ap1hdtv.com' 
                  ? 'bg-purple-950/80 border-purple-500 text-white shadow-xs' 
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 text-amber-400 font-black text-[11px]">
                <Crown className="w-3.5 h-3.5" />
                <span>Master Admin</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">admin@ap1hdtv.com</p>
              <span className="text-[9px] text-purple-300 font-medium">Super Admin</span>
            </button>

            {/* Station Manager Gift */}
            <button
              type="button"
              onClick={() => handleSelectAccount('gift')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                identifier === 'gift@ap1hdtv.com' 
                  ? 'bg-purple-950/80 border-purple-500 text-white shadow-xs' 
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 text-blue-400 font-black text-[11px]">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Station Manager</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">gift@ap1hdtv.com</p>
              <span className="text-[9px] text-blue-300 font-medium">Operations</span>
            </button>

            {/* HR Manager */}
            <button
              type="button"
              onClick={() => handleSelectAccount('hr')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                identifier === 'hr@ap1hdtv.com' 
                  ? 'bg-purple-950/80 border-purple-500 text-white shadow-xs' 
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 text-emerald-400 font-black text-[11px]">
                <Users className="w-3.5 h-3.5" />
                <span>HR Manager</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">hr@ap1hdtv.com</p>
              <span className="text-[9px] text-emerald-300 font-medium">HR Operations</span>
            </button>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="pt-2 text-center border-t border-slate-800/60">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>AP1 TV Security Gateway • ZKTeco TCP 4370 Protected</span>
          </p>
        </div>
      </div>
    </div>
  );
}
