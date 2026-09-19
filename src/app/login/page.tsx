'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, Lock, Mail, ArrowRight, ShieldCheck, Languages } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useLanguage } from '@/lib/i18n/context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();

  const [email, setEmail] = useState('admin@goinfi.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password or PIN');
      return;
    }
    login(email, password);
    router.push('/dashboard');
  };

  const handleQuickLogin = (roleType: 'admin' | 'hr' | 'employee') => {
    if (roleType === 'admin') {
      setEmail('admin@goinfi.com');
      login('admin@goinfi.com', 'admin123');
    } else if (roleType === 'hr') {
      setEmail('hr@goinfi.com');
      login('hr@goinfi.com', 'hr123');
    } else {
      setEmail('employee@goinfi.com');
      login('employee@goinfi.com', 'emp123');
    }
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-xl mb-4">
            <img src="/ap1-logo.png" alt="AP1 HD" className="h-12 w-auto object-contain drop-shadow" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">AP1 Television Network</h1>
          <p className="text-xs text-slate-400 mt-1">
            Corporate HRMS & Biometric Attendance Portal
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/60 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email or Biometric PIN
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="admin@goinfi.com or PIN 101"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <span>Sign In to Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Access Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-[11px] text-center font-medium text-slate-400 mb-3">
            Quick Demo Access (One-Click):
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('admin')}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors border border-slate-700 text-center"
            >
              👑 Admin
            </button>
            <button
              onClick={() => handleQuickLogin('hr')}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors border border-slate-700 text-center"
            >
              👥 HR Manager
            </button>
            <button
              onClick={() => handleQuickLogin('employee')}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors border border-slate-700 text-center"
            >
              💻 Staff
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>ZKTeco LAN 4370 TCP Protocol & Meta Cloud API Protected</span>
          </p>
        </div>
      </div>
    </div>
  );
}
