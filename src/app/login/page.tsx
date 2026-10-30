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
  AlertCircle,
  KeyRound,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useLanguage } from '@/lib/i18n/context';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Reset Modal State (OTP to registered phone number)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetTargetPhone, setResetTargetPhone] = useState('');
  const [resetAccountName, setResetAccountName] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtpSending, setResetOtpSending] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetShowPassword, setResetShowPassword] = useState(false);
  const [resetVerificationToken, setResetVerificationToken] = useState('');
  const [resetUpdating, setResetUpdating] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetCountdown, setResetCountdown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (resetCountdown > 0) {
      const timer = setTimeout(() => setResetCountdown(resetCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCountdown]);

  const handleSendResetOtp = async () => {
    if (!resetIdentifier.trim()) {
      setResetMessage({ type: 'error', text: 'Please enter your Username, Email, or Biometric PIN.' });
      return;
    }

    setResetOtpSending(true);
    setResetMessage(null);

    // Grab staff list from localStorage if available
    let clientStaff: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('goinfi_staff_list');
        if (saved) clientStaff = JSON.parse(saved);
      } catch {}
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          identifier: resetIdentifier.trim(),
          clientStaff
        })
      });
      const data = await res.json();
      if (data.success) {
        setResetOtpSent(true);
        setResetVerificationToken(data.verificationToken || '');
        setResetTargetPhone(data.targetPhone || '');
        setResetAccountName(data.accountName || '');
        setResetMessage({
          type: 'success',
          text: `OTP code successfully sent to registered mobile number ${data.targetPhone}. Please check your phone.`
        });
        setResetCountdown(60);
      } else {
        setResetMessage({ type: 'error', text: data.error || 'Failed to send OTP code.' });
      }
    } catch (e) {
      setResetMessage({ type: 'error', text: 'Unable to connect to server.' });
    } finally {
      setResetOtpSending(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);

    if (!resetOtp || resetOtp.trim().length < 6) {
      setResetMessage({ type: 'error', text: 'Please enter the complete 6-digit OTP received on your mobile.' });
      return;
    }

    if (!resetNewPassword || resetNewPassword.length < 5) {
      setResetMessage({ type: 'error', text: 'New password must be at least 5 characters long.' });
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setResetUpdating(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_and_update',
          identifier: resetIdentifier.trim(),
          otp: resetOtp.trim(),
          newPassword: resetNewPassword.trim(),
          verificationToken: resetVerificationToken
        })
      });
      const data = await res.json();
      if (data.success) {
        if (typeof window !== 'undefined') {
          if (data.isMaster) {
            localStorage.setItem('goinfi_master_admin_password', resetNewPassword.trim());
          } else {
            try {
              const prev = JSON.parse(localStorage.getItem('goinfi_custom_staff_passwords') || '{}');
              prev[resetIdentifier.trim().toLowerCase()] = resetNewPassword.trim();
              localStorage.setItem('goinfi_custom_staff_passwords', JSON.stringify(prev));
            } catch {}
          }
        }
        setIdentifier(resetIdentifier.trim());
        setPassword(resetNewPassword.trim());
        setResetMessage({
          type: 'success',
          text: '✓ Password changed successfully! You can now sign in.'
        });
        setTimeout(() => {
          setShowResetModal(false);
          setResetOtpSent(false);
          setResetOtp('');
          setResetNewPassword('');
          setResetConfirmPassword('');
        }, 1800);
      } else {
        setResetMessage({ type: 'error', text: data.error || 'Password update failed.' });
      }
    } catch (e) {
      setResetMessage({ type: 'error', text: 'Server error occurred.' });
    } finally {
      setResetUpdating(false);
    }
  };

  // If already authenticated, direct straight to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your Admin Email, Username, or Biometric PIN');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsSubmitting(true);

    try {
      const query = identifier.trim().toLowerCase();
      const isMasterQuery = query === '999' || query === '9999' || query === 'admin' || query === 'admin@ap1hdtv.com';

      if (isMasterQuery) {
        // Verify with server cloud database so custom changed passwords work across all devices
        try {
          const verifyRes = await fetch('/api/auth/master-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify_login', password: password.trim() })
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success && verifyData.isValid) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('goinfi_master_admin_password', password.trim());
            }
          }
        } catch {}
      }

      const success = login(identifier, password);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('Invalid credentials. Please verify your Email/Username and password.');
        setIsSubmitting(false);
      }
    } catch {
      setError('Login failed. Please try again.');
      setIsSubmitting(false);
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
                placeholder="Enter Username, Email, or PIN"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                autoComplete="off"
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
                placeholder="Enter your password"
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
              <span>Remember session</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setResetIdentifier('');
                setShowResetModal(true);
                setResetMessage(null);
                setResetOtpSent(false);
              }}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            >
              Change Password
            </button>
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


        {/* Footer Security Badge & Goinfi Promotion */}
        <div className="pt-3 text-center border-t border-slate-800/60 space-y-1.5">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>AP1 TV Security Gateway • ZKTeco TCP 4370 Protected</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Engineered & Powered by{' '}
            <a 
              href="https://www.goinfi.biz/labs" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              Goinfi Labs
            </a>
          </p>
        </div>
      </div>

      {/* Universal Password Reset Modal (OTP to registered phone number) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-purple-800/80 rounded-3xl p-6 shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-700/60 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Change Password</h3>
                <p className="text-[11px] text-slate-400">
                  2FA Security: A 6-digit OTP will be sent to the registered mobile number.
                </p>
              </div>
            </div>

            {resetMessage && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                resetMessage.type === 'success' 
                  ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-200' 
                  : 'bg-red-950/70 border border-red-800 text-red-200'
              }`}>
                {resetMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <span>{resetMessage.text}</span>
              </div>
            )}

            {!resetOtpSent ? (
              <div className="space-y-4 pt-1 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">
                    Username, Email or Biometric PIN *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="Enter Username or Biometric PIN"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Account will be verified and a 6-digit OTP code will be sent to your officially registered mobile number.
                </p>

                <button
                  type="button"
                  onClick={handleSendResetOtp}
                  disabled={resetOtpSending || !resetIdentifier.trim()}
                  className="w-full py-3 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-900/30 disabled:opacity-60"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{resetOtpSending ? 'Sending OTP...' : 'Send OTP to Registered Mobile'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-3.5 pt-1 text-xs">
                <div className="p-2.5 bg-purple-950/40 border border-purple-800/40 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Registered Mobile:</span>
                  <span className="font-mono font-bold text-purple-300 text-xs">{resetTargetPhone}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-300">6-Digit OTP Code (from SMS) *</label>
                    <button
                      type="button"
                      onClick={handleSendResetOtp}
                      disabled={resetCountdown > 0 || resetOtpSending}
                      className="text-[10px] text-purple-400 hover:text-purple-300 disabled:opacity-50"
                    >
                      {resetCountdown > 0 ? `Resend OTP (${resetCountdown}s)` : 'Resend OTP'}
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 583921"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">New Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={resetShowPassword ? 'text' : 'password'}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="At least 5 characters"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setResetShowPassword(!resetShowPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {resetShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={resetShowPassword ? 'text' : 'password'}
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetUpdating}
                    className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {resetUpdating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Save Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
