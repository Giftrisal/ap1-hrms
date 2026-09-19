'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { initialEmployees, generateTodayAttendance, initialAssets, initialFieldDutyRequests } from '@/lib/mock-data';
import { Employee, CompanyAsset, LeaveRequest, FieldDutyRequest, DailyAttendance, PayrollRecord } from '@/lib/types';
import { getNepaliDate } from '@/lib/nepali-date';
import { 
  User, 
  Clock, 
  CalendarDays, 
  CircleDollarSign, 
  Package, 
  MapPin, 
  QrCode, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  Building,
  Award,
  Download,
  LogOut,
  Smartphone,
  Share2,
  HelpCircle,
  Briefcase,
  ShieldCheck,
  Camera,
  Cpu,
  HardDrive,
  X,
  ChevronRight,
  Plus,
  RefreshCw,
  Home,
  Check,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldAlert,
  Sparkles,
  Send
} from 'lucide-react';
import { generatePayslipPdf } from '@/lib/pdf/payslip-generator';

export default function StaffPortalPage() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_staff_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const isOldBulk = Array.isArray(parsed) && (
            parsed.length > 200 ||
            parsed.some((e: any) => (typeof e.id === 'string' && e.id.startsWith('ap1-')) || e.full_name === 'Yeshoda')
          );
          if (isOldBulk) {
            localStorage.removeItem('goinfi_staff_list');
            return [];
          }
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return [];
  });

  // Active Staff Authentication via Biometric Machine PIN
  const [activePin, setActivePin] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('goinfi_portal_user_pin') || '';
    }
    return '';
  });

  // Auth Modes: 'login' | 'signup' | 'forgot_password'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot_password'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [notRegisteredStaff, setNotRegisteredStaff] = useState<Employee | null>(null);

  // Signup form state
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [signupPin, setSignupPin] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  const [installNotice, setInstallNotice] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Forgot / Reset password state
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetPin, setResetPin] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Credentials storage helper
  interface StaffAuthCredential {
    pin: string;
    phone: string;
    password: string;
    staffName: string;
    registeredAt: string;
  }

  const getStoredCredentials = (): Record<string, StaffAuthCredential> => {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem('goinfi_staff_credentials');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  };

  const saveStoredCredential = (cred: StaffAuthCredential) => {
    if (typeof window === 'undefined') return;
    try {
      const all = getStoredCredentials();
      all[cred.pin] = cred;
      localStorage.setItem('goinfi_staff_credentials', JSON.stringify(all));
    } catch (e) {
      console.error('Error saving credentials:', e);
    }
  };

  // Active Employee lookup
  const activeEmployee: Employee | null = employees.find(
    e => e.biometric_pin === activePin || e.id === activePin
  ) || null;

  // Selected signup employee lookup
  const selectedSignupEmp: Employee | null = employees.find(
    e => e.biometric_pin === signupPin
  ) || null;

  // Selected reset employee lookup
  const selectedResetEmp: Employee | null = employees.find(
    e => e.biometric_pin === resetPin
  ) || null;

  // Auto-populate phone when staff is selected during signup
  const handleSelectSignupStaff = (pin: string) => {
    setSignupPin(pin);
    setSignupError('');
    const emp = employees.find(e => e.biometric_pin === pin);
    if (emp) {
      const digits = (emp.phone || '').replace(/[^0-9]/g, '');
      const clean = digits.startsWith('977') && digits.length === 13 ? digits.substring(3) : digits;
      // If it looks like a placeholder, don't pre-fill or pre-fill with editable 98...
      if (clean && clean.startsWith('98') && !clean.startsWith('980000000')) {
        setSignupPhone(clean);
      } else {
        setSignupPhone('');
      }
    }
  };

  // Auto-populate phone when staff is selected during reset
  const handleSelectResetStaff = (pin: string) => {
    setResetPin(pin);
    setResetError('');
    const creds = getStoredCredentials();
    const cred = creds[pin];
    if (cred?.phone) {
      setResetPhone(cred.phone);
    } else {
      const emp = employees.find(e => e.biometric_pin === pin);
      if (emp) {
        const digits = (emp.phone || '').replace(/[^0-9]/g, '');
        const clean = digits.startsWith('977') && digits.length === 13 ? digits.substring(3) : digits;
        setResetPhone(clean);
      }
    }
  };

  // 1. LOGIN HANDLER
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setNotRegisteredStaff(null);

    const cleanInput = loginIdentifier.trim();
    if (!cleanInput) {
      setLoginError('Please enter your Biometric PIN or select your name.');
      return;
    }

    const emp = employees.find(
      e => e.biometric_pin.toString() === cleanInput || 
           e.phone.replace(/[^0-9]/g, '').includes(cleanInput) ||
           e.full_name.toLowerCase() === cleanInput.toLowerCase()
    );

    if (!emp) {
      setLoginError('Staff member not found. Please enter valid biometric machine PIN or name.');
      return;
    }

    const creds = getStoredCredentials();
    const cred = creds[emp.biometric_pin];

    // Check if staff has already signed up
    if (!cred) {
      setNotRegisteredStaff(emp);
      setLoginError(`PIN #${emp.biometric_pin} (${emp.full_name}) has not registered yet. Please create a new account first.`);
      return;
    }

    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    if (cred.password !== loginPassword) {
      setLoginError('Incorrect password! Please enter the correct password or click "Forgot Password?" below.');
      return;
    }

    // Login successful
    setActivePin(emp.biometric_pin);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_portal_user_pin', emp.biometric_pin);
    }
    setLoginPassword('');
    setLoginError('');
  };

  // 2. SIGNUP - SEND OTP HANDLER
  const handleSendSignupOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSignupError('');
    setSignupSuccess('');

    if (!signupPin) {
      setSignupError('Please select your name or machine PIN first.');
      return;
    }

    const emp = employees.find(e => e.biometric_pin === signupPin);
    if (!emp) {
      setSignupError('Staff member not found.');
      return;
    }

    const cleanPhone = signupPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setSignupError('Please enter a valid 10-digit mobile number (e.g. 9841XXXXXX).');
      return;
    }

    setSignupLoading(true);
    try {
      let gatewayConfig = undefined;
      try {
        const saved = localStorage.getItem('goinfi_sms_gateway_config');
        if (saved) gatewayConfig = JSON.parse(saved);
      } catch (e) {}

      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          pin: emp.biometric_pin,
          phone: cleanPhone,
          staffName: emp.full_name,
          type: 'signup',
          gatewayConfig
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send OTP code.');
      }

      setSignupStep(2);
      setSignupSuccess(`6-digit verification code sent to mobile +977-${cleanPhone}!`);
      if (data.verificationToken) {
        setVerificationToken(data.verificationToken);
      }
      setResendTimer(60);
    } catch (err: any) {
      setSignupError(err.message || 'Unable to send OTP.');
    } finally {
      setSignupLoading(false);
    }
  };

  // 3. SIGNUP - VERIFY OTP & CREATE PASSWORD
  const handleVerifySignupAndCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    setSignupSuccess('');

    const emp = employees.find(e => e.biometric_pin === signupPin);
    if (!emp) return;

    if (!signupOtp || signupOtp.trim().length < 6) {
      setSignupError('Please enter the complete 6-digit OTP code.');
      return;
    }

    if (!signupPassword || signupPassword.length < 4) {
      setSignupError('Password must be at least 4 characters or digits.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match! Please enter matching passwords.');
      return;
    }

    setSignupLoading(true);
    try {
      const cleanPhone = signupPhone.replace(/[^0-9]/g, '');
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          pin: emp.biometric_pin,
          phone: cleanPhone,
          code: signupOtp.trim(),
          verificationToken: verificationToken || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid or expired OTP code.');
      }

      // Save credentials in local storage
      saveStoredCredential({
        pin: emp.biometric_pin,
        phone: cleanPhone,
        password: signupPassword,
        staffName: emp.full_name,
        registeredAt: new Date().toISOString()
      });

      // Update employee record with confirmed phone number
      const updatedEmps = employees.map(item =>
        item.biometric_pin === emp.biometric_pin ? { ...item, phone: `+977-${cleanPhone}` } : item
      );
      setEmployees(updatedEmps);
      if (typeof window !== 'undefined') {
        localStorage.setItem('goinfi_staff_list', JSON.stringify(updatedEmps));
        localStorage.setItem('goinfi_portal_user_pin', emp.biometric_pin);
      }

      setActivePin(emp.biometric_pin);
      setAuthMode('login');
      setSignupStep(1);
    } catch (err: any) {
      setSignupError(err.message || 'Failed to complete registration.');
    } finally {
      setSignupLoading(false);
    }
  };

  // 4. FORGOT PASSWORD - SEND RESET OTP
  const handleSendResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetPin) {
      setResetError('Please select your Biometric PIN or name.');
      return;
    }

    const emp = employees.find(e => e.biometric_pin === resetPin);
    if (!emp) {
      setResetError('Staff member not found.');
      return;
    }

    const cleanPhone = resetPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setResetError('Please enter your 10-digit registered mobile number.');
      return;
    }

    setResetLoading(true);
    try {
      let gatewayConfig = undefined;
      try {
        const saved = localStorage.getItem('goinfi_sms_gateway_config');
        if (saved) gatewayConfig = JSON.parse(saved);
      } catch (e) {}

      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          pin: emp.biometric_pin,
          phone: cleanPhone,
          staffName: emp.full_name,
          type: 'reset',
          gatewayConfig
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send reset OTP code.');
      }

      setResetStep(2);
      setResetSuccess(`Reset verification code sent to mobile +977-${cleanPhone}!`);
      if (data.verificationToken) {
        setVerificationToken(data.verificationToken);
      }
      setResendTimer(60);
    } catch (err: any) {
      setResetError(err.message || 'Unable to send reset OTP.');
    } finally {
      setResetLoading(false);
    }
  };

  // 5. FORGOT PASSWORD - VERIFY OTP & SAVE NEW PASSWORD
  const handleVerifyResetAndSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    const emp = employees.find(e => e.biometric_pin === resetPin);
    if (!emp) return;

    if (!resetOtp || resetOtp.trim().length < 6) {
      setResetError('Please enter the complete 6-digit OTP code.');
      return;
    }

    if (!resetPassword || resetPassword.length < 4) {
      setResetError('New password must be at least 4 characters or digits.');
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match! Please enter matching passwords.');
      return;
    }

    setResetLoading(true);
    try {
      const cleanPhone = resetPhone.replace(/[^0-9]/g, '');
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          pin: emp.biometric_pin,
          phone: cleanPhone,
          code: resetOtp.trim(),
          verificationToken: verificationToken || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid or expired OTP code.');
      }

      // Update credentials
      saveStoredCredential({
        pin: emp.biometric_pin,
        phone: cleanPhone,
        password: resetPassword,
        staffName: emp.full_name,
        registeredAt: new Date().toISOString()
      });

      // Auto login with new password
      setActivePin(emp.biometric_pin);
      if (typeof window !== 'undefined') {
        localStorage.setItem('goinfi_portal_user_pin', emp.biometric_pin);
      }

      setAuthMode('login');
      setResetStep(1);
    } catch (err: any) {
      setResetError(err.message || 'Unable to save new password.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = () => {
    setActivePin('');
    setLoginPassword('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('goinfi_portal_user_pin');
    }
  };

  // Mobile Tabs: 'home' | 'attendance' | 'leaves' | 'profile'
  const [mobileTab, setMobileTab] = useState<'home' | 'attendance' | 'leaves' | 'profile'>('home');

  // Mobile Only Restriction Check (Blocks Laptop / Desktop / PC)
  const [isDesktopBlocked, setIsDesktopBlocked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const checkIsDesktop = () => {
      if (typeof window === 'undefined') return;
      const ua = navigator.userAgent || '';
      // Mobile user agents (Android, iPhone, iPad, iPod, Windows Phone, etc.)
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      // Wide desktop screens (> 768px) that do not have mobile UA
      const isWideScreen = window.innerWidth > 768;

      if (!isMobileUA && isWideScreen) {
        setIsDesktopBlocked(true);
      } else {
        setIsDesktopBlocked(false);
      }
    };

    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode or installed
    if (typeof window !== 'undefined') {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://') ||
        localStorage.getItem('ap1_pwa_installed') === 'true';

      if (isStandalone) {
        setIsAlreadyInstalled(true);
      }

      const mediaQuery = window.matchMedia('(display-mode: standalone)');
      const handleMediaChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          setIsAlreadyInstalled(true);
          localStorage.setItem('ap1_pwa_installed', 'true');
        }
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleMediaChange);
      }

      // Register PWA service worker so browser triggers native beforeinstallprompt
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.warn('Service worker registration note:', err);
        });
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      const handleAppInstalled = () => {
        setIsInstallable(false);
        setIsAlreadyInstalled(true);
        setDeferredPrompt(null);
        localStorage.setItem('ap1_pwa_installed', 'true');
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleMediaChange);
        }
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    const prompt = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__deferredPrompt : null);
    if (prompt) {
      try {
        prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsInstallable(false);
          setIsAlreadyInstalled(true);
          if (typeof window !== 'undefined') localStorage.setItem('ap1_pwa_installed', 'true');
        }
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') (window as any).__deferredPrompt = null;
        return;
      } catch (err) {
        console.error('PWA install error:', err);
      }
    }

    // Check if already running as standalone PWA
    if (typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone)) {
      setInstallNotice('AP1 Staff Portal is already installed on your mobile device.');
      setTimeout(() => setInstallNotice(null), 3500);
      return;
    }

    // Non-blocking toast notice for iPhone/Safari or desktop
    setInstallNotice('To install on iOS: Tap Share (⎋) at the bottom of Safari and choose "Add to Home Screen".');
    setTimeout(() => setInstallNotice(null), 4000);
  };

  // Leaves & Duty Submissions
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSuccess, setLeaveSuccess] = useState(false);

  const [isFdModalOpen, setIsFdModalOpen] = useState(false);
  const [fdType, setFdType] = useState<'FIELD_VISIT' | 'WORK_FROM_HOME' | 'CLIENT_MEETING' | 'OFFICIAL_TOUR'>('FIELD_VISIT');
  const [fdDate, setFdDate] = useState(new Date().toISOString().split('T')[0]);
  const [fdLocation, setFdLocation] = useState('');
  const [fdPurpose, setFdPurpose] = useState('');
  const [fdSuccess, setFdSuccess] = useState(false);

  // Load assets assigned to this employee
  const [assignedAssets, setAssignedAssets] = useState<CompanyAsset[]>([]);
  useEffect(() => {
    if (!activeEmployee) return;
    try {
      const saved = localStorage.getItem('goinfi_assets_list');
      if (saved) {
        const parsed: CompanyAsset[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setAssignedAssets(parsed.filter(a => a.assigned_to_id === activeEmployee.id || a.assigned_to_name === activeEmployee.full_name));
        }
      }
    } catch (e) {}
  }, [activeEmployee]);

  // Load leave requests
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  useEffect(() => {
    if (!activeEmployee) return;
    try {
      const saved = localStorage.getItem('goinfi_leave_requests');
      if (saved) {
        const parsed: LeaveRequest[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMyLeaves(parsed.filter(l => l.employee_id === activeEmployee.id || l.employee_name === activeEmployee.full_name));
        }
      }
    } catch (e) {}
  }, [activeEmployee, leaveSuccess]);

  // Handle Leave Apply
  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee || !leaveStartDate || !leaveEndDate || !leaveReason) return;

    const start = new Date(leaveStartDate);
    const end = new Date(leaveEndDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const newReq: LeaveRequest = {
      id: `lr-${Date.now()}`,
      employee_id: activeEmployee.id,
      employee_name: activeEmployee.full_name,
      leave_type_id: 'lt-user',
      leave_type_name: leaveType,
      start_date: leaveStartDate,
      end_date: leaveEndDate,
      total_days: isNaN(diffDays) ? 1 : diffDays,
      reason: leaveReason,
      status: 'pending',
      applied_at: new Date().toISOString().split('T')[0]
    };

    let allLeaves: LeaveRequest[] = [];
    try {
      const saved = localStorage.getItem('goinfi_leave_requests');
      if (saved) allLeaves = JSON.parse(saved);
    } catch (e) {}

    const updated = [newReq, ...allLeaves];
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_leave_requests', JSON.stringify(updated));
    }
    setMyLeaves([newReq, ...myLeaves]);
    setLeaveSuccess(true);
    setTimeout(() => {
      setLeaveSuccess(false);
      setIsLeaveModalOpen(false);
      setLeaveReason('');
      setLeaveStartDate('');
      setLeaveEndDate('');
    }, 2000);
  };

  // Handle Field Duty Apply
  const handleApplyFieldDuty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee || !fdLocation || !fdPurpose) return;

    const newFd: FieldDutyRequest = {
      id: `fdr-${Date.now()}`,
      employee_id: activeEmployee.id,
      employee_name: activeEmployee.full_name,
      employee_photo: activeEmployee.photo_url,
      department_name: activeEmployee.department_name,
      type: fdType,
      start_date: fdDate,
      end_date: fdDate,
      location: fdLocation,
      purpose: fdPurpose,
      status: 'pending',
      applied_at: new Date().toISOString(),
      remarks: 'Submitted via Mobile Staff Portal'
    };

    let allDuties: FieldDutyRequest[] = [];
    try {
      const saved = localStorage.getItem('goinfi_field_duties');
      if (saved) allDuties = JSON.parse(saved);
    } catch (e) {}

    const updated = [newFd, ...allDuties];
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_field_duties', JSON.stringify(updated));
    }
    setFdSuccess(true);
    setTimeout(() => {
      setFdSuccess(false);
      setIsFdModalOpen(false);
      setFdLocation('');
      setFdPurpose('');
    }, 2000);
  };

  const handleDownloadPayslip = () => {
    if (!activeEmployee) return;
    const mockPayroll: PayrollRecord = {
      id: `pay-${activeEmployee.id}`,
      employee_id: activeEmployee.id,
      employee_name: activeEmployee.full_name,
      employee_designation: activeEmployee.designation,
      department_name: activeEmployee.department_name || 'Broadcasting',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      base_salary: activeEmployee.base_salary,
      working_days: 26,
      present_days: 25,
      absent_days: 0,
      late_days: 1,
      paid_leave_days: 1,
      unpaid_leave_days: 0,
      overtime_hours: 4,
      overtime_pay: 1500,
      allowances: 3000,
      late_deduction: 0,
      absent_deduction: 0,
      unpaid_leave_deduction: 0,
      advance_deduction: 0,
      tax_deduction: Math.round(activeEmployee.base_salary * 0.01),
      net_salary: Math.round(activeEmployee.base_salary + 4500 - (activeEmployee.base_salary * 0.01)),
      status: 'paid',
      payment_method: 'Bank Transfer',
      bank_name: activeEmployee.bank_name || 'Global IME Bank',
      bank_account_number: activeEmployee.bank_account_number || '102000000001',
      pan_number: activeEmployee.pan_number || 'PAN000001'
    };
    generatePayslipPdf(mockPayroll, 'AP1 Television HD');
  };

  // Desktop / Laptop Access Restriction Guard (Mobile Only Application)
  if (isDesktopBlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900/95 border border-purple-500/40 rounded-3xl p-7 shadow-2xl backdrop-blur-xl relative z-10 space-y-5">
          {/* Brand Header */}
          <div className="flex flex-col items-center gap-2">
            <img 
              src="/ap1-logo.png" 
              alt="AP1 HD" 
              className="h-14 w-auto shrink-0 object-contain drop-shadow mb-1" 
              style={{ aspectRatio: '800/339' }} 
            />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/90 border border-purple-700/60 text-fuchsia-400 text-xs font-black tracking-wider uppercase">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Only Application</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              AP1 Staff Portal
            </h1>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              This portal is exclusively designed for <strong>employee smartphones</strong>. Access from laptops, PCs, or desktop web browsers is restricted.
            </p>
          </div>

          {/* QR Code Container */}
          <div className="bg-white p-3 rounded-2xl mx-auto w-52 h-52 flex flex-col items-center justify-center shadow-xl border-4 border-purple-600/30">
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https%3A%2F%2Fap1hr.goinfi.biz%2Fportal"
              alt="Scan QR code on Mobile"
              className="w-44 h-44 object-contain"
            />
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-purple-300 flex items-center justify-center gap-1.5">
              <span>📱 Scan with your phone camera to open</span>
            </p>

            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-xl p-2 text-left">
              <span className="text-[11px] font-mono text-slate-300 truncate flex-1 px-1 select-all">
                https://ap1hr.goinfi.biz/portal
              </span>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined') {
                    navigator.clipboard.writeText('https://ap1hr.goinfi.biz/portal');
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }
                }}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-bold shrink-0 active:scale-95 transition-transform cursor-pointer"
              >
                {copiedLink ? 'Copied! ✓' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Admin bypass redirect */}
          <div className="pt-3 border-t border-slate-800 flex flex-col items-center gap-1.5">
            <p className="text-[11px] text-slate-400">Are you an HR Administrator using a PC?</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-xs font-bold text-fuchsia-400 hover:text-fuchsia-300 hover:underline cursor-pointer"
            >
              <span>Go to AP1 HR Admin Dashboard &rarr;</span>
            </Link>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-5 relative z-10">
          🔒 AP1 Television HD • Powered by Goinfi HRMS
        </p>
      </div>
    );
  }

  // If no staff is currently logged into the mobile app: Show Clean Login / Signup / Reset Screen
  if (!activeEmployee) {
    return (
      <div className="min-h-[100dvh] max-w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans safe-top safe-bottom overscroll-none touch-pan-y">
        {/* Top Header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <img 
              src="/ap1-logo.png" 
              alt="AP1 HD" 
              className="h-10 sm:h-12 w-auto shrink-0 object-contain drop-shadow" 
              style={{ aspectRatio: '800/339' }} 
            />
            <div className="border-l border-slate-700/80 pl-2.5">
              <span className="text-xs font-black tracking-wider text-fuchsia-400 uppercase block">STAFF PORTAL</span>
              <span className="text-[10px] text-purple-300/80">AP1 Television HD</span>
            </div>
          </div>
          {!isAlreadyInstalled && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 text-white shadow-lg shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}
        </div>

        {/* Central Auth Container */}
        <div className="max-w-md w-full mx-auto my-auto py-4">

          {/* =============================================================== */}
          {/* VIEW 1: LOGIN */}
          {/* =============================================================== */}
          {authMode === 'login' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-tr from-purple-700 via-purple-600 to-fuchsia-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-purple-600/30 mb-2.5">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">Staff Login</h1>
                <p className="text-xs text-purple-200/80 mt-0.5">
                  Sign in securely using your Biometric PIN and password
                </p>
              </div>

              {/* Error or Alert banner */}
              {loginError && (
                <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-2xl text-xs text-red-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium leading-relaxed">{loginError}</p>
                    {notRegisteredStaff && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setSignupStep(1);
                          handleSelectSignupStaff(notRegisteredStaff.biometric_pin);
                          setLoginError('');
                        }}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold rounded-lg text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Sign Up Now</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* PIN / Name selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Biometric PIN or Staff Name
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1, 104, or Name..."
                    value={loginIdentifier}
                    onChange={e => {
                      setLoginIdentifier(e.target.value);
                      setLoginError('');
                      setNotRegisteredStaff(null);
                    }}
                    className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-slate-500"
                  />
                  {/* Quick helper picker */}
                  <div className="mt-1.5">
                    <select
                      value={loginIdentifier}
                      onChange={e => {
                        setLoginIdentifier(e.target.value);
                        setLoginError('');
                        setNotRegisteredStaff(null);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-800/60 border border-slate-700/60 rounded-lg text-[11px] text-slate-300 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Or select name from list ({employees.length} Staff) --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.biometric_pin}>
                          PIN #{emp.biometric_pin} - {emp.full_name} ({emp.designation})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot_password');
                        setResetStep(1);
                        setResetPin(loginIdentifier);
                        if (loginIdentifier) handleSelectResetStaff(loginIdentifier);
                      }}
                      className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password..."
                      value={loginPassword}
                      onChange={e => {
                        setLoginPassword(e.target.value);
                        setLoginError('');
                      }}
                      className="w-full pl-4 pr-11 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-slate-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Sign In</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>

              {/* Bottom switch to Sign Up */}
              <div className="pt-4 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400 mb-2">First time using the staff app?</p>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setSignupStep(1);
                    setSignupError('');
                    setSignupSuccess('');
                  }}
                  className="w-full py-2.5 px-4 bg-purple-950/40 hover:bg-purple-900/50 text-purple-200 hover:text-white rounded-xl text-xs font-bold border border-purple-800/60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Register New Account (Sign Up)</span>
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW 2: SIGN UP */}
          {/* =============================================================== */}
          {authMode === 'signup' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setSignupStep(1);
                    setSignupError('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Login</span>
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-300 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-700/60">
                  Step {signupStep} of 2
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-fuchsia-400" />
                  <span>Staff Registration (Sign Up)</span>
                </h2>
                <p className="text-xs text-purple-200/80 mt-0.5">
                  Verify your phone number with OTP to create your secure password
                </p>
              </div>

              {signupError && (
                <div className="p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{signupError}</span>
                </div>
              )}

              {signupSuccess && (
                <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{signupSuccess}</span>
                </div>
              )}

              {/* SIGNUP STEP 1: Select Staff & Send OTP */}
              {signupStep === 1 && (
                <form onSubmit={handleSendSignupOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Select Staff or Biometric PIN *
                    </label>
                    <select
                      required
                      value={signupPin}
                      onChange={e => handleSelectSignupStaff(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Select your name ({employees.length} Staff) --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.biometric_pin}>
                          PIN #{emp.biometric_pin} - {emp.full_name} ({emp.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Staff Preview Card if selected */}
                  {selectedSignupEmp && (
                    <div className="p-3 bg-purple-950/30 rounded-2xl border border-purple-800/40 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-fuchsia-400 shrink-0 font-mono font-bold text-sm">
                        #{selectedSignupEmp.biometric_pin}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-xs sm:text-sm truncate">{selectedSignupEmp.full_name}</p>
                        <p className="text-[11px] text-purple-300/80 truncate">{selectedSignupEmp.designation} • {selectedSignupEmp.department_name}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Mobile Number (To receive OTP) *
                    </label>
                    <div className="flex rounded-xl overflow-hidden border border-slate-700 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20">
                      <span className="bg-slate-800 px-3 py-2.5 text-xs text-purple-300 font-mono font-semibold border-r border-slate-700 flex items-center">
                        +977
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9841234567"
                        value={signupPhone}
                        onChange={e => setSignupPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        className="flex-1 px-3 py-2.5 bg-slate-800/90 text-white font-mono font-semibold text-sm focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      A 6-digit OTP verification code will be sent to this number.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={signupLoading || !signupPin || signupPhone.length < 10}
                    className="w-full py-3 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {signupLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Send OTP via SMS</span>
                  </button>
                </form>
              )}

              {/* SIGNUP STEP 2: Verify OTP & Create Password */}
              {signupStep === 2 && (
                <form onSubmit={handleVerifySignupAndCreatePassword} className="space-y-4">
                  {/* Clean SMS Notification Card */}
                  <div className="p-3.5 bg-slate-800/80 border border-purple-500/30 rounded-2xl text-xs space-y-1.5 shadow-md">
                    <div className="flex items-center gap-2 text-purple-300 font-semibold">
                      <Smartphone className="w-4 h-4 text-fuchsia-400 shrink-0" />
                      <span>SMS Verification Code Sent</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                      A 6-digit OTP code has been dispatched to mobile number <strong className="text-white font-mono">+977-{signupPhone}</strong>. Please check your messages and enter the code below.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      6-Digit OTP Code (From SMS) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. 849201"
                      value={signupOtp}
                      onChange={e => setSignupOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white font-mono font-bold text-center tracking-widest text-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    />
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-slate-400">Number: +977-{signupPhone}</span>
                      <button
                        type="button"
                        disabled={resendTimer > 0 || signupLoading}
                        onClick={() => handleSendSignupOtp()}
                        className="text-fuchsia-400 hover:text-fuchsia-300 disabled:text-slate-600 font-semibold cursor-pointer"
                      >
                        {resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : 'Resend OTP'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      New Secret Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        minLength={4}
                        placeholder="At least 4 characters or numbers..."
                        value={signupPassword}
                        onChange={e => setSignupPassword(e.target.value)}
                        className="w-full pl-4 pr-11 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      >
                        {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Confirm Password *
                    </label>
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter new password..."
                      value={signupConfirmPassword}
                      onChange={e => setSignupConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={signupLoading || signupOtp.length < 6 || !signupPassword}
                    className="w-full py-3 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {signupLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Complete Registration & Sign In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignupStep(1)}
                    className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1"
                  >
                    ← Change number or staff
                  </button>
                </form>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW 3: FORGOT / RESET PASSWORD */}
          {/* =============================================================== */}
          {authMode === 'forgot_password' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setResetStep(1);
                    setResetError('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Login</span>
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-300 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-700/60">
                  Reset Step {resetStep} of 2
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-fuchsia-400" />
                  <span>Reset Password</span>
                </h2>
                <p className="text-xs text-purple-200/80 mt-0.5">
                  Receive a verification OTP on your registered phone to set a new password
                </p>
              </div>

              {resetError && (
                <div className="p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              {/* RESET STEP 1: Select Staff & Send Reset Code */}
              {resetStep === 1 && (
                <form onSubmit={handleSendResetOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Select Staff or Biometric PIN *
                    </label>
                    <select
                      required
                      value={resetPin}
                      onChange={e => handleSelectResetStaff(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Select your name --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.biometric_pin}>
                          PIN #{emp.biometric_pin} - {emp.full_name} ({emp.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedResetEmp && (
                    <div className="p-3 bg-purple-950/30 rounded-2xl border border-purple-800/40 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-fuchsia-400 shrink-0 font-mono font-bold text-sm">
                        #{selectedResetEmp.biometric_pin}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-xs sm:text-sm truncate">{selectedResetEmp.full_name}</p>
                        <p className="text-[11px] text-purple-300/80 truncate">{selectedResetEmp.designation}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Registered Mobile Number *
                    </label>
                    <div className="flex rounded-xl overflow-hidden border border-slate-700 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20">
                      <span className="bg-slate-800 px-3 py-2.5 text-xs text-purple-300 font-mono font-semibold border-r border-slate-700 flex items-center">
                        +977
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9841234567"
                        value={resetPhone}
                        onChange={e => setResetPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        className="flex-1 px-3 py-2.5 bg-slate-800/90 text-white font-mono font-semibold text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading || !resetPin || resetPhone.length < 10}
                    className="w-full py-3 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {resetLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Send Reset Code via SMS</span>
                  </button>
                </form>
              )}

              {/* RESET STEP 2: Verify OTP & Save New Password */}
              {resetStep === 2 && (
                <form onSubmit={handleVerifyResetAndSavePassword} className="space-y-4">
                  {/* Clean SMS Notification Card */}
                  <div className="p-3.5 bg-slate-800/80 border border-purple-500/30 rounded-2xl text-xs space-y-1.5 shadow-md">
                    <div className="flex items-center gap-2 text-purple-300 font-semibold">
                      <Smartphone className="w-4 h-4 text-fuchsia-400 shrink-0" />
                      <span>Password Reset Code Sent</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                      A 6-digit reset code has been dispatched to mobile number <strong className="text-white font-mono">+977-{resetPhone}</strong>. Please check your SMS and enter the code below.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      6-Digit Reset OTP Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. 529140"
                      value={resetOtp}
                      onChange={e => setResetOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white font-mono font-bold text-center tracking-widest text-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    />
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-slate-400">Number: +977-{resetPhone}</span>
                      <button
                        type="button"
                        disabled={resendTimer > 0 || resetLoading}
                        onClick={() => handleSendResetOtp()}
                        className="text-fuchsia-400 hover:text-fuchsia-300 disabled:text-slate-600 font-semibold cursor-pointer"
                      >
                        {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        required
                        minLength={4}
                        placeholder="At least 4 characters or numbers..."
                        value={resetPassword}
                        onChange={e => setResetPassword(e.target.value)}
                        className="w-full pl-4 pr-11 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      >
                        {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Confirm New Password *
                    </label>
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter new password..."
                      value={resetConfirmPassword}
                      onChange={e => setResetConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading || resetOtp.length < 6 || !resetPassword}
                    className="w-full py-3 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {resetLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Change Password & Sign In</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center pb-2 text-[11px] text-slate-500">
          <p>🔒 AP1 Television HD • Goinfi Biometric HRMS 2026</p>
        </div>

        {/* Non-intrusive Install Toast */}
        {installNotice && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-sm w-11/12 bg-slate-900/95 border border-purple-500/60 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-fuchsia-400 shrink-0" />
            <span className="text-xs font-medium text-slate-200">{installNotice}</span>
          </div>
        )}
      </div>
    );
  }

  // LOGGED-IN MOBILE STAFF PORTAL INTERFACE
  return (
    <div className="min-h-[100dvh] max-w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans pb-28 overscroll-none touch-pan-y">
      {/* Top Mobile App Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 safe-top">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/ap1-logo.png" 
              alt="AP1 HD" 
              className="h-9 sm:h-10 w-auto shrink-0 object-contain drop-shadow" 
              style={{ aspectRatio: '800/339' }} 
            />
            <div className="border-l border-slate-700/80 pl-2.5">
              <span className="text-[10px] font-black text-fuchsia-400 tracking-wider uppercase block">STAFF PORTAL</span>
              <span className="text-xs font-bold text-white leading-none truncate max-w-[150px] sm:max-w-[200px] block">
                {activeEmployee.full_name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAlreadyInstalled && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-950/80 text-fuchsia-400 border border-purple-700/50 text-[11px] font-bold active:scale-95 cursor-pointer shadow-sm"
                title="Install App"
              >
                <Smartphone className="w-3 h-3" />
                <span>App</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-fuchsia-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Logout / Change PIN"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Mobile Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
        {/* PWA Floating Install Helper Banner */}
        {!isAlreadyInstalled && (
          <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-fuchsia-950/40 border border-purple-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-md shadow-purple-600/30">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Install AP1 Staff Portal</h4>
                <p className="text-[11px] text-purple-200/70">Add to your home screen for quick daily access</p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 text-white rounded-xl text-xs font-bold shrink-0 shadow-md cursor-pointer active:scale-95"
            >
              Install
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: HOME */}
        {/* ========================================================================= */}
        {mobileTab === 'home' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Staff Welcome Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-purple-600/20 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center gap-3.5 mb-4">
                <div className="relative">
                  <img
                    src={activeEmployee.photo_url || "https://images.unsplash.com/photo-1534528741775?w=150"}
                    alt={activeEmployee.full_name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-500 shadow-md"
                  />
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-[9px] font-black text-white rounded-full shadow">
                    PIN {activeEmployee.biometric_pin}
                  </span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{activeEmployee.full_name}</h2>
                  <p className="text-xs text-fuchsia-400 font-semibold">{activeEmployee.designation}</p>
                  <p className="text-[11px] text-slate-400">{activeEmployee.department_name}</p>
                </div>
              </div>

              {/* Nepali Date Banner */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-slate-200">
                    {getNepaliDate(new Date()).formattedNp}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  {new Date().toISOString().split('T')[0]}
                </span>
              </div>
            </div>

            {/* Live Today Attendance Punch Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Biometric Attendance</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> UDP 4370 Live
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] font-semibold text-slate-500 block uppercase">Check In (Arrival)</span>
                  <span className="text-lg font-mono font-black text-emerald-400 mt-1 block">
                    09:15 AM
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Recorded on machine</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] font-semibold text-slate-500 block uppercase">Check Out (Departure)</span>
                  <span className="text-lg font-mono font-black text-amber-400 mt-1 block">
                    -- : --
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Shift in progress</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Shift: Morning Broadcast (9 AM - 5 PM)</span>
                <span className="text-emerald-400 font-semibold">Status: On Time</span>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800/90 border border-slate-800 p-4 rounded-2xl text-left transition-transform active:scale-98 cursor-pointer flex flex-col justify-between h-28"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Apply Leave</h4>
                  <p className="text-[10px] text-slate-400">Submit leave application</p>
                </div>
              </button>

              <button
                onClick={() => setIsFdModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800/90 border border-slate-800 p-4 rounded-2xl text-left transition-transform active:scale-98 cursor-pointer flex flex-col justify-between h-28"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Field Duty / WFH</h4>
                  <p className="text-[10px] text-slate-400">Outdoor visit or remote work</p>
                </div>
              </button>
            </div>

            {/* Assigned Assets Quick Widget */}
            {assignedAssets.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Assigned Company Assets ({assignedAssets.length})</span>
                  <button onClick={() => setMobileTab('profile')} className="text-[11px] text-fuchsia-400 font-bold hover:underline">
                    View All &rarr;
                  </button>
                </div>
                <div className="space-y-2">
                  {assignedAssets.slice(0, 2).map(asset => (
                    <div key={asset.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{asset.name}</p>
                        <p className="text-[10px] text-slate-400">{asset.category} • {asset.asset_code}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                        In Custody
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ATTENDANCE */}
        {/* ========================================================================= */}
        {mobileTab === 'attendance' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Monthly Attendance Counters */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-center">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase">Present</span>
                <span className="text-xl font-black text-emerald-400 mt-1 block">22</span>
                <span className="text-[10px] text-slate-500">Days</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-center">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase">Late</span>
                <span className="text-xl font-black text-amber-400 mt-1 block">1</span>
                <span className="text-[10px] text-slate-500">Day</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-center">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase">Absent</span>
                <span className="text-xl font-black text-rose-400 mt-1 block">0</span>
                <span className="text-[10px] text-slate-500">Days</span>
              </div>
            </div>

            {/* Attendance Logs */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-sm text-white">Recent Attendance Records</h3>
                <span className="text-[11px] text-slate-400">PIN #{activeEmployee.biometric_pin}</span>
              </div>

              <div className="space-y-2">
                {[
                  { date: '2026-09-19', day: 'Today', in: '09:15 AM', out: '--', status: 'PRESENT' },
                  { date: '2026-09-18', day: 'Friday', in: '09:08 AM', out: '05:12 PM', status: 'PRESENT' },
                  { date: '2026-09-17', day: 'Thursday', in: '09:32 AM', out: '05:05 PM', status: 'LATE' },
                  { date: '2026-09-16', day: 'Wednesday', in: '08:58 AM', out: '05:30 PM', status: 'PRESENT' },
                  { date: '2026-09-15', day: 'Tuesday', in: '09:02 AM', out: '05:15 PM', status: 'PRESENT' },
                ].map((row, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{row.day}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{row.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-slate-200">
                        <span className="text-emerald-400 font-semibold">{row.in}</span> - {row.out}
                      </p>
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.2 rounded-full mt-0.5 ${
                        row.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LEAVES & DUTY */}
        {/* ========================================================================= */}
        {mobileTab === 'leaves' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Leave Balance Overview */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase">Casual Leave</span>
                <span className="text-xl font-bold text-blue-400 mt-1 block">12</span>
                <span className="text-[10px] text-slate-500">Days Left</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase">Sick Leave</span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block">12</span>
                <span className="text-[10px] text-slate-500">Days Left</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase">Annual Leave</span>
                <span className="text-xl font-bold text-purple-400 mt-1 block">14</span>
                <span className="text-[10px] text-slate-500">Days Left</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Apply Leave</span>
              </button>
              <button
                onClick={() => setIsFdModalOpen(true)}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                <span>Field Duty</span>
              </button>
            </div>

            {/* My Leave Applications */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4.5 space-y-3">
              <h3 className="font-bold text-sm text-white pb-2 border-b border-slate-800">
                Your Leave Requests ({myLeaves.length})
              </h3>
              {myLeaves.length === 0 ? (
                <div className="py-8 text-center text-slate-500 space-y-1">
                  <CalendarDays className="w-8 h-8 text-slate-700 mx-auto" />
                  <p className="text-xs">No leave requests submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myLeaves.map(leave => (
                    <div key={leave.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{leave.leave_type_name}</span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          leave.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          leave.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {leave.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{leave.start_date} to {leave.end_date} ({leave.total_days} Days)</p>
                      <p className="text-slate-300 text-[11px] italic">&quot;{leave.reason}&quot;</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PROFILE & ASSETS */}
        {/* ========================================================================= */}
        {mobileTab === 'profile' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Digital ID Card Badge Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center relative overflow-hidden shadow-2xl">
              <div className="w-12 h-2 bg-slate-800 rounded-full mx-auto mb-4 border border-slate-700"></div>

              <div className="flex items-center justify-center gap-2 mb-3 bg-white/5 py-1.5 px-3 rounded-xl border border-white/10">
                <img 
                  src="/ap1-logo.png" 
                  alt="AP1 HD" 
                  className="h-7 w-auto shrink-0 object-contain drop-shadow" 
                  style={{ aspectRatio: '800/339' }} 
                />
                <h3 className="font-black text-[11px] tracking-wider text-white uppercase">AP1 TELEVISION HD</h3>
              </div>

              <img
                src={activeEmployee.photo_url || "https://images.unsplash.com/photo-1534528741775?w=150"}
                alt={activeEmployee.full_name}
                className="w-24 h-24 rounded-full object-cover border-2 border-purple-500 mx-auto shadow-xl mb-3"
              />

              <h3 className="font-black text-lg text-white">{activeEmployee.full_name}</h3>
              <p className="text-xs font-bold text-fuchsia-400 mt-0.5">{activeEmployee.designation}</p>
              <p className="text-[11px] text-slate-400">{activeEmployee.department_name}</p>

              <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-1.5 text-center text-xs">
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">PIN</span>
                  <span className="font-mono font-bold text-emerald-400">#{activeEmployee.biometric_pin}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Role</span>
                  <span className="text-white font-bold text-[10px] uppercase">{activeEmployee.role}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Status</span>
                  <span className="text-emerald-400 font-bold text-[10px]">ACTIVE</span>
                </div>
              </div>

              <div className="mt-3 pt-2 bg-slate-950/80 rounded-xl p-2 flex items-center justify-center gap-2 text-[10px] text-slate-400 border border-slate-800">
                <QrCode className="w-4 h-4 text-fuchsia-400" />
                <span>Verified by Goinfi Biometric HRMS</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDownloadPayslip}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Download Payslip</span>
              </button>

              <button
                onClick={() => window.print()}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Print ID Badge</span>
              </button>
            </div>

            {/* Assigned Assets Full List */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-sm text-white">Company Assets Assigned to You</h3>
                <span className="text-xs font-mono font-bold text-blue-400">{assignedAssets.length} Items</span>
              </div>

              {assignedAssets.length === 0 ? (
                <div className="py-6 text-center text-slate-500 space-y-1">
                  <Package className="w-8 h-8 text-slate-700 mx-auto" />
                  <p className="text-xs">No assets currently registered in your custody.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedAssets.map(asset => (
                    <div key={asset.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{asset.name}</span>
                        <span className="font-mono text-[10px] text-blue-400">{asset.asset_code}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Category: {asset.category}</span>
                        <span>SN: {asset.serial_number || 'N/A'}</span>
                      </div>
                      {asset.notes && (
                        <p className="text-[10px] text-slate-500 italic mt-1">&quot;{asset.notes}&quot;</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Logout / Switch Device User */}
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800/60 rounded-2xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out / Switch Staff PIN</span>
            </button>
          </div>
        )}
      </main>

      {/* FIXED MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pt-1.5 px-3 safe-bottom select-none">
        <div className="max-w-lg mx-auto grid grid-cols-4 gap-1 text-center">
          <button
            onClick={() => setMobileTab('home')}
            className={`py-1.5 flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
              mobileTab === 'home' ? 'text-fuchsia-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Home</span>
          </button>

          <button
            onClick={() => setMobileTab('attendance')}
            className={`py-1.5 flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
              mobileTab === 'attendance' ? 'text-fuchsia-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Attendance</span>
          </button>

          <button
            onClick={() => setMobileTab('leaves')}
            className={`py-1.5 flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
              mobileTab === 'leaves' ? 'text-fuchsia-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Leaves/Duty</span>
          </button>

          <button
            onClick={() => setMobileTab('profile')}
            className={`py-1.5 flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
              mobileTab === 'profile' ? 'text-fuchsia-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">ID / Assets</span>
          </button>
        </div>
      </nav>

      {/* MODAL: APPLY LEAVE */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-400" />
                <span>Apply for Leave</span>
              </h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {leaveSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="font-bold text-white text-base">Leave Request Submitted!</h4>
                <p className="text-xs text-slate-400">Submitted to HR and Management for review and approval.</p>
              </div>
            ) : (
              <form onSubmit={handleApplyLeave} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Leave Type *</label>
                  <select
                    value={leaveType}
                    onChange={e => setLeaveType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  >
                    <option value="Casual Leave">Casual Leave (Paid)</option>
                    <option value="Sick Leave">Sick Leave (Paid)</option>
                    <option value="Annual / Festival Leave">Annual / Festival Leave</option>
                    <option value="Unpaid Leave (LWP)">Unpaid Leave (LWP)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={leaveStartDate}
                      onChange={e => setLeaveStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={leaveEndDate}
                      onChange={e => setLeaveEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Reason *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="State the reason for taking leave..."
                    value={leaveReason}
                    onChange={e => setLeaveReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsLeaveModalOpen(false)}
                    className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: APPLY FIELD DUTY / WFH */}
      {isFdModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Field Duty / Work From Home (WFH)</span>
              </h3>
              <button onClick={() => setIsFdModalOpen(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {fdSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="font-bold text-white text-base">Field Duty Submitted!</h4>
                <p className="text-xs text-slate-400">Attendance will be recorded once approved by manager.</p>
              </div>
            ) : (
              <form onSubmit={handleApplyFieldDuty} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Duty Type *</label>
                  <select
                    value={fdType}
                    onChange={e => setFdType(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  >
                    <option value="FIELD_VISIT">Field Visit (Shooting / Outdoor)</option>
                    <option value="CLIENT_MEETING">Client Meeting</option>
                    <option value="WORK_FROM_HOME">Work From Home (WFH)</option>
                    <option value="OFFICIAL_TOUR">Official Tour</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={fdDate}
                    onChange={e => setFdDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Location / Site Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Parliament / Pokhara / Home"
                    value={fdLocation}
                    onChange={e => setFdLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Work Purpose *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Briefly describe key tasks to be performed..."
                    value={fdPurpose}
                    onChange={e => setFdPurpose(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsFdModalOpen(false)}
                    className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Non-intrusive Install Toast */}
      {installNotice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-sm w-11/12 bg-slate-900/95 border border-purple-500/60 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-fuchsia-400 shrink-0" />
          <span className="text-xs font-medium text-slate-200">{installNotice}</span>
        </div>
      )}
    </div>
  );
}
