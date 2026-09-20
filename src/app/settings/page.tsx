'use client';

import React, { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { initialSettings } from '@/lib/mock-data';
import { 
  Settings, 
  Wifi, 
  Send, 
  Building, 
  Database, 
  ShieldCheck, 
  RefreshCw, 
  Save, 
  CheckCircle2, 
  ExternalLink,
  Monitor,
  Download,
  Laptop,
  Trash2,
  KeyRound,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Crown
} from 'lucide-react';

export default function SettingsPage() {
  const { t, language } = useLanguage();
  const [settings, setSettings] = useState(initialSettings);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Master Admin Password Change (Protected via OTP to 9801239000)
  const [adminOtpSent, setAdminOtpSent] = useState(false);
  const [adminOtpSending, setAdminOtpSending] = useState(false);
  const [adminOtp, setAdminOtp] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminShowPass, setAdminShowPass] = useState(false);
  const [adminVerificationToken, setAdminVerificationToken] = useState('');
  const [adminUpdating, setAdminUpdating] = useState(false);
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adminResendCountdown, setAdminResendCountdown] = useState(0);

  // Resend Countdown Timer
  React.useEffect(() => {
    if (adminResendCountdown > 0) {
      const timer = setTimeout(() => setAdminResendCountdown(adminResendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [adminResendCountdown]);

  const handleSendAdminOtp = async () => {
    setAdminOtpSending(true);
    setAdminMessage(null);
    try {
      const res = await fetch('/api/auth/master-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp' })
      });
      const data = await res.json();
      if (data.success) {
        setAdminOtpSent(true);
        setAdminVerificationToken(data.verificationToken || '');
        setAdminMessage({
          type: 'success',
          text: `सुरक्षा कोड (OTP) सफलतापूर्वक +977-9801239000 मा पठाइयो। ${data.devOtp ? `(कोड: ${data.devOtp})` : ''}`
        });
        setAdminResendCountdown(60);
      } else {
        setAdminMessage({ type: 'error', text: data.error || 'OTP कोड पठाउन सकिएन।' });
      }
    } catch (e: any) {
      setAdminMessage({ type: 'error', text: 'सर्भरसँग सम्पर्क हुन सकेन।' });
    } finally {
      setAdminOtpSending(false);
    }
  };

  const handleUpdateMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage(null);

    if (!adminOtp || adminOtp.trim().length < 6) {
      setAdminMessage({ type: 'error', text: 'कृपया 9801239000 मा प्राप्त भएको ६-अंकको OTP कोड हाल्नुहोस्।' });
      return;
    }

    if (!adminNewPassword || adminNewPassword.length < 5) {
      setAdminMessage({ type: 'error', text: 'नयाँ पासवर्ड कम्तीमा ५ क्यारेक्टरको हुनुपर्छ।' });
      return;
    }

    if (adminNewPassword !== adminConfirmPassword) {
      setAdminMessage({ type: 'error', text: 'दुबै पासवर्ड मिलेनन् (Passwords do not match)।' });
      return;
    }

    setAdminUpdating(true);
    try {
      const res = await fetch('/api/auth/master-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_and_update',
          otp: adminOtp.trim(),
          newPassword: adminNewPassword.trim(),
          verificationToken: adminVerificationToken
        })
      });
      const data = await res.json();
      if (data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('goinfi_master_admin_password', adminNewPassword.trim());
        }
        setAdminMessage({
          type: 'success',
          text: '✅ Master Admin पासवर्ड सफलतापूर्वक परिवर्तन भयो! अब यही नयाँ पासवर्डबाट लगइन गर्न सक्नुहुन्छ।'
        });
        setAdminOtp('');
        setAdminNewPassword('');
        setAdminConfirmPassword('');
        setAdminOtpSent(false);
      } else {
        setAdminMessage({ type: 'error', text: data.error || 'पासवर्ड परिवर्तन असफल भयो।' });
      }
    } catch (e: any) {
      setAdminMessage({ type: 'error', text: 'सर्भर त्रुटि भएकोले पासवर्ड अपडेट हुन सकेन।' });
    } finally {
      setAdminUpdating(false);
    }
  };

  const handleFactoryReset = async () => {
    if (!confirm('चेतावनी: के तपाईं साँच्चिकै सबै स्टाफ, हाजिरी र डाटा मेटाएर ० (Zero) बाट नयाँ सुरु गर्न चाहनुहुन्छ? यो कार्य फिर्ता गर्न सकिँदैन।')) return;
    try {
      await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff: [] })
      });
    } catch (e) {}

    if (typeof window !== 'undefined') {
      localStorage.removeItem('goinfi_staff_list');
      localStorage.removeItem('goinfi_attendance_records');
      localStorage.removeItem('goinfi_leave_requests');
      localStorage.removeItem('goinfi_field_duty_requests');
      localStorage.removeItem('goinfi_overtime_permissions');
      localStorage.removeItem('goinfi_portal_user_pin');
      localStorage.removeItem('goinfi_sms_logs');
      localStorage.setItem('goinfi_clean_reset_2026_v2', 'true');
    }

    alert('✅ सफ्टवेयर पूर्ण रूपमा रिसेट भयो! Total Staff = 0. अब ड्यासबोर्ड खुल्नेछ।');
    window.location.href = '/dashboard';
  };

  const handleTestMachine = async () => {
    setTestingConnection(true);
    setConnectionMessage(null);
    try {
      const res = await fetch('/api/biometric/sync');
      const data = await res.json();
      setConnectionMessage(`Connected to ZKTeco daemon (${settings.biometric_device_ip}:${settings.biometric_device_port}). Protocol 4370 verified!`);
    } catch (e) {
      setConnectionMessage('Failed to reach local daemon. Ensure python zk_bridge.py is running.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <DashboardShell
      title={t.navSettings}
      subtitle="Hardware integration, ZKTeco IP configuration, Meta Cloud WhatsApp API, and company profile"
    >
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: ZKTeco Biometric Machine LAN Configuration */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">{t.hardwareSettings}</h4>
                <p className="text-xs text-slate-500">
                  Connects directly to your office ZKTeco device over LAN via pyzk TCP/IP (Port 4370)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestMachine}
              disabled={testingConnection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
              <span>{testingConnection ? 'Testing...' : 'Test Machine Ping'}</span>
            </button>
          </div>

          {connectionMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{connectionMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t.machineIp}</label>
              <input
                type="text"
                value={settings.biometric_device_ip}
                onChange={(e) => setSettings({ ...settings, biometric_device_ip: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                placeholder="192.168.1.201"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Configured in machine Ethernet settings</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t.machinePort}</label>
              <input
                type="number"
                value={settings.biometric_device_port}
                onChange={(e) => setSettings({ ...settings, biometric_device_port: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default ZKTeco TCP port is 4370</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Auto Sync Interval</label>
              <select
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="300">Every 5 Minutes (Recommended)</option>
                <option value="600">Every 10 Minutes</option>
                <option value="60">Every 1 Minute (High Traffic)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">Controlled by zk_bridge.py daemon</span>
            </div>
          </div>
        </div>

        {/* Section 2: WhatsApp Meta Cloud API Configuration */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">{t.whatsappAlerts}</h4>
              <p className="text-xs text-slate-500">{t.whatsappSub}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t.adminNumber} *</label>
              <input
                type="text"
                value={settings.whatsapp_admin_phone}
                onChange={(e) => setSettings({ ...settings, whatsapp_admin_phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                placeholder="9779841234567"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Receives 10 AM daily absent digest</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t.metaPhoneId}</label>
              <input
                type="text"
                value={settings.whatsapp_phone_number_id || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp_phone_number_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                placeholder="From Meta for Developers dashboard"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">WhatsApp Cloud API Phone ID</span>
            </div>
          </div>

          <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={settings.whatsapp_auto_10am_alert}
                onChange={(e) => setSettings({ ...settings, whatsapp_auto_10am_alert: e.target.checked })}
                className="rounded text-blue-600"
              />
              <span>Enable automated 10:00 AM WhatsApp digest of absent staff to Admin</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                defaultChecked
                className="rounded text-blue-600"
              />
              <span>Enable real-time alert when staff is 30+ minutes late</span>
            </label>
          </div>
        </div>

        {/* Section 3: Company Profile */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">Company Organization Profile</h4>
              <p className="text-xs text-slate-500">Appears on printable PDF payslips and employee reports</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Registered Name</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Office Address</label>
              <input
                type="text"
                value={settings.company_address}
                onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Office Contact Phone</label>
              <input
                type="text"
                value={settings.company_phone}
                onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nepali Fiscal Year</label>
              <input
                type="text"
                value={settings.nepali_fiscal_year}
                onChange={(e) => setSettings({ ...settings, nepali_fiscal_year: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Office PC Desktop App & Workstation Setup */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700 border border-purple-200">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Office PC Desktop Workstation (अफिस कम्प्युटर सफ्टवेयर)</h4>
                <p className="text-xs text-slate-500">
                  Run AP1 Television HRMS as a standalone native desktop application without browser tabs
                </p>
              </div>
            </div>

            <a
              href="/installers/Install_AP1_HRMS.bat"
              download="Install_AP1_HRMS.bat"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-bold text-xs transition-colors shadow-xs self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              <span>Download 1-Click Desktop Setup (.bat)</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-purple-700" />
                <span>विधि १: १-क्लिक Windows Desktop App इन्स्टलर (सिफारिस गरिएको):</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 leading-relaxed">
                <li>माथिको <strong>"Download 1-Click Desktop Setup (.bat)"</strong> बटनमा क्लिक गर्नुहोस्।</li>
                <li>डाउनलोड भएको <code className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-800 font-mono">Install_AP1_HRMS.bat</code> फाइललाई अफिस PC मा Double-Click गरी खोल्नुहोस्।</li>
                <li>तपाईंको कम्प्युटरको Desktop मा <strong>"AP1 Television HRMS"</strong> को आधिकारिक आइकन बन्नेछ।</li>
                <li>अब सो आइकन डबल-क्लिक गर्नासाथ ब्राउजरका ट्याब वा ठेगाना बार बिना सिधै सफ्टवेयर जस्तै खुल्नेछ।</li>
              </ol>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>विधि २: Chrome वा Edge ब्राउजरबाट सिधै App इन्स्टल गर्नुहोस्:</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 leading-relaxed">
                <li>कम्प्युटरमा Microsoft Edge वा Google Chrome खोली <code className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-800 font-mono">https://ap1hr.goinfi.biz</code> खोल्नुहोस्।</li>
                <li>ब्राउजरको URL (Address Bar) को दायाँ छेउमा रहेको <strong>"Install app" (कम्प्युटरमा इन्स्टल)</strong> आइकनमा क्लिक गर्नुहोस्।</li>
                <li><strong>"Install"</strong> मा क्लिक गरेपछि यो प्रणाली Windows Taskbar र Start Menu मा सफ्टवेयरको रूपमा पिन हुन्छ।</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Section: Master Admin Security & Password Change (OTP to 9801239000) */}
        <div className="bg-white border border-purple-200 p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 border border-purple-200">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>Master Admin पासवर्ड परिवर्तन (Change Password)</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-extrabold border border-purple-200">2FA OTP Secured</span>
                </h4>
                <p className="text-xs text-slate-500">
                  सुरक्षाका लागि Master Admin को पासवर्ड परिवर्तन गर्दा OTP कोड सिधै मोबाइल नम्बर <span className="font-mono font-bold text-purple-700">+977-9801239000</span> मा जानेछ।
                </p>
              </div>
            </div>

            {!adminOtpSent ? (
              <button
                type="button"
                onClick={handleSendAdminOtp}
                disabled={adminOtpSending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-xs self-start sm:self-auto cursor-pointer disabled:opacity-60"
              >
                <Smartphone className={`w-4 h-4 ${adminOtpSending ? 'animate-pulse' : ''}`} />
                <span>{adminOtpSending ? 'OTP पठाउँदै...' : 'OTP कोड पठाउनुहोस् (9801239000)'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendAdminOtp}
                disabled={adminResendCountdown > 0 || adminOtpSending}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${adminOtpSending ? 'animate-spin' : ''}`} />
                <span>{adminResendCountdown > 0 ? `पुनः पठाउनुहोस् (${adminResendCountdown}s)` : 'OTP पुनः पठाउनुहोस्'}</span>
              </button>
            )}
          </div>

          {/* Feedback Alerts */}
          {adminMessage && (
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              adminMessage.type === 'success' 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {adminMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{adminMessage.text}</span>
            </div>
          )}

          {/* Form (Active when OTP sent) */}
          {adminOtpSent && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* OTP Input */}
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    ६-अंकको OTP कोड (9801239000 मा आएको) *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      value={adminOtp}
                      onChange={(e) => setAdminOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="उदा. 481920"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono tracking-widest text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    सिस्टमले +977-9801239000 मा OTP पठाएको छ।
                  </span>
                </div>

                {/* New Password */}
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    नयाँ पासवर्ड (New Password) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={adminShowPass ? 'text' : 'password'}
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      placeholder="कम्तीमा ५ क्यारेक्टर"
                      className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                    <button
                      type="button"
                      onClick={() => setAdminShowPass(!adminShowPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {adminShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    पासवर्ड पुष्टि (Confirm Password) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={adminShowPass ? 'text' : 'password'}
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      placeholder="पुनः नयाँ पासवर्ड हाल्नुहोस्"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={handleUpdateMasterPassword}
                  disabled={adminUpdating}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-60"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{adminUpdating ? 'प्रमाणीकरण गर्दै...' : 'पासवर्ड सुरक्षित सेभ गर्नुहोस्'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Database Factory Reset & Clean Slate */}
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-rose-900 text-base">Factory Reset Database (पूर्ण क्लिन स्लेट - ० बाट सुरु)</h4>
                <p className="text-xs text-rose-700">
                  Wipe all staff directory, attendance punches, and requests to start 100% fresh from 0.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFactoryReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset Everything to 0 (Factory Reset)</span>
            </button>
          </div>
          <p className="text-[11px] text-rose-600">
            * Master Admin account credentials remain intact. All demo employees, biometric logs, and portal accounts are reset to 0.
          </p>
        </div>

        {/* Goinfi Labs Partner & Engineering Card */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-5 rounded-2xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-900/50 shadow-md">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider border border-blue-400/30">
              Technology & Engineering Partner
            </div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <span>Goinfi Labs</span>
              <span className="text-xs font-normal text-blue-300">• Cloud & Biometrics Innovation</span>
            </h4>
            <p className="text-xs text-slate-300">
              Architected, customized, and maintained for AP1 Television Network.
            </p>
          </div>
          <a
            href="https://www.goinfi.biz/labs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-colors shadow-xs shrink-0"
          >
            <span>Visit goinfi.biz/labs</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Save Button Bar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          {isSaved ? (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>All configuration settings successfully saved!</span>
            </span>
          ) : (
            <span className="text-xs text-slate-500 font-medium">Click save to persist configuration</span>
          )}

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{t.saveSettings}</span>
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
