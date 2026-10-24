'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { initialEmployees, generateTodayAttendance, initialAssets, initialFieldDutyRequests } from '@/lib/mock-data';
import { Employee, CompanyAsset, LeaveRequest, FieldDutyRequest, DailyAttendance, PayrollRecord, UserRole } from '@/lib/types';
import { 
  getNepaliDate, 
  NEPALI_MONTHS_NP, 
  NEPALI_MONTHS_EN, 
  toNepaliDigits, 
  getDaysInBsMonth, 
  bsToAd 
} from '@/lib/nepali-date';
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
  Send,
  MessageSquare,
  Users,
  Megaphone,
  Pin,
  Trash2,
  ThumbsUp,
  Timer,
  ArrowUpDown
} from 'lucide-react';
import { generatePayslipPdf } from '@/lib/pdf/payslip-generator';

export default function StaffPortalPage() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_staff_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((p: any) => String(p.biometric_pin) !== '999' && !p.is_master_admin && p.id !== 'emp-master');
          }
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

  useEffect(() => {
    document.title = "Staff Portal";
  }, []);

  // Auth Modes: 'login' | 'signup' | 'forgot_password'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot_password'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [notRegisteredStaff, setNotRegisteredStaff] = useState<Employee | null>(null);
  const [signupAwaitingApproval, setSignupAwaitingApproval] = useState<{ pin: string; staffName: string; phone: string } | null>(null);

  // Signup form state
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [signupPin, setSignupPin] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPhotoUrl, setSignupPhotoUrl] = useState('');
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

  // Client-side photo compressor for registration (one-time upload)
  const handleSignupPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSignupError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setSignupPhotoUrl(compressed);
          setSignupError('');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [photoUploadMsg, setPhotoUploadMsg] = useState<string | null>(null);

  // Client-side photo updater for logged-in staff profile
  const handleUpdateProfilePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeEmployee) return;

    if (!file.type.startsWith('image/')) {
      alert('कृपया मान्य तस्विर (JPG, PNG, WebP) छान्नुहोस्।');
      return;
    }

    setIsUpdatingPhoto(true);
    setPhotoUploadMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);

          try {
            const cleanPin = String(activeEmployee.biometric_pin || activePin);
            const res = await fetch('/api/staff', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'update_profile_photo',
                pin: cleanPin,
                photo_url: compressed
              })
            });

            if (res.ok) {
              // Update local state across employees
              const updated = employees.map(emp =>
                String(emp.biometric_pin) === cleanPin || emp.id === activeEmployee.id
                  ? { ...emp, photo_url: compressed }
                  : emp
              );
              setEmployees(updated);
              if (typeof window !== 'undefined') {
                localStorage.setItem('goinfi_staff_list', JSON.stringify(updated));

                // Also update any saved credentials
                try {
                  const creds = getStoredCredentials();
                  if (creds[cleanPin]) {
                    creds[cleanPin].photo_url = compressed;
                    localStorage.setItem('goinfi_staff_credentials', JSON.stringify(creds));
                  }
                } catch (e) {}

                // Also update existing attendance records with this photo
                try {
                  const savedAtt = localStorage.getItem('goinfi_attendance_records');
                  if (savedAtt) {
                    const parsedAtt = JSON.parse(savedAtt);
                    if (Array.isArray(parsedAtt)) {
                      const updatedAtt = parsedAtt.map((r: any) =>
                        String(r.employee_pin) === cleanPin
                          ? { ...r, employee_photo: compressed }
                          : r
                      );
                      localStorage.setItem('goinfi_attendance_records', JSON.stringify(updatedAtt));
                    }
                  }
                } catch (e) {}
              }
              setPhotoUploadMsg('✓ तस्विर सफलतापूर्वक सेभ भयो! यो अब Admin HRMS तथा Digital ID दुवैमा देखिनेछ।');
              setTimeout(() => setPhotoUploadMsg(null), 4000);
            } else {
              alert('तस्विर सेभ गर्न सकिएन। कृपया पुनः प्रयास गर्नुहोस्।');
            }
          } catch (err) {
            alert('तस्विर अपलोड गर्न समस्या आयो।');
          } finally {
            setIsUpdatingPhoto(false);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Centralized registrations fetched from server to enforce one-time signup limit
  const [serverRegistrations, setServerRegistrations] = useState<any[]>([]);

  // Sync staff directory and registrations from backend API with real-time polling
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch(`/api/staff?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.staff) && data.staff.length > 0) {
            setEmployees(data.staff);
            if (typeof window !== 'undefined') {
              localStorage.setItem('goinfi_staff_list', JSON.stringify(data.staff));
            }
          }
          if (data.success && Array.isArray(data.registrations)) {
            setServerRegistrations(data.registrations);

            // Update any locally stored credentials that were approved on server
            const creds = getStoredCredentials();
            let credsChanged = false;
            data.registrations.forEach((r: any) => {
              const pinKey = String(r.pin).trim();
              if (r.status === 'APPROVED' && creds[pinKey] && creds[pinKey].status !== 'APPROVED') {
                creds[pinKey].status = 'APPROVED';
                credsChanged = true;
              }
            });
            if (credsChanged && typeof window !== 'undefined') {
              localStorage.setItem('goinfi_staff_credentials', JSON.stringify(creds));
            }

            // Real-time auto-login if waiting for approval
            if (signupAwaitingApproval?.pin) {
              const waitingPin = String(signupAwaitingApproval.pin).trim();
              const myReg = data.registrations.find((r: any) => String(r.pin) === waitingPin);
              if (myReg && myReg.status === 'APPROVED') {
                // Auto-login staff the second HR approves!
                saveStoredCredential({
                  pin: waitingPin,
                  phone: myReg.phone || signupAwaitingApproval.phone,
                  password: myReg.password,
                  staffName: myReg.staffName || signupAwaitingApproval.staffName,
                  photo_url: myReg.photo_url || '',
                  registeredAt: myReg.registeredAt || new Date().toISOString(),
                  status: 'APPROVED'
                });
                setSignupAwaitingApproval(null);
                setLoginError('');
                if (typeof window !== 'undefined') {
                  localStorage.setItem('goinfi_portal_user_pin', waitingPin);
                }
                setActivePin(waitingPin);
                return;
              }
            }

            // Active session remains fully preserved across reloads and pull-to-refresh
          }
        }
      } catch (err) {
        console.warn('Could not fetch staff from /api/staff:', err);
      }
    };

    fetchStaff();
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchStaff();
    }, 60000); // 60s interval, pauses when tab is inactive
    return () => clearInterval(pollInterval);
  }, [activePin, signupAwaitingApproval]);

  // Credentials storage helper
  interface StaffAuthCredential {
    pin: string;
    phone: string;
    password: string;
    staffName: string;
    photo_url?: string;
    registeredAt: string;
    status?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
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

  // Helper to check if staff is already registered (either locally or on server)
  const checkIsStaffAlreadyRegistered = (pin: string | number) => {
    if (!pin) return null;
    const pinStr = String(pin).trim();
    const serverReg = serverRegistrations.find(r => String(r.pin) === pinStr);
    if (serverReg && (serverReg.status === 'APPROVED' || serverReg.status === 'PENDING_APPROVAL')) {
      return serverReg;
    }
    const creds = getStoredCredentials();
    const localCred = creds[pinStr];
    if (localCred && (localCred.status === 'APPROVED' || localCred.status === 'PENDING_APPROVAL')) {
      return localCred;
    }
    return null;
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

  // Active Employee lookup (robust against reload & refresh)
  const activeEmployee: Employee | null = employees.find(
    e => String(e.biometric_pin).trim() === String(activePin).trim() || 
         String(e.id).trim() === String(activePin).trim() ||
         (String(activePin).trim() === '1' && (String(e.biometric_pin).trim() === '100' || e.full_name.toLowerCase().includes('gift')))
  ) || (
    activePin ? {
      id: `emp-${activePin}`,
      biometric_pin: activePin,
      full_name: activePin === '1' || activePin === '100' ? 'Gift Risal' : `Staff ${activePin}`,
      email: 'admin@ap1hdtv.com',
      phone: '+977-9851355569',
      photo_url: '',
      department_id: 'dept-6',
      department_name: 'Operations & Broadcasting',
      shift_id: 'shift-1',
      shift_name: 'Morning Broadcast',
      designation: activePin === '1' || activePin === '100' ? 'HRMS Manager / Lead' : 'Staff Member',
      role: 'admin' as UserRole,
      status: 'active' as const,
      join_date: '2026-01-01',
      base_salary: 85000
    } : null
  );

  // Selected signup employee lookup
  const selectedSignupEmp: Employee | null = employees.find(
    e => e.biometric_pin === signupPin
  ) || null;

  // Selected reset employee lookup
  const selectedResetEmp: Employee | null = employees.find(
    e => e.biometric_pin === resetPin
  ) || null;

  // Auto-populate phone and photo when staff is selected during signup (with strict 1-time check)
  const handleSelectSignupStaff = (pin: string) => {
    setSignupPin(pin);
    setSignupError('');
    if (!pin) return;

    const emp = employees.find(e => e.biometric_pin === pin);
    if (emp) {
      const existing = checkIsStaffAlreadyRegistered(pin);
      if (existing) {
        if (existing.status === 'APPROVED') {
          setSignupError(`Staff member ${emp.full_name} (PIN #${pin}) is ALREADY REGISTERED and approved. One-time signup limit applies. Please click "Back to Login" to sign in.`);
        } else {
          setSignupError(`Registration for ${emp.full_name} (PIN #${pin}) has already been submitted and is waiting for HR Admin approval. Duplicate registration is not allowed.`);
        }
        return;
      }

      const digits = (emp.phone || '').replace(/[^0-9]/g, '');
      const clean = digits.startsWith('977') && digits.length === 13 ? digits.substring(3) : digits;
      // If it looks like a placeholder, don't pre-fill or pre-fill with editable 98...
      if (clean && clean.startsWith('98') && !clean.startsWith('980000000')) {
        setSignupPhone(clean);
      } else {
        setSignupPhone('');
      }

      // Check for existing photo
      if (emp.photo_url && !emp.photo_url.includes('unsplash')) {
        setSignupPhotoUrl(emp.photo_url);
      } else {
        setSignupPhotoUrl('');
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
  const handleLogin = async (e: React.FormEvent) => {
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

    const cleanPin = String(emp.biometric_pin);
    const isMasterAdmin = cleanPin === '1';

    const creds = getStoredCredentials();
    let cred = creds[cleanPin];

    // Check live registration status from server API with fresh timestamp
    setLoginLoading(true);
    let serverReg: any = null;
    try {
      const statusRes = await fetch(`/api/staff?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ action: 'check_registration', pin: cleanPin })
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.registration) {
          serverReg = statusData.registration;
        }
      }
    } catch (err) {
      console.warn('Could not verify registration with server API:', err);
    } finally {
      setLoginLoading(false);
    }

    // Only Master Admin (PIN 1) is pre-approved by system default
    const isPreApproved = cleanPin === '1';
    const defaultPassword = cleanPin === '1' ? 'Gift@AP1#2026' : '';

    // Check if staff has already signed up
    if (!cred && !serverReg && !isMasterAdmin && !isPreApproved) {
      setNotRegisteredStaff(emp);
      setLoginError(`PIN #${cleanPin} (${emp.full_name}) has not registered yet. Please create a new account first.`);
      return;
    }

    // Evaluate approval status - server is single source of truth
    const isApprovedOnServer = serverReg?.status === 'APPROVED';
    const approvalStatus = isMasterAdmin ? 'APPROVED' : (isApprovedOnServer ? 'APPROVED' : (serverReg?.status || (cred?.status === 'APPROVED' ? 'APPROVED' : 'PENDING_APPROVAL')));

    if (isApprovedOnServer && cred && cred.status !== 'APPROVED') {
      cred.status = 'APPROVED';
      saveStoredCredential({
        ...cred,
        status: 'APPROVED'
      });
    }

    if (!isMasterAdmin && approvalStatus !== 'APPROVED') {
      if (approvalStatus === 'REJECTED') {
        setLoginError(`❌ दर्ता अस्वीकृत (Rejected): तपाईंको दर्ता अनुरोध HR / Admin द्वारा अस्वीकृत भएको छ। कृपया प्रशासनसँग सम्पर्क गर्नुहोस्।`);
      } else {
        setLoginError(`⏳ अनुमोदन पर्खाइमा (Pending Approval): ${emp.full_name} (PIN #${cleanPin}) को खाता हाल HR / Admin को स्वीकृति (Approval) को पर्खाइमा छ। HR ले अनुमोदन गरेपछि मात्र लगइन हुनेछ।`);
      }
      return;
    }

    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    const expectedPassword = cred?.password || serverReg?.password || defaultPassword;
    const isSpecialMatch = cleanPin === '1' && (loginPassword === 'Gift@AP1#2026' || loginPassword === 'admin123');

    if (expectedPassword && expectedPassword !== loginPassword && !isSpecialMatch) {
      setLoginError('Incorrect password! Please enter the correct password or click "Forgot Password?" below.');
      return;
    }

    // Update stored local credentials if server had fresher status
    saveStoredCredential({
      pin: cleanPin,
      phone: serverReg?.phone || emp.phone,
      password: serverReg?.password || cred?.password || loginPassword,
      staffName: serverReg?.staffName || emp.full_name,
      registeredAt: serverReg?.registeredAt || new Date().toISOString(),
      status: 'APPROVED'
    });

    // Login successful
    setActivePin(cleanPin);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_portal_user_pin', cleanPin);
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

    // Hard one-time registration limit check
    const existing = checkIsStaffAlreadyRegistered(signupPin);
    if (existing) {
      if (existing.status === 'APPROVED') {
        setSignupError(`Staff member ${emp.full_name} (PIN #${signupPin}) is ALREADY REGISTERED and approved. Each staff is strictly limited to ONE-TIME signup. Please click "Back to Login".`);
      } else {
        setSignupError(`Registration for ${emp.full_name} (PIN #${signupPin}) has already been submitted and is waiting for HR approval. Duplicate registration is blocked.`);
      }
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

      const cleanPin = String(emp.biometric_pin);
      const isMasterAdmin = cleanPin === '1';
      const photoToSave = signupPhotoUrl || emp.photo_url || '';

      // Submit registration request to centralized staff database
      const regRes = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_registration',
          registration: {
            pin: cleanPin,
            phone: `+977-${cleanPhone}`,
            password: signupPassword,
            staffName: emp.full_name,
            department_name: emp.department_name,
            designation: emp.designation,
            photo_url: photoToSave,
            registeredAt: new Date().toISOString()
          }
        })
      });

      const regData = await regRes.json();
      if (!regRes.ok || !regData.success) {
        throw new Error(regData.error || 'Registration failed. Staff may already be registered.');
      }

      if (regData.registrations && Array.isArray(regData.registrations)) {
        setServerRegistrations(regData.registrations);
      }

      // Save credentials in local storage
      saveStoredCredential({
        pin: cleanPin,
        phone: cleanPhone,
        password: signupPassword,
        staffName: emp.full_name,
        photo_url: photoToSave,
        registeredAt: new Date().toISOString(),
        status: isMasterAdmin ? 'APPROVED' : 'PENDING_APPROVAL'
      });

      // Update employee record with confirmed phone number & uploaded photo
      const updatedEmps = employees.map(item =>
        item.biometric_pin === emp.biometric_pin 
          ? { ...item, phone: `+977-${cleanPhone}`, ...(photoToSave ? { photo_url: photoToSave } : {}) } 
          : item
      );
      setEmployees(updatedEmps);
      if (typeof window !== 'undefined') {
        localStorage.setItem('goinfi_staff_list', JSON.stringify(updatedEmps));
      }

      if (isMasterAdmin) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('goinfi_portal_user_pin', cleanPin);
        }
        setActivePin(cleanPin);
        setAuthMode('login');
        setSignupStep(1);
      } else {
        // Non-admin staff requires Admin approval
        setSignupAwaitingApproval({
          pin: cleanPin,
          staffName: emp.full_name,
          phone: cleanPhone
        });
        setAuthMode('login');
        setSignupStep(1);
      }
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

  // Mobile Tabs: 'home' | 'attendance' | 'leaves' | 'chat' | 'profile'
  const [mobileTab, setMobileTab] = useState<'home' | 'attendance' | 'leaves' | 'chat' | 'profile'>('home');

  // Staff Group Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [chatMsgType, setChatMsgType] = useState<'normal' | 'urgent' | 'announcement'>('normal');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatFilter, setChatFilter] = useState<'all' | 'announcements'>('all');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const lastSeenChatIdRef = useRef<string | null>(null);

  // Load & Poll Chat Messages
  const fetchChatMessages = async (silent = false) => {
    try {
      if (!silent) setChatLoading(true);
      const res = await fetch(`/api/chat?limit=100&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setChatMessages(data.messages);
          if (mobileTab === 'chat') {
            setUnreadChatCount(0);
            if (data.messages.length > 0) {
              const lastId = data.messages[data.messages.length - 1].id;
              lastSeenChatIdRef.current = lastId;
              try { localStorage.setItem('ap1_last_seen_chat_id', lastId); } catch {}
            }
          } else {
            const savedLastId = typeof window !== 'undefined' ? localStorage.getItem('ap1_last_seen_chat_id') : null;
            if (savedLastId) {
              const lastIdx = data.messages.findIndex((m: any) => m.id === savedLastId);
              if (lastIdx !== -1) {
                const unread = data.messages.length - 1 - lastIdx;
                setUnreadChatCount(Math.max(0, unread));
              }
            } else if (data.messages.length > 0) {
              setUnreadChatCount(Math.min(5, data.messages.length));
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to poll chat:', err);
    } finally {
      if (!silent) setChatLoading(false);
    }
  };

  useEffect(() => {
    if (!activeEmployee) return;
    fetchChatMessages();
    const intervalTime = mobileTab === 'chat' ? 3500 : 25000;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchChatMessages(true);
    }, intervalTime);
    return () => clearInterval(interval);
  }, [activeEmployee, mobileTab]);

  useEffect(() => {
    if (mobileTab === 'chat' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, mobileTab]);

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeEmployee || !chatInputText.trim() || chatSending) return;

    const textToSend = chatInputText.trim();
    setChatSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderPin: activeEmployee.biometric_pin,
          senderName: activeEmployee.full_name,
          senderRole: activeEmployee.role || 'staff',
          department: activeEmployee.department_name || 'AP1 Staff',
          photoUrl: activeEmployee.photo_url || '',
          text: textToSend,
          type: chatMsgType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          setChatInputText('');
          setChatMsgType('normal');
          setChatMessages(prev => [...prev, data.message]);
          lastSeenChatIdRef.current = data.message.id;
          try { localStorage.setItem('ap1_last_seen_chat_id', data.message.id); } catch {}
          setUnreadChatCount(0);
          setTimeout(() => {
            if (chatScrollRef.current) {
              chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
            }
          }, 100);
        }
      }
    } catch (err) {
      console.error('Failed to send chat message:', err);
    } finally {
      setChatSending(false);
    }
  };

  const handleToggleChatLike = async (messageId: string) => {
    if (!activeEmployee) return;
    const pin = activeEmployee.biometric_pin;
    setChatMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const set = new Set(m.likes || []);
      if (set.has(pin)) set.delete(pin);
      else set.add(pin);
      return { ...m, likes: Array.from(set) };
    }));

    try {
      await fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, pin, action: 'toggle_like' })
      });
    } catch (err) {
      console.error('Like toggle failed:', err);
    }
  };

  const handleDeleteChatMessage = async (messageId: string) => {
    if (!activeEmployee) return;
    if (!confirm('के तपाईं यो सन्देश च्याटबाट मेटाउन निश्चित हुनुहुन्छ? (Delete message?)')) return;
    
    setChatMessages(prev => prev.filter(m => m.id !== messageId));

    try {
      await fetch(`/api/chat?id=${messageId}&pin=${activeEmployee.biometric_pin}&isAdmin=${activeEmployee.role === 'admin'}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Delete message failed:', err);
    }
  };

  // Real Biometric Machine Attendance State
  interface StaffDailyDuty {
    date: string;
    nepaliDate: string;
    dayOfWeek: string;
    dayOfWeekNepali: string;
    inTime: string | null;
    rawInTime: string | null;
    outTime: string | null;
    rawOutTime: string | null;
    totalDutyHours: number;
    totalDutyFormatted: string;
    status: 'DUTY_MET' | 'DUTY_SHORT' | 'IN_OFFICE' | 'HALF_DAY' | 'ABSENT' | 'UPCOMING';
    isToday: boolean;
    dutyMet: boolean;
    shortfallHours: number;
    punchesCount: number;
  }

  const [todayPunch, setTodayPunch] = useState<{
    hasPunched: boolean;
    inTime: string | null;
    outTime: string | null;
    status: 'DUTY_MET' | 'DUTY_SHORT' | 'IN_OFFICE' | 'NOT_PUNCHED';
    shift: string;
    totalPunchesToday: number;
    totalDutyFormatted?: string;
  }>({
    hasPunched: false,
    inTime: null,
    outTime: null,
    status: 'NOT_PUNCHED',
    shift: 'AP1 Shift (Broadcasting / Operations)',
    totalPunchesToday: 0,
    totalDutyFormatted: '--'
  });

  const [myRecentPunches, setMyRecentPunches] = useState<any[]>([]);
  const [myDailyAttendance, setMyDailyAttendance] = useState<StaffDailyDuty[]>([]);
  const [attendanceViewMode, setAttendanceViewMode] = useState<'daily' | 'raw'>('daily');
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Poll /api/biometric/sync for real-time punches of this logged-in staff member
  useEffect(() => {
    if (!activeEmployee) return;

    const fetchBiometricAttendance = async () => {
      try {
        setAttendanceLoading(true);
        const res = await fetch(`/api/biometric/sync?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();

        if (Array.isArray(data.recent_logs)) {
          const pin = String(activeEmployee.biometric_pin || '').trim();

          // Filter logs belonging to this employee (with support for pin 1/100 alias)
          const myLogs = data.recent_logs.filter((l: any) => {
            const lPin = String(l.user_id || l.biometric_pin || '').trim();
            return lPin === pin || (pin === '100' && lPin === '1') || (pin === '1' && lPin === '100');
          }).sort((a: any, b: any) => (b.punch_time || '').localeCompare(a.punch_time || ''));

          setMyRecentPunches(myLogs.slice(0, 50));

          // Today's date in YYYY-MM-DD
          const todayStr = new Date().toISOString().split('T')[0];

          const formatTime = (timeStr?: string | null) => {
            if (!timeStr) return '-- : --';
            try {
              const d = new Date(timeStr);
              return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            } catch {
              return timeStr;
            }
          };

          // Group all logs by date YYYY-MM-DD
          const logsByDate = new Map<string, any[]>();
          myLogs.forEach((l: any) => {
            const rawTime = l.punch_time || '';
            const punchDate = rawTime.includes('T') ? rawTime.split('T')[0] : rawTime.split(' ')[0];
            if (!punchDate) return;
            if (!logsByDate.has(punchDate)) {
              logsByDate.set(punchDate, []);
            }
            logsByDate.get(punchDate)!.push(l);
          });

          // Also merge any saved attendance records from primary system for this pin
          try {
            const savedAtt = typeof window !== 'undefined' ? localStorage.getItem('goinfi_attendance_records') : null;
            if (savedAtt) {
              const parsedAtt = JSON.parse(savedAtt);
              if (Array.isArray(parsedAtt)) {
                parsedAtt.forEach((rec: any) => {
                  const recPin = String(rec.employee_pin || '').trim();
                  if (recPin === pin || (pin === '100' && recPin === '1') || (pin === '1' && recPin === '100')) {
                    const rDate = rec.date ? rec.date.split('T')[0].split(' ')[0] : '';
                    if (rDate && !logsByDate.has(rDate) && (rec.in_time || rec.out_time)) {
                      const dummyLogs: any[] = [];
                      if (rec.in_time) dummyLogs.push({ punch_time: rec.in_time, punch_type: 'Check-In' });
                      if (rec.out_time) dummyLogs.push({ punch_time: rec.out_time, punch_type: 'Check-Out' });
                      if (dummyLogs.length > 0) logsByDate.set(rDate, dummyLogs);
                    }
                  }
                });
              }
            }
          } catch {}

          const dailyList: StaffDailyDuty[] = [];
          const sortedDates = Array.from(logsByDate.keys()).sort((a, b) => b.localeCompare(a));

          sortedDates.forEach(dateStr => {
            const dayLogs = logsByDate.get(dateStr)!.sort((a, b) => (a.punch_time || '').localeCompare(b.punch_time || ''));
            const isToday = dateStr === todayStr;

            const firstIn = dayLogs[0].punch_time;
            const lastOut = dayLogs.length > 1 ? dayLogs[dayLogs.length - 1].punch_time : null;

            let inTimeStr = formatTime(firstIn);
            let outTimeStr: string | null = null;
            let totalDutyHours = 0;
            let totalDutyFormatted = '--';
            let status: 'DUTY_MET' | 'DUTY_SHORT' | 'IN_OFFICE' | 'HALF_DAY' | 'ABSENT' | 'UPCOMING' = 'DUTY_SHORT';
            let dutyMet = false;
            let shortfallHours = 8;

            if (lastOut && lastOut !== firstIn) {
              outTimeStr = formatTime(lastOut);
              const diffMs = new Date(lastOut).getTime() - new Date(firstIn).getTime();
              if (diffMs > 0) {
                totalDutyHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                totalDutyFormatted = `${hours}h ${mins}m (${totalDutyHours} hrs)`;
                if (totalDutyHours >= 8) {
                  status = 'DUTY_MET';
                  dutyMet = true;
                  shortfallHours = 0;
                } else {
                  status = 'DUTY_SHORT';
                  dutyMet = false;
                  shortfallHours = Math.round((8 - totalDutyHours) * 10) / 10;
                }
              }
            } else if (isToday) {
              status = 'IN_OFFICE';
              const diffMs = Date.now() - new Date(firstIn).getTime();
              if (diffMs > 0) {
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                totalDutyFormatted = `${hours}h ${mins}m (चालु/In Office)`;
              }
            } else {
              totalDutyFormatted = 'Single Punch';
              status = 'DUTY_SHORT';
            }

            // Nepali date and day of week
            let nepaliDateStr = '';
            let dayOfWeekEn = '';
            let dayOfWeekNp = '';
            try {
              const dObj = new Date(dateStr + 'T00:00:00');
              nepaliDateStr = getNepaliDate(dObj).formattedNp;
              const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const daysNp = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
              dayOfWeekEn = daysEn[dObj.getDay()];
              dayOfWeekNp = daysNp[dObj.getDay()];
            } catch {}

            const item: StaffDailyDuty = {
              date: dateStr,
              nepaliDate: nepaliDateStr,
              dayOfWeek: dayOfWeekEn,
              dayOfWeekNepali: dayOfWeekNp,
              inTime: inTimeStr,
              rawInTime: firstIn,
              outTime: outTimeStr,
              rawOutTime: lastOut,
              totalDutyHours,
              totalDutyFormatted,
              status,
              isToday,
              dutyMet,
              shortfallHours,
              punchesCount: dayLogs.length
            };

            dailyList.push(item);
          });

          setMyDailyAttendance(dailyList);

          const todayEntry = dailyList.find(d => d.isToday);

          if (todayEntry) {
            setTodayPunch({
              hasPunched: true,
              inTime: todayEntry.inTime,
              outTime: todayEntry.outTime,
              status: todayEntry.status === 'DUTY_MET' ? 'DUTY_MET' : todayEntry.outTime ? 'DUTY_SHORT' : 'IN_OFFICE',
              shift: 'AP1 Shift (Broadcasting / Operations)',
              totalPunchesToday: todayEntry.punchesCount,
              totalDutyFormatted: todayEntry.totalDutyFormatted
            });
          } else {
            setTodayPunch({
              hasPunched: false,
              inTime: null,
              outTime: null,
              status: 'NOT_PUNCHED',
              shift: 'AP1 Shift (Broadcasting / Operations)',
              totalPunchesToday: 0,
              totalDutyFormatted: '--'
            });
          }
        }
      } catch (err) {
        console.error('Error fetching biometric punches:', err);
      } finally {
        setAttendanceLoading(false);
      }
    };

    fetchBiometricAttendance();
    const interval = setInterval(fetchBiometricAttendance, 30000);
    return () => clearInterval(interval);
  }, [activeEmployee]);

  // Nepali Calendar (Bikram Sambat) Monthly Duty State
  const todayBs = useMemo(() => getNepaliDate(new Date()), []);
  const [selectedBsYear, setSelectedBsYear] = useState<number>(() => getNepaliDate(new Date()).bsYear);
  const [selectedBsMonth, setSelectedBsMonth] = useState<number>(() => getNepaliDate(new Date()).bsMonth);
  const [dutySortAsc, setDutySortAsc] = useState<boolean>(true); // default true: 1, 2, 3, 4, 5, 6... (Ascending)

  // Nepali Calendar Monthly Duty Summary Calculation:
  // Rules: Daily 8 hrs duty, Monthly target = daysCount * 8 hrs
  const monthlyDutySummary = useMemo(() => {
    const daysCount = getDaysInBsMonth(selectedBsYear, selectedBsMonth);
    const isCurrentMonth = selectedBsYear === todayBs.bsYear && selectedBsMonth === todayBs.bsMonth;
    const currentElapsedDay = isCurrentMonth ? todayBs.bsDay : daysCount;

    // Fast lookup map for punches by AD date
    const attMap = new Map<string, StaffDailyDuty>();
    myDailyAttendance.forEach(a => attMap.set(a.date, a));

    const monthDaysList: Array<{
      bsDay: number;
      bsDateStr: string;
      nepaliFullDate: string;
      adDateStr: string;
      dayNameNp: string;
      dayNameEn: string;
      isPastOrToday: boolean;
      isToday: boolean;
      inTime: string | null;
      outTime: string | null;
      dutyHours: number;
      dutyFormatted: string;
      status: 'DUTY_MET' | 'DUTY_SHORT' | 'IN_OFFICE' | 'HALF_DAY' | 'ABSENT' | 'UPCOMING';
      punchesCount: number;
    }> = [];

    for (let day = 1; day <= daysCount; day++) {
      const adDateObj = bsToAd(selectedBsYear, selectedBsMonth, day);
      const adDateStr = adDateObj.toISOString().split('T')[0];
      const dayOfWeekIdx = adDateObj.getDay();
      const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const daysNp = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
      const dayNameEn = daysEn[dayOfWeekIdx];
      const dayNameNp = daysNp[dayOfWeekIdx];

      const isPastOrToday = isCurrentMonth ? day <= todayBs.bsDay : (selectedBsYear < todayBs.bsYear || (selectedBsYear === todayBs.bsYear && selectedBsMonth < todayBs.bsMonth));
      const isToday = isCurrentMonth && day === todayBs.bsDay;

      const existingPunch = attMap.get(adDateStr);
      let inTime: string | null = null;
      let outTime: string | null = null;
      let dutyHours = 0;
      let dutyFormatted = '--';
      let status: 'DUTY_MET' | 'DUTY_SHORT' | 'IN_OFFICE' | 'HALF_DAY' | 'ABSENT' | 'UPCOMING' = 'UPCOMING';
      let punchesCount = 0;

      if (existingPunch) {
        inTime = existingPunch.inTime;
        outTime = existingPunch.outTime;
        dutyHours = existingPunch.totalDutyHours;
        dutyFormatted = existingPunch.totalDutyFormatted;
        punchesCount = existingPunch.punchesCount;

        if (isToday && !outTime && inTime) {
          status = 'IN_OFFICE';
        } else if (dutyHours >= 8) {
          status = 'DUTY_MET'; // ड्युटी पुगेको (८h+)
        } else {
          status = 'DUTY_SHORT'; // ड्युटी नपुगेको (<८h)
        }
      } else {
        if (isPastOrToday) {
          status = 'ABSENT';
        } else {
          status = 'UPCOMING';
        }
      }

      const bsDayPadded = String(day).padStart(2, '0');
      const bsMonthPadded = String(selectedBsMonth).padStart(2, '0');
      const bsDateStr = `${toNepaliDigits(selectedBsYear)}/${toNepaliDigits(bsMonthPadded)}/${toNepaliDigits(bsDayPadded)}`;
      const nepaliFullDate = `${toNepaliDigits(selectedBsYear)} ${NEPALI_MONTHS_NP[selectedBsMonth - 1]} ${toNepaliDigits(day)}`;

      monthDaysList.push({
        bsDay: day,
        bsDateStr,
        nepaliFullDate,
        adDateStr,
        dayNameNp,
        dayNameEn,
        isPastOrToday,
        isToday,
        inTime,
        outTime,
        dutyHours,
        dutyFormatted,
        status,
        punchesCount
      });
    }

    // Rules: daily 8 hrs duty, monthly target = daysCount * 8 hrs
    const monthlyRequiredWorkingHours = daysCount * 8; // e.g. 30 * 8 = 240 hrs

    // Actual worked hours in this selected Nepali month
    const actualWorkedHours = Math.round(monthDaysList.reduce((acc, d) => acc + d.dutyHours, 0) * 10) / 10;
    const presentDaysCount = monthDaysList.filter(d => d.dutyHours > 0 || d.status === 'DUTY_MET' || d.status === 'DUTY_SHORT' || d.status === 'IN_OFFICE').length;
    const dutyMetCount = monthDaysList.filter(d => d.status === 'DUTY_MET').length;
    const dutyShortCount = monthDaysList.filter(d => d.status === 'DUTY_SHORT').length;
    const absentDaysCount = monthDaysList.filter(d => d.status === 'ABSENT').length;

    // Target up to today (for current month vs past month)
    const elapsedDays = Math.min(daysCount, currentElapsedDay);
    const targetHoursTillToday = isCurrentMonth ? (elapsedDays * 8) : monthlyRequiredWorkingHours;

    // Pace difference (today's pace):
    const paceDifference = Math.round((actualWorkedHours - targetHoursTillToday) * 10) / 10;
    const isAheadTillToday = paceDifference >= 0;
    const paceDiffAbs = Math.abs(paceDifference);

    // Remaining hours to complete entire month:
    const remainingMonthlyHours = Math.max(0, Math.round((monthlyRequiredWorkingHours - actualWorkedHours) * 10) / 10);
    const remainingDays = Math.max(0, daysCount - elapsedDays);
    const requiredDailyHoursRemaining = remainingDays > 0 ? (Math.round((remainingMonthlyHours / remainingDays) * 10) / 10) : 0;

    // Percentage
    const completionRate = monthlyRequiredWorkingHours > 0
      ? Math.min(100, Math.round((actualWorkedHours / monthlyRequiredWorkingHours) * 100))
      : 0;

    // Sort by day: ascending (1, 2, 3, 4, 5...) or descending based on dutySortAsc
    const sortedDaysList = [...monthDaysList].sort((a, b) => dutySortAsc ? a.bsDay - b.bsDay : b.bsDay - a.bsDay);

    return {
      monthNameNp: NEPALI_MONTHS_NP[selectedBsMonth - 1] || 'कार्तिक',
      monthNameEn: NEPALI_MONTHS_EN[selectedBsMonth - 1] || 'Kartik',
      bsYear: selectedBsYear,
      bsMonth: selectedBsMonth,
      daysCount,
      monthlyRequiredWorkingHours,
      actualWorkedHours,
      presentDaysCount,
      dutyMetCount,
      dutyShortCount,
      absentDaysCount,
      elapsedDays,
      targetHoursTillToday,
      paceDifference,
      isAheadTillToday,
      paceDiffAbs,
      remainingMonthlyHours,
      remainingDays,
      requiredDailyHoursRemaining,
      completionRate,
      monthDaysList,
      sortedDaysList,
      isCurrentMonth
    };
  }, [selectedBsYear, selectedBsMonth, myDailyAttendance, todayBs, dutySortAsc]);

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
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if running on iOS (iPhone/iPad/Safari) or Android Native App
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      const isIos = /iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua));
      setIsIosDevice(isIos);

      if (localStorage.getItem('ap1_pwa_banner_dismissed') === 'true') {
        setIsBannerDismissed(true);
      }

      // Check if running inside Native Android APK (WebView) or standalone PWA
      const isNativeApp = 
        Boolean((window as any).AndroidBridge) ||
        'AndroidBridge' in window ||
        /wv|WebView|AP1HRMSApp/i.test(ua);

      const isStandalone = 
        isNativeApp ||
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://') ||
        localStorage.getItem('ap1_pwa_installed') === 'true';

      if (isStandalone) {
        setIsAlreadyInstalled(true);
        try { localStorage.setItem('ap1_pwa_installed', 'true'); } catch {}
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
    // 1. If on iOS (iPhone/iPad/Safari), open the visual iOS installation guide
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isIos = /iPhone|iPad|iPod/i.test(ua) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua));
    if (isIos || isIosDevice) {
      setShowIosGuide(true);
      return;
    }

    // 2. Android / Chrome native install prompt
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

    // Fallback: show visual guide modal
    setShowIosGuide(true);
  };

  const renderIosGuideModal = () => {
    if (!showIosGuide) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-slate-900 border border-purple-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 relative text-left max-h-[90vh] overflow-y-auto">
          <button
            type="button"
            onClick={() => setShowIosGuide(false)}
            className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-700 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-600/30 text-white shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">iPhone मा App सेभ गर्ने तरिका</h3>
              <p className="text-[11px] text-purple-300">
                Safari Browser बाट १ मिनेटमै Home Screen मा राख्नुहोस्
              </p>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-2.5 pt-1 text-xs">
            {/* Step 1: Open in Safari if Camera preview */}
            <div className="flex items-start gap-3 p-3 bg-slate-950/80 border border-slate-800 rounded-2xl">
              <div className="w-7 h-7 rounded-xl bg-blue-950 border border-blue-700/60 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0 mt-0.5">
                १
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-xs">Safari Browser मा खोल्नुहोस्</p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  यदि Camera बाट स्क्यान गर्दा एप इन-एप भ्युमा खुलेको भए, तल दायाँ कुनामा रहेको <strong>Safari कम्पास (🧭)</strong> थिचेर Safari मा खोल्नुहोस्।
                </p>
              </div>
            </div>

            {/* Step 2: Tap Share */}
            <div className="flex items-start gap-3 p-3 bg-slate-950/80 border border-slate-800 rounded-2xl">
              <div className="w-7 h-7 rounded-xl bg-purple-950 border border-purple-700/60 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0 mt-0.5">
                २
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span>तलको <strong>Share</strong> आइकन थिच्नुहोस्</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-mono font-bold">
                    ⎋ [↑]
                  </span>
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Safari को सबैभन्दा पुछारको पट्टी (Bottom Toolbar) को बीचमा रहेको <strong>Share (माथितिर फर्केको तिर)</strong> बटनमा ट्याप गर्नुहोस्।
                </p>
              </div>
            </div>

            {/* Step 3: Add to Home Screen */}
            <div className="flex items-start gap-3 p-3 bg-slate-950/80 border border-slate-800 rounded-2xl">
              <div className="w-7 h-7 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0 mt-0.5">
                ३
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-xs flex items-center gap-1.5">
                  <span><strong>"Add to Home Screen"</strong> छान्नुहोस्</span>
                  <span className="inline-flex items-center px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400 text-[10px] font-bold">
                    [+]
                  </span>
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  मेनुलाई थोरै तल स्क्रोल गर्नुहोस् र <strong>"Add to Home Screen"</strong> (वा 'होम स्क्रिनमा थप्नुहोस्') मा क्लिक गर्नुहोस्।
                </p>
              </div>
            </div>

            {/* Step 4: Confirm Add */}
            <div className="flex items-start gap-3 p-3 bg-slate-950/80 border border-slate-800 rounded-2xl">
              <div className="w-7 h-7 rounded-xl bg-fuchsia-950 border border-fuchsia-700/60 flex items-center justify-center text-fuchsia-400 font-bold text-xs shrink-0 mt-0.5">
                ४
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-xs">माथि दायाँको <strong>"Add"</strong> थिच्नुहोस्</p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  माथिल्लो दायाँ कुनामा रहेको <strong>Add</strong> बटन थिच्नुहोस्। अब तपाईंको iPhone को होम स्क्रिनमा <strong>AP1 Staff</strong> एपको आइकन बस्नेछ!
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowIosGuide(false)}
            className="w-full py-3 bg-gradient-to-r from-purple-700 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-900/40 cursor-pointer active:scale-95 transition-transform"
          >
            बुझें, अब सेभ गर्छु (Got It)
          </button>
        </div>
      </div>
    );
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
  const [fdStartTime, setFdStartTime] = useState('09:30');
  const [fdEndTime, setFdEndTime] = useState('18:00');
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

  // Load field duty requests
  const [myDuties, setMyDuties] = useState<FieldDutyRequest[]>([]);
  useEffect(() => {
    if (!activeEmployee) return;
    try {
      const saved = localStorage.getItem('goinfi_field_duties');
      if (saved) {
        const parsed: FieldDutyRequest[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMyDuties(parsed.filter(d => d.employee_id === activeEmployee.id || d.employee_name === activeEmployee.full_name));
        }
      }
    } catch (e) {}
  }, [activeEmployee, fdSuccess]);

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
      start_time: fdStartTime,
      end_time: fdEndTime,
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
      target_monthly_hours: 208.0,
      actual_worked_hours: 208.0,
      shortfall_hours: 0,
      hourly_rate: Number((activeEmployee.base_salary / 208).toFixed(2)),
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
    generatePayslipPdf(mockPayroll, 'AP1 Television');
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
              alt="AP1 Television" 
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
              src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https%3A%2F%2Fhr.ap1hdtv.com%2Fportal"
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
                https://hr.ap1hdtv.com/portal
              </span>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined') {
                    navigator.clipboard.writeText('https://hr.ap1hdtv.com/portal');
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
          🔒 AP1 Television • Powered by Goinfi HRMS
        </p>
      </div>
    );
  }

  // If no staff is currently logged into the mobile app: Show Clean Login / Signup / Reset Screen
  if (!activeEmployee) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col justify-between px-3.5 py-2 sm:px-6 sm:py-4 font-sans safe-top safe-bottom">
        {/* Top Header */}
        <div className="flex items-center justify-between pt-1 sm:pt-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img 
              src="/ap1-logo.png" 
              alt="AP1 Television" 
              className="h-8 sm:h-11 w-auto shrink-0 object-contain drop-shadow" 
              style={{ aspectRatio: '800/339' }} 
            />
            <div className="border-l border-slate-700/80 pl-2 sm:pl-2.5">
              <span className="text-[11px] sm:text-xs font-black tracking-wider text-fuchsia-400 uppercase block">STAFF PORTAL</span>
              <span className="text-[9px] sm:text-[10px] text-purple-300/80">AP1 Television</span>
            </div>
          </div>
          {!isAlreadyInstalled && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 text-white shadow-md shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}
        </div>

        {/* Central Auth Container */}
        <div className="max-w-md w-full mx-auto my-auto py-1 sm:py-3">

          {/* iPhone Quick Save Hint Card */}
          {isIosDevice && !isAlreadyInstalled && (
            <div 
              onClick={() => setShowIosGuide(true)}
              className="mb-3 p-3 bg-gradient-to-r from-purple-950/90 via-slate-900/90 to-purple-950/90 border border-purple-500/60 rounded-2xl flex items-center justify-between gap-2 shadow-xl cursor-pointer hover:border-purple-400 transition-colors animate-pulse"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-700/60 border border-purple-400/50 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Smartphone className="w-5 h-5 text-fuchsia-300" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>iPhone मा App सेभ गर्नुहोस्</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-600 font-bold text-white uppercase">
                      iOS
                    </span>
                  </p>
                  <p className="text-[10px] text-purple-200 mt-0.5">तलको Share [↑] &rarr; "Add to Home Screen"</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-[10px] shrink-0 shadow active:scale-95 transition-transform">
                तरिका हेर्नुहोस् &rarr;
              </span>
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW 1: LOGIN */}
          {/* =============================================================== */}
          {authMode === 'login' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-3 sm:space-y-4">
              <div className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-tr from-purple-700 via-purple-600 to-fuchsia-600 rounded-xl sm:rounded-2xl mx-auto flex items-center justify-center shadow-md shadow-purple-600/30 mb-1.5 sm:mb-2">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-white">Staff Login</h1>
                <p className="text-[11px] sm:text-xs text-purple-200/80 mt-0.5">
                  Sign in securely using your Biometric PIN and password
                </p>
              </div>

              {/* Registration submitted & pending admin approval banner */}
              {signupAwaitingApproval && (
                <div className="p-3 bg-amber-950/70 border border-amber-500/70 rounded-xl sm:rounded-2xl text-xs text-amber-200 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1">
                      <p className="font-bold text-amber-300 text-xs sm:text-sm">Registration Submitted! ⏳</p>
                      <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                        Account for <strong>{signupAwaitingApproval.staffName}</strong> (PIN #{signupAwaitingApproval.pin}) is now waiting for <strong>Admin / HR approval</strong>.
                      </p>
                      <p className="text-[10px] text-emerald-300 mt-1 flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                        <span>Live Sync Active: HR ले Approved गर्नासाथ यो आफैं खुल्नेछ...</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const targetPin = String(signupAwaitingApproval.pin).trim();
                          const res = await fetch(`/api/staff?t=${Date.now()}`, { cache: 'no-store' });
                          const data = await res.json();
                          if (data.success && Array.isArray(data.registrations)) {
                            const r = data.registrations.find((item: any) => String(item.pin) === targetPin);
                            if (r && r.status === 'APPROVED') {
                              saveStoredCredential({
                                pin: targetPin,
                                phone: r.phone || signupAwaitingApproval.phone,
                                password: r.password,
                                staffName: r.staffName || signupAwaitingApproval.staffName,
                                photo_url: r.photo_url || '',
                                registeredAt: r.registeredAt || new Date().toISOString(),
                                status: 'APPROVED'
                              });
                              setSignupAwaitingApproval(null);
                              setLoginError('');
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('goinfi_portal_user_pin', targetPin);
                              }
                              setActivePin(targetPin);
                            } else {
                              alert(`PIN #${targetPin} हाल पनि HR को स्वीकृति पर्खाइमै छ। HR ले "Portal Approvals" बाट Approve गर्नासाथ यो खुल्छ।`);
                            }
                          }
                        } catch (e) {
                          alert('नेटवर्क चेक गर्न सकिएन। कृपया पुन: प्रयास गर्नुहोस्।');
                        }
                      }}
                      className="flex-1 py-1.5 px-3 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer text-center"
                    >
                      🔄 Check Status Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupAwaitingApproval(null)}
                      className="py-1.5 px-3 bg-amber-800/40 hover:bg-amber-800/60 border border-amber-600/50 rounded-lg text-amber-200 font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Error or Alert banner */}
              {loginError && (
                <div className="p-2.5 sm:p-3 bg-red-950/60 border border-red-800/80 rounded-xl sm:rounded-2xl text-xs text-red-300 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium leading-relaxed text-[11px] sm:text-xs">{loginError}</p>
                    </div>
                  </div>
                  {loginError.includes('अनुमोदन पर्खाइमा') && (
                    <button
                      type="button"
                      onClick={async () => {
                        const targetPin = loginIdentifier.trim();
                        if (!targetPin) return;
                        try {
                          const res = await fetch(`/api/staff?t=${Date.now()}`, { cache: 'no-store' });
                          const data = await res.json();
                          if (data.success && Array.isArray(data.registrations)) {
                            const r = data.registrations.find((item: any) => String(item.pin) === targetPin);
                            if (r && r.status === 'APPROVED') {
                              setLoginError('');
                              alert('✓ तपाईंको खाता HR द्वारा स्वीकृत भइसकेको छ! अब पासवर्ड हानेर लगइन गर्नुहोस्।');
                            } else {
                              alert(`PIN #${targetPin} हाल पनि स्वीकृति पर्खाइमै छ।`);
                            }
                          }
                        } catch {}
                      }}
                      className="w-full py-1 px-2.5 bg-purple-700 hover:bg-purple-600 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer text-center"
                    >
                      🔄 अहिले स्वीकृत भयो कि जाँच्नुहोस् (Check Now)
                    </button>
                  )}
                    {notRegisteredStaff && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setSignupStep(1);
                          handleSelectSignupStaff(notRegisteredStaff.biometric_pin);
                          setLoginError('');
                        }}
                        className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold rounded-lg text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Sign Up Now</span>
                      </button>
                    )}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-2.5 sm:space-y-3">
                {/* PIN / Name selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider">
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
                    className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white font-mono font-bold text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all placeholder:text-slate-500"
                  />
                  {/* Quick helper picker */}
                  <div className="mt-1">
                    <select
                      value={loginIdentifier}
                      onChange={e => {
                        setLoginIdentifier(e.target.value);
                        setLoginError('');
                        setNotRegisteredStaff(null);
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-800/60 border border-slate-700/60 rounded-lg text-[10px] sm:text-[11px] text-slate-300 focus:outline-none focus:border-purple-500"
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
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider">
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
                      className="text-[10px] sm:text-[11px] text-fuchsia-400 hover:text-fuchsia-300 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="portal_password_input"
                      name="password"
                      autoComplete="current-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password..."
                      value={loginPassword}
                      onChange={e => {
                        setLoginPassword(e.target.value);
                        setLoginError('');
                      }}
                      className="w-full pl-3 pr-10 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all placeholder:text-slate-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-purple-600/30 transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>{loginLoading ? 'Verifying...' : 'Sign In'}</span>
                  {!loginLoading && <ChevronRight className="w-4 h-4" />}
                </button>
              </form>

              {/* Bottom switch to Sign Up */}
              <div className="pt-2 sm:pt-3 border-t border-slate-800/80 text-center">
                <p className="text-[10px] sm:text-xs text-slate-400 mb-1 sm:mb-1.5">First time using the staff app?</p>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setSignupStep(1);
                    setSignupError('');
                    setSignupSuccess('');
                  }}
                  className="w-full py-2 px-3 bg-purple-950/40 hover:bg-purple-900/50 text-purple-200 hover:text-white rounded-xl text-[11px] sm:text-xs font-semibold border border-purple-800/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Register New Account (Sign Up)</span>
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW 2: SIGN UP */}
          {/* =============================================================== */}
          {authMode === 'signup' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-3 sm:space-y-4">
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
                <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-300 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{signupError}</span>
                  </div>
                  {(signupError.includes('ALREADY REGISTERED') || signupError.includes('already been submitted')) && (
                    <div className="pt-1 border-t border-red-800/60 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setSignupStep(1);
                          setLoginIdentifier(signupPin || '');
                          setSignupError('');
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-700 to-fuchsia-700 hover:from-purple-600 hover:to-fuchsia-600 text-white font-bold rounded-lg text-xs shadow transition-transform active:scale-95 cursor-pointer"
                      >
                        Go to Login &rarr;
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot_password');
                          setResetStep(1);
                          setResetPin(signupPin || '');
                          setSignupError('');
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}
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
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Select Staff or Biometric PIN *
                      </label>
                      <span className="text-[10px] text-purple-300 font-semibold">
                        One-Time Registration Only
                      </span>
                    </div>
                    <select
                      required
                      value={signupPin}
                      onChange={e => handleSelectSignupStaff(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-slate-100 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Select your name ({employees.length} Staff) --</option>
                      {employees.map(emp => {
                        const existing = checkIsStaffAlreadyRegistered(emp.biometric_pin);
                        const isReg = Boolean(existing);
                        return (
                          <option 
                            key={emp.id} 
                            value={emp.biometric_pin}
                            disabled={isReg}
                            className={isReg ? 'text-slate-500 bg-slate-900 line-through' : 'text-slate-100'}
                          >
                            PIN #{emp.biometric_pin} - {emp.full_name} ({emp.designation}) {isReg ? (existing?.status === 'APPROVED' ? '🔒 [ALREADY REGISTERED]' : '⏳ [PENDING APPROVAL]') : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Staff Preview Card if selected */}
                  {selectedSignupEmp && (
                    <div className="p-3 bg-purple-950/30 rounded-2xl border border-purple-800/40 flex items-center gap-3">
                      {signupPhotoUrl ? (
                        <img
                          src={signupPhotoUrl}
                          alt={selectedSignupEmp.full_name}
                          className="w-11 h-11 rounded-xl object-cover border-2 border-fuchsia-400 shrink-0 shadow-xs"
                        />
                      ) : selectedSignupEmp.photo_url && !selectedSignupEmp.photo_url.includes('unsplash') ? (
                        <img
                          src={selectedSignupEmp.photo_url}
                          alt={selectedSignupEmp.full_name}
                          className="w-11 h-11 rounded-xl object-cover border border-purple-500/40 shrink-0 shadow-xs"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-fuchsia-400 shrink-0 font-mono font-bold text-sm">
                          #{selectedSignupEmp.biometric_pin}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-xs sm:text-sm truncate">{selectedSignupEmp.full_name}</p>
                        <p className="text-[11px] text-purple-300/80 truncate">{selectedSignupEmp.designation} • {selectedSignupEmp.department_name}</p>
                      </div>
                    </div>
                  )}

                  {/* Profile Photo Upload Section (One-Time Upload) */}
                  <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Staff Profile Photo
                      </label>
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/60 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>One-Time Upload</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {signupPhotoUrl ? (
                          <img
                            src={signupPhotoUrl}
                            alt="Preview"
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-fuchsia-400 shadow-md"
                          />
                        ) : selectedSignupEmp?.photo_url && !selectedSignupEmp.photo_url.includes('unsplash') ? (
                          <img
                            src={selectedSignupEmp.photo_url}
                            alt="Preview"
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-500/60 shadow-md"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-purple-950/60 border-2 border-dashed border-purple-500/50 flex flex-col items-center justify-center text-purple-300">
                            <Camera className="w-5 h-5 mb-0.5 opacity-80" />
                            <span className="text-[8px] font-bold tracking-tight uppercase">Upload</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <input
                          type="file"
                          id="signup-photo-upload"
                          accept="image/*"
                          onChange={handleSignupPhotoChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="signup-photo-upload"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-600/20 cursor-pointer transition-transform active:scale-95"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{signupPhotoUrl ? 'Change Photo' : 'Upload / Take Photo'}</span>
                        </label>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          This photo will be set in the Admin Dashboard and Digital ID Card. Cannot be modified from the portal after registration.
                        </p>
                      </div>
                    </div>
                  </div>

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
                  {/* Selected Staff Info Chip */}
                  {selectedSignupEmp && (
                    <div className="p-2.5 bg-purple-950/40 rounded-2xl border border-purple-800/40 flex items-center gap-3">
                      {signupPhotoUrl ? (
                        <img
                          src={signupPhotoUrl}
                          alt={selectedSignupEmp.full_name}
                          className="w-10 h-10 rounded-xl object-cover border border-fuchsia-400 shrink-0"
                        />
                      ) : selectedSignupEmp.photo_url && !selectedSignupEmp.photo_url.includes('unsplash') ? (
                        <img
                          src={selectedSignupEmp.photo_url}
                          alt={selectedSignupEmp.full_name}
                          className="w-10 h-10 rounded-xl object-cover border border-purple-500/40 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-fuchsia-400 shrink-0 font-mono font-bold text-xs">
                          #{selectedSignupEmp.biometric_pin}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs truncate">{selectedSignupEmp.full_name}</span>
                          <span className="text-[10px] font-mono text-fuchsia-300">#{selectedSignupEmp.biometric_pin}</span>
                        </div>
                        <span className="text-[10px] text-purple-300/80 block truncate">{selectedSignupEmp.designation}</span>
                      </div>
                    </div>
                  )}

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
                        id="portal_signup_password"
                        name="new-password"
                        autoComplete="new-password"
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
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-3 sm:space-y-4">
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
                      {selectedResetEmp.photo_url && !selectedResetEmp.photo_url.includes('unsplash') ? (
                        <img
                          src={selectedResetEmp.photo_url}
                          alt={selectedResetEmp.full_name}
                          className="w-10 h-10 rounded-xl object-cover border border-purple-500/40 shrink-0 shadow-xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-fuchsia-400 shrink-0 font-mono font-bold text-sm">
                          #{selectedResetEmp.biometric_pin}
                        </div>
                      )}
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
        <div className="text-center py-1 text-[10px] sm:text-[11px] text-slate-500 select-none shrink-0">
          <p>🔒 AP1 Television • Goinfi Biometric HRMS 2026</p>
        </div>

        {/* Non-intrusive Install Toast */}
        {installNotice && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-sm w-11/12 bg-slate-900/95 border border-purple-500/60 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-fuchsia-400 shrink-0" />
            <span className="text-xs font-medium text-slate-200">{installNotice}</span>
          </div>
        )}

        {/* iOS Guide Modal */}
        {renderIosGuideModal()}
      </div>
    );
  }

  // LOGGED-IN MOBILE STAFF PORTAL INTERFACE
  return (
    <div className="min-h-screen w-full overflow-x-hidden overflow-y-auto bg-slate-950 text-slate-100 flex flex-col font-sans pb-32">
      {/* Top Mobile App Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 safe-top">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/ap1-logo.png" 
              alt="AP1 Television" 
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
        {!isAlreadyInstalled && !isBannerDismissed && (
          <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-fuchsia-950/40 border border-purple-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-lg relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-md shadow-purple-600/30">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Install AP1 Staff Portal</h4>
                <p className="text-[11px] text-purple-200/70">Add to your home screen for quick daily access</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 text-white rounded-xl text-xs font-bold shrink-0 shadow-md cursor-pointer active:scale-95"
              >
                Install
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsBannerDismissed(true);
                  try { localStorage.setItem('ap1_pwa_banner_dismissed', 'true'); } catch {}
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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
                  {activeEmployee.photo_url && !activeEmployee.photo_url.includes('unsplash') ? (
                    <img
                      src={activeEmployee.photo_url}
                      alt={activeEmployee.full_name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-500 shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white font-bold text-lg border-2 border-purple-400 shadow-md">
                      {activeEmployee.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                  )}
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

            {/* Quick Access: Staff Group Chat Card */}
            <div 
              onClick={() => setMobileTab('chat')}
              className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/60 border border-purple-500/40 hover:border-purple-500/70 rounded-3xl p-4 shadow-xl cursor-pointer transition active:scale-98"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30 shrink-0">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>AP1 Staff Group Chat</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    </h3>
                    <p className="text-[10px] text-purple-200/70">सबै कर्मचारीहरूसँग च्याट तथा सामूहिक सूचना</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-fuchsia-400 bg-purple-950/80 px-2.5 py-1 rounded-full border border-purple-700/50">
                  <span>च्याट</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {chatMessages.length > 0 && (
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-2.5 text-[11px] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-purple-300 shrink-0">
                      {chatMessages[chatMessages.length - 1].senderName}:
                    </span>
                    <span className="text-slate-300 truncate">
                      {chatMessages[chatMessages.length - 1].text}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono shrink-0 pl-1">
                    {chatMessages.length} msgs
                  </span>
                </div>
              )}
            </div>

            {/* Live Today Attendance Punch Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4.5 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Today&apos;s Biometric Attendance</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> UDP 4370 Live
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-slate-950 p-2.5 sm:p-3 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block uppercase">Check In</span>
                  <span className={`text-base sm:text-lg font-mono font-black mt-1 block ${todayPunch.hasPunched ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {todayPunch.hasPunched ? todayPunch.inTime : '-- : --'}
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5 block truncate">
                    {todayPunch.hasPunched ? 'आगमन' : 'Not punched'}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 sm:p-3 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block uppercase">Check Out</span>
                  <span className={`text-base sm:text-lg font-mono font-black mt-1 block ${todayPunch.outTime ? 'text-blue-400' : 'text-slate-500'}`}>
                    {todayPunch.outTime || '-- : --'}
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5 block truncate">
                    {todayPunch.outTime ? 'प्रस्थान' : todayPunch.hasPunched ? '🏢 In Office' : 'Not yet'}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 sm:p-3 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-purple-300 block uppercase">Total Duty</span>
                  <span className={`text-xs sm:text-sm font-mono font-black mt-1.5 block truncate ${todayPunch.hasPunched ? 'text-purple-300' : 'text-slate-500'}`}>
                    {todayPunch.totalDutyFormatted || '--'}
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5 block truncate">
                    {todayPunch.outTime ? 'Duty Done' : todayPunch.hasPunched ? '⏳ In Progress' : '--'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate mr-2">Shift: {todayPunch.shift}</span>
                <span className={`shrink-0 font-semibold ${
                  todayPunch.status === 'DUTY_MET'
                    ? 'text-emerald-400'
                    : todayPunch.outTime
                    ? 'text-amber-400'
                    : todayPunch.hasPunched
                    ? 'text-blue-400'
                    : 'text-slate-500'
                }`}>
                  स्थिति: {todayPunch.status === 'DUTY_MET' ? '✅ ड्युटी पुगेको (८h+)' : todayPunch.outTime ? '⚠️ ड्युटी नपुगेको (<८h)' : todayPunch.hasPunched ? '🏢 कार्यालयमा कार्यरत' : 'आज पञ्च छैन'}
                </span>
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
        {/* TAB 2: ATTENDANCE (DATE - CHECK-IN - CHECK-OUT - TOTAL DUTY HR) */}
        {/* ========================================================================= */}
        {mobileTab === 'attendance' && (() => {
          const totalWorkedHoursSum = Math.round(myDailyAttendance.reduce((acc, d) => acc + (d.totalDutyHours || 0), 0) * 10) / 10;
          const avgDailyWorked = myDailyAttendance.length > 0 ? (Math.round((totalWorkedHoursSum / myDailyAttendance.length) * 10) / 10) : 0;

          return (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* ========================================================================= */}
              {/* NEPALI CALENDAR MONTHLY DUTY HOURS & TARGET CARD */}
              {/* ========================================================================= */}
              <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-purple-950/20 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
                {/* Header: Title + BS Month Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white flex items-center gap-2">
                          <span>मासिक ड्युटी हिसाब (Monthly Duty Hours)</span>
                          {monthlyDutySummary.isCurrentMonth && (
                            <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              चालु महिना
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          नेपाली क्यालेन्डर (BS) • दैनिक ८ घण्टा ड्युटी • मासिक हिसाब
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Nepali Month Selector */}
                    <div className="relative">
                      <select
                        value={`${selectedBsYear}-${selectedBsMonth}`}
                        onChange={(e) => {
                          const [y, m] = e.target.value.split('-').map(Number);
                          setSelectedBsYear(y);
                          setSelectedBsMonth(m);
                        }}
                        className="bg-slate-950 text-purple-200 font-bold text-xs px-3 py-2 pr-7 rounded-2xl border border-purple-500/40 hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer appearance-none shadow-sm"
                      >
                        {NEPALI_MONTHS_NP.map((mName, idx) => {
                          const mNum = idx + 1;
                          const isCur = 2083 === todayBs.bsYear && mNum === todayBs.bsMonth;
                          return (
                            <option key={mNum} value={`2083-${mNum}`} className="bg-slate-900 text-white">
                              {mName} २०८३ {isCur ? '★ चालु (Current)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronRight className="w-3.5 h-3.5 text-purple-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                    </div>
                  </div>
                </div>

                {/* 4 Main Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* 1. Required Duty Hours */}
                  <div className="bg-slate-950/80 border border-slate-800/90 p-3 sm:p-3.5 rounded-2xl">
                    <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block uppercase">
                      हुनुपर्ने कुल ड्युटी
                    </span>
                    <span className="text-lg sm:text-xl font-mono font-black text-white mt-1 block">
                      {monthlyDutySummary.monthlyRequiredWorkingHours}h
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block truncate">
                      {monthlyDutySummary.daysCount} दिन × ८h (मासिक लक्ष्य)
                    </span>
                  </div>

                  {/* 2. Actual Worked Duty Hours */}
                  <div className="bg-slate-950/80 border border-slate-800/90 p-3 sm:p-3.5 rounded-2xl">
                    <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-400 block uppercase">
                      काम भएको ड्युटी
                    </span>
                    <span className="text-lg sm:text-xl font-mono font-black text-emerald-400 mt-1 block">
                      {monthlyDutySummary.actualWorkedHours}h
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block truncate">
                      {monthlyDutySummary.presentDaysCount} दिन हाजिर ({monthlyDutySummary.presentDaysCount > 0 ? (Math.round((monthlyDutySummary.actualWorkedHours / monthlyDutySummary.presentDaysCount) * 10) / 10) : 0}h/दिन)
                    </span>
                  </div>

                  {/* 3. Pace / Status / Shortfall */}
                  <div className="bg-slate-950/80 border border-slate-800/90 p-3 sm:p-3.5 rounded-2xl">
                    <span className="text-[9px] sm:text-[10px] font-semibold text-purple-300 block uppercase truncate">
                      {monthlyDutySummary.isCurrentMonth ? 'आजसम्मको स्थिति' : 'महिनाको स्थिति'}
                    </span>
                    <span className={`text-base sm:text-lg font-mono font-black mt-1 block truncate ${
                      monthlyDutySummary.isAheadTillToday ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {monthlyDutySummary.isAheadTillToday
                        ? `+${monthlyDutySummary.paceDiffAbs}h अगाडि`
                        : `-${monthlyDutySummary.paceDiffAbs}h नपुगेको`}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block truncate">
                      {monthlyDutySummary.isCurrentMonth
                        ? `आजसम्म ${monthlyDutySummary.targetHoursTillToday}h मा ${monthlyDutySummary.actualWorkedHours}h`
                        : `कुल ${monthlyDutySummary.monthlyRequiredWorkingHours}h मा ${monthlyDutySummary.actualWorkedHours}h`}
                    </span>
                  </div>

                  {/* 4. Remaining Hours */}
                  <div className="bg-slate-950/80 border border-slate-800/90 p-3 sm:p-3.5 rounded-2xl">
                    <span className="text-[9px] sm:text-[10px] font-semibold text-amber-300 block uppercase">
                      पूरा गर्न बाँकी
                    </span>
                    <span className="text-lg sm:text-xl font-mono font-black text-amber-300 mt-1 block">
                      {monthlyDutySummary.remainingMonthlyHours}h
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block truncate">
                      बाँकी {monthlyDutySummary.remainingDays} दिन (औसत {monthlyDutySummary.requiredDailyHoursRemaining}h/दिन)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-medium">
                      मासिक ड्युटी प्रगति (Progress): <span className="font-bold text-white font-mono">{monthlyDutySummary.completionRate}%</span>
                    </span>
                    <span className="font-mono text-purple-300 font-bold">
                      {monthlyDutySummary.actualWorkedHours}h / {monthlyDutySummary.monthlyRequiredWorkingHours}h
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        monthlyDutySummary.completionRate >= 100
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : monthlyDutySummary.isAheadTillToday
                          ? 'bg-gradient-to-r from-purple-500 to-emerald-400'
                          : 'bg-gradient-to-r from-purple-600 via-amber-500 to-rose-500'
                      }`}
                      style={{ width: `${monthlyDutySummary.completionRate}%` }}
                    ></div>
                  </div>
                </div>

                {/* Detailed Breakdown Pills */}
                <div className="pt-2 border-t border-slate-800/60 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
                    📅 महिनाको दिन: <strong className="text-white">{monthlyDutySummary.daysCount}</strong>
                  </span>
                  <span className="px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
                    ✅ उपस्थित: <strong className="text-emerald-400">{monthlyDutySummary.presentDaysCount} दिन</strong>
                  </span>
                  <span className="px-2 py-0.5 bg-slate-950 rounded-lg border border-emerald-500/30 text-slate-300">
                    ✅ ड्युटी पुगेको (८h+): <strong className="text-emerald-400">{monthlyDutySummary.dutyMetCount} दिन</strong>
                  </span>
                  {monthlyDutySummary.dutyShortCount > 0 && (
                    <span className="px-2 py-0.5 bg-slate-950 rounded-lg border border-amber-500/30 text-slate-300">
                      ⚠️ ड्युटी नपुगेको (&lt;८h): <strong className="text-amber-400">{monthlyDutySummary.dutyShortCount} दिन</strong>
                    </span>
                  )}
                  {monthlyDutySummary.absentDaysCount > 0 && (
                    <span className="px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
                      ❌ अनुपस्थित: <strong className="text-rose-400">{monthlyDutySummary.absentDaysCount} दिन</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* View Mode Switcher: Daily Duty for selected month vs Raw Machine Punches */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 flex gap-1.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setAttendanceViewMode('daily')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    attendanceViewMode === 'daily'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>{monthlyDutySummary.monthNameNp} महिनाको दैनिक ड्युटी ({monthlyDutySummary.daysCount} दिन)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceViewMode('raw')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    attendanceViewMode === 'raw'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>सबै मेसिन पञ्चहरू ({myRecentPunches.length})</span>
                </button>
              </div>

              {/* DAILY DUTY VIEW FOR SELECTED NEPALI MONTH */}
              {attendanceViewMode === 'daily' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span>{monthlyDutySummary.monthNameNp} २०८३ दैनिक ड्युटी विवरण</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        मिति, आगमन, प्रस्थान र कुल काम गरेको घण्टा (Total Duty Hr)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDutySortAsc(prev => !prev)}
                        className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 rounded-xl border border-purple-500/30 text-[10px] font-bold text-purple-300 transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                        title="क्रमानुसार बदल्नुहोस् (Sort Order)"
                      >
                        <ArrowUpDown className="w-3 h-3 text-purple-400" />
                        <span>{dutySortAsc ? '१ → ३० गते' : '३० → १ गते'}</span>
                      </button>
                      <span className="text-[11px] font-mono font-semibold px-2.5 py-1 bg-slate-950 rounded-xl border border-slate-800 text-purple-300">
                        PIN #{activeEmployee.biometric_pin}
                      </span>
                    </div>
                  </div>

                  {monthlyDutySummary.sortedDaysList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <Clock className="w-10 h-10 text-slate-700 mx-auto" />
                      <p className="text-sm font-semibold text-slate-300">कुनै हाजिर विवरण भेटिएन</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        यस महिनाको कुनै पनि हाजिर रेकर्ड फेला परेन।
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop / Tablet Table View */}
                      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="py-3 px-4">नेपाली मिति / दिन (BS Date & Day)</th>
                              <th className="py-3 px-4">आगमन समय (Check-In)</th>
                              <th className="py-3 px-4">प्रस्थान समय (Check-Out)</th>
                              <th className="py-3 px-4">ड्युटी समय (Total Duty Hr)</th>
                              <th className="py-3 px-4 text-center">स्थिति (Status)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-normal">
                            {monthlyDutySummary.sortedDaysList.map((item) => (
                              <tr key={item.bsDay} className={`hover:bg-slate-800/40 transition-colors ${
                                item.isToday ? 'bg-purple-950/20' : ''
                              }`}>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-white text-xs">{item.bsDateStr}</span>
                                    {item.isToday && (
                                      <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-black animate-pulse">
                                        🟢 आज
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-purple-300 font-medium mt-0.5">
                                    {item.nepaliFullDate} • {item.dayNameNp} ({item.adDateStr})
                                  </p>
                                </td>

                                <td className="py-3.5 px-4">
                                  {item.inTime ? (
                                    <span className="font-mono text-emerald-400 font-bold text-xs inline-flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                      {item.inTime}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 font-mono text-xs">-- : --</span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4">
                                  {item.outTime ? (
                                    <span className="font-mono text-blue-400 font-bold text-xs inline-flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                      {item.outTime}
                                    </span>
                                  ) : item.status === 'IN_OFFICE' ? (
                                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded-full text-[10px] font-semibold inline-flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                      🏢 In Office (कार्यरत)
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 font-mono text-xs">-- : --</span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4">
                                  {item.dutyHours > 0 ? (
                                    <div>
                                      <div className="font-mono font-bold text-white text-xs flex items-center gap-1.5">
                                        <Timer className="w-3.5 h-3.5 text-purple-400" />
                                        <span className={item.dutyHours >= 8 ? 'text-emerald-400' : 'text-amber-300'}>
                                          {item.dutyFormatted}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-slate-500 block mt-0.5">
                                        {item.punchesCount} पटक पञ्च गरिएको
                                      </span>
                                    </div>
                                  ) : item.isPastOrToday ? (
                                    <span className="text-slate-500 text-xs font-mono">० घण्टा</span>
                                  ) : (
                                    <span className="text-slate-600 text-xs">--</span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    item.status === 'DUTY_MET'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                      : item.status === 'DUTY_SHORT'
                                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                      : item.status === 'IN_OFFICE'
                                      ? 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30'
                                      : item.status === 'ABSENT'
                                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                      : 'bg-slate-800 text-slate-500 border-slate-700'
                                  }`}>
                                    {item.status === 'DUTY_MET' ? '✅ ड्युटी पुगेको' : 
                                     item.status === 'DUTY_SHORT' ? (item.dutyHours > 0 ? `⚠️ नपुगेको (-${Math.round((8 - item.dutyHours) * 10) / 10}h)` : '⚠️ ड्युटी नपुगेको') : 
                                     item.status === 'IN_OFFICE' ? '🏢 कार्यालयमा (चालु)' : 
                                     item.status === 'ABSENT' ? '❌ अनुपस्थित' : 'आगामी दिन'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile High-Density Cards View */}
                      <div className="block md:hidden space-y-3">
                        {monthlyDutySummary.sortedDaysList.map((item) => (
                          <div
                            key={item.bsDay}
                            className={`p-3.5 bg-slate-950 rounded-2xl border transition-all ${
                              item.isToday
                                ? 'border-purple-500/50 shadow-lg shadow-purple-900/10 bg-gradient-to-b from-purple-950/20 to-slate-950'
                                : 'border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            {/* Card Top: Date & Status */}
                            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/70">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl border flex items-center justify-center font-mono text-xs font-black bg-purple-500/10 border-purple-500/20 text-purple-400">
                                  {toNepaliDigits(item.bsDay)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white text-xs">{item.bsDateStr}</span>
                                    {item.isToday && (
                                      <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-black animate-pulse">
                                        🟢 आज
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-purple-300 font-medium">
                                    {item.nepaliFullDate} • {item.dayNameNp}
                                  </p>
                                </div>
                              </div>

                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                item.status === 'DUTY_MET'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : item.status === 'DUTY_SHORT'
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : item.status === 'IN_OFFICE'
                                  ? 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30'
                                  : item.status === 'ABSENT'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  : 'bg-slate-800 text-slate-500 border-slate-700'
                              }`}>
                                {item.status === 'DUTY_MET' ? '✅ ड्युटी पुगेको' : 
                                 item.status === 'DUTY_SHORT' ? (item.dutyHours > 0 ? `⚠️ नपुगेको (-${Math.round((8 - item.dutyHours) * 10) / 10}h)` : '⚠️ नपुगेको') : 
                                 item.status === 'IN_OFFICE' ? '🏢 कार्यालयमा' : 
                                 item.status === 'ABSENT' ? '❌ अनुपस्थित' : 'आगामी'}
                              </span>
                            </div>

                            {/* Card Grid: Check-In, Check-Out, Total Duty */}
                            <div className="grid grid-cols-3 gap-2 pt-2.5 text-center">
                              <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/60">
                                <span className="text-[9px] text-slate-400 font-medium block uppercase">Check In</span>
                                <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">
                                  {item.inTime || '--:--'}
                                </span>
                                <span className="text-[8px] text-slate-500 block mt-0.5">
                                  {item.inTime ? 'आगमन' : '--'}
                                </span>
                              </div>

                              <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/60">
                                <span className="text-[9px] text-slate-400 font-medium block uppercase">Check Out</span>
                                <span className={`text-xs font-mono font-bold mt-0.5 block ${item.outTime ? 'text-blue-400' : 'text-slate-500'}`}>
                                  {item.outTime || (item.status === 'IN_OFFICE' ? 'In Office' : '--:--')}
                                </span>
                                <span className="text-[8px] text-slate-500 block mt-0.5 truncate">
                                  {item.outTime ? 'प्रस्थान' : item.status === 'IN_OFFICE' ? '🏢 In Office' : '--'}
                                </span>
                              </div>

                              <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/60">
                                <span className="text-[9px] text-purple-300 font-medium block uppercase">Total Duty</span>
                                <span className={`text-xs font-mono font-bold mt-0.5 block ${
                                  item.dutyHours >= 8 ? 'text-emerald-400' : item.dutyHours >= 4 ? 'text-amber-300' : item.dutyHours > 0 ? 'text-slate-300' : 'text-slate-500'
                                }`}>
                                  {item.dutyHours > 0 ? `${item.dutyHours} hrs` : item.status === 'IN_OFFICE' ? 'चालु' : item.isPastOrToday ? '०h' : '--'}
                                </span>
                                <span className="text-[8px] text-slate-500 block mt-0.5 truncate">
                                  {item.punchesCount > 0 ? `${item.punchesCount} पञ्च` : '--'}
                                </span>
                              </div>
                            </div>

                            {/* Duration Summary Bar */}
                            {item.dutyFormatted && item.dutyFormatted !== '--' && (
                              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 px-1">
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Timer className="w-3.5 h-3.5 text-purple-400" />
                                  <span>ड्युटी अवधि:</span>
                                </span>
                                <span className="font-mono text-purple-200 font-semibold">{item.dutyFormatted}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* RAW MACHINE PUNCHES VIEW */}
              {attendanceViewMode === 'raw' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4.5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-bold text-sm text-white">सबै मेसिन पञ्चहरू (Machine Punch Records)</h3>
                    <span className="text-[11px] text-slate-400 font-mono">PIN #{activeEmployee.biometric_pin}</span>
                  </div>

                  {myRecentPunches.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 space-y-1">
                      <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-300">कुनै पञ्च भेटिएन</p>
                      <p className="text-[11px] text-slate-500">
                        When you punch your finger/face on the AP1 biometric machine (PIN #{activeEmployee.biometric_pin}), logs will appear here in real-time.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myRecentPunches.map((log, idx) => {
                        const rawDate = log.punch_time ? log.punch_time.split('T')[0].split(' ')[0] : '';
                        const isToday = rawDate === new Date().toISOString().split('T')[0];
                        const timeOnly = (() => {
                          try {
                            return new Date(log.punch_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                          } catch {
                            return log.punch_time || '';
                          }
                        })();

                        return (
                          <div key={idx} className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-white flex items-center gap-1.5">
                                {isToday ? <span className="text-emerald-400 font-black">🟢 आज</span> : rawDate}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                मेसिन IP: {log.device_ip || '10.1.2.216'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-emerald-400 font-bold text-sm">
                                {timeOnly}
                              </p>
                              <span className="inline-block text-[9px] font-bold px-2 py-0.2 rounded-full mt-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                {log.punch_type || 'Biometric Punch'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

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

            {/* My Field Duty Applications */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Field Duty & WFH ({myDuties.length})</span>
                </h3>
              </div>
              {myDuties.length === 0 ? (
                <div className="py-6 text-center text-slate-500 space-y-1">
                  <MapPin className="w-8 h-8 text-slate-700 mx-auto" />
                  <p className="text-xs">No field duty requests submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myDuties.map(duty => (
                    <div key={duty.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400">
                          {duty.type === 'FIELD_VISIT' ? 'Field Visit' : 
                           duty.type === 'CLIENT_MEETING' ? 'Client Meeting' : 
                           duty.type === 'WORK_FROM_HOME' ? 'Work From Home' : 'Official Tour'}
                        </span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          duty.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          duty.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {duty.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>📅 {duty.start_date}</span>
                        {duty.start_time && (
                          <span className="text-fuchsia-300 font-mono font-bold bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-800/40">
                            🕒 {duty.start_time} - {duty.end_time || duty.start_time}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-[11px]">📍 {duty.location}</p>
                      <p className="text-slate-400 text-[11px] italic">&quot;{duty.purpose}&quot;</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: STAFF GROUP CHAT / टिम च्याट (ALL STAFF MESSAGES) */}
        {/* ========================================================================= */}
        {mobileTab === 'chat' && (
          <div className="flex flex-col h-[calc(100vh-175px)] min-h-[500px] max-w-lg mx-auto bg-slate-950/80 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
            {/* Chat Room Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-700 via-fuchsia-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-white tracking-wide">AP1 All-Staff Group</h3>
                    <span className="px-1.5 py-0.2 bg-purple-500/20 border border-purple-500/30 rounded text-[9px] text-purple-300 font-semibold uppercase">Live</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {employees.length > 0 ? `${employees.length} प्रसारण तथा प्राविधिक सदस्यहरू` : 'सबै कर्मचारी टिम'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setChatFilter(prev => prev === 'all' ? 'announcements' : 'all')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                    chatFilter === 'announcements'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title="Filter announcements"
                >
                  <Megaphone className="w-3 h-3 text-amber-400" />
                  <span>{chatFilter === 'announcements' ? 'सबै' : 'सूचना'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fetchChatMessages(false)}
                  className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition cursor-pointer"
                  title="Refresh chat"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${chatLoading ? 'animate-spin text-purple-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Pinned Announcement Banner (if any) */}
            {chatMessages.some(m => m.pinned) && chatFilter === 'all' && (
              <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[10px] font-semibold text-amber-200 truncate">
                    {chatMessages.filter(m => m.pinned).slice(-1)[0]?.text}
                  </span>
                </div>
                <span className="text-[9px] text-amber-400/80 font-bold shrink-0 ml-2">पिन गरिएको</span>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div 
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-3.5 space-y-3.5 divide-y-0"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <MessageSquare className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-300">कुनै सन्देश छैन</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">सबै कर्मचारीहरूसँग पहिलो सन्देश सुरु गर्नुहोस्!</p>
                </div>
              ) : (
                chatMessages
                  .filter(m => chatFilter === 'all' || m.type === 'announcement' || m.type === 'urgent')
                  .map((msg, idx) => {
                    const isMe = String(msg.senderPin) === String(activeEmployee.biometric_pin);
                    const isUrgent = msg.type === 'urgent';
                    const isAnnouncement = msg.type === 'announcement';
                    const isManagement = msg.senderRole === 'admin' || msg.senderPin === '1' || msg.senderPin === '100';

                    let timeLabel = '';
                    try {
                      const d = new Date(msg.createdAt);
                      timeLabel = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    } catch {
                      timeLabel = 'Just now';
                    }

                    const hasLiked = (msg.likes || []).includes(activeEmployee.biometric_pin);

                    return (
                      <div 
                        key={msg.id || idx}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        {/* Sender info for other members */}
                        {!isMe && (
                          <div className="flex items-center gap-1.5 pl-1 text-[11px]">
                            <span className="font-bold text-slate-200">{msg.senderName}</span>
                            {isManagement ? (
                              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-bold">
                                ⭐ Management
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                • {msg.department || 'Staff'} (PIN #{msg.senderPin})
                              </span>
                            )}
                          </div>
                        )}

                        {/* Speech Bubble */}
                        <div className={`relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md ${
                          isMe
                            ? 'bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white rounded-tr-xs'
                            : isUrgent
                            ? 'bg-red-950/80 border border-red-500/50 text-red-100 rounded-tl-xs shadow-red-500/10'
                            : isAnnouncement
                            ? 'bg-amber-950/70 border border-amber-500/50 text-amber-100 rounded-tl-xs'
                            : 'bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-tl-xs'
                        }`}>
                          {/* Announcement / Urgent Header inside Bubble */}
                          {isUrgent && (
                            <div className="flex items-center gap-1 text-[10px] font-extrabold text-red-300 uppercase tracking-wider mb-1 pb-1 border-b border-red-500/30">
                              <span className="animate-pulse">🚨</span>
                              <span>जरुरी सूचना (Urgent Notice)</span>
                            </div>
                          )}
                          {isAnnouncement && (
                            <div className="flex items-center gap-1 text-[10px] font-extrabold text-amber-300 uppercase tracking-wider mb-1 pb-1 border-b border-amber-500/30">
                              <span>📢</span>
                              <span>आधिकारिक सूचना (Announcement)</span>
                            </div>
                          )}

                          {/* Message Body */}
                          <p className="whitespace-pre-wrap leading-relaxed select-text font-normal text-xs">
                            {msg.text}
                          </p>

                          {/* Footer: Time & Actions */}
                          <div className={`flex items-center justify-between gap-3 mt-1.5 pt-1 text-[9px] ${
                            isMe ? 'text-purple-200/80 border-t border-purple-500/30' : 'text-slate-400 border-t border-slate-700/50'
                          }`}>
                            <span className="font-mono">{timeLabel}</span>
                            <div className="flex items-center gap-2">
                              {/* Like / Acknowledge Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleChatLike(msg.id)}
                                className={`flex items-center gap-0.5 cursor-pointer px-1 rounded transition-colors ${
                                  hasLiked 
                                    ? (isMe ? 'text-amber-300 font-bold' : 'text-fuchsia-400 font-bold') 
                                    : 'hover:text-white'
                                }`}
                              >
                                <ThumbsUp className="w-2.5 h-2.5" />
                                <span>{(msg.likes || []).length > 0 ? (msg.likes || []).length : ''}</span>
                              </button>

                              {/* Delete message if me or admin */}
                              {(isMe || activeEmployee.role === 'admin') && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChatMessage(msg.id)}
                                  className="text-slate-400 hover:text-red-400 p-0.5 cursor-pointer transition"
                                  title="मेटाउनुहोस् (Delete)"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Quick Emoji Bar */}
            <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-1 overflow-x-auto shrink-0 select-none">
              <span className="text-[10px] text-slate-500 shrink-0 font-medium mr-1">Emoji:</span>
              {['👍', '🙏', '📺', '🚨', '👏', '✅', '⏰', '📢', '🔥', '💪'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setChatInputText(prev => prev + emoji)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg transition active:scale-95 cursor-pointer shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Message Input & Send Form */}
            <form 
              onSubmit={handleSendChatMessage}
              className="p-2.5 bg-slate-900 border-t border-slate-800/80 shrink-0 space-y-2"
            >
              {/* Priority / Announcement Toggle */}
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">प्रकार:</span>
                  <button
                    type="button"
                    onClick={() => setChatMsgType('normal')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                      chatMsgType === 'normal' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    साधारण
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatMsgType('urgent')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                      chatMsgType === 'urgent' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    🔴 जरुरी
                  </button>
                  {(activeEmployee.role === 'admin' || activeEmployee.biometric_pin === '1' || activeEmployee.biometric_pin === '100') && (
                    <button
                      type="button"
                      onClick={() => setChatMsgType('announcement')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                        chatMsgType === 'announcement' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      📢 सूचना
                    </button>
                  )}
                </div>

                <span className="text-slate-500 font-mono text-[9px]">{chatInputText.length}/2000</span>
              </div>

              {/* Text Input Row */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={
                    chatMsgType === 'urgent' 
                      ? '🔴 सबैलाई तत्काल जरुरी सूचना टाइप गर्नुहोस्...'
                      : chatMsgType === 'announcement'
                      ? '📢 आधिकारिक सूचना यहाँ टाइप गर्नुहोस्...'
                      : 'यहाँ सन्देश लेख्नुहोस् (Message all staff)...'
                  }
                  value={chatInputText}
                  onChange={e => setChatInputText(e.target.value)}
                  maxLength={2000}
                  className={`flex-1 px-3.5 py-2.5 bg-slate-800/90 border rounded-2xl text-white text-xs placeholder:text-slate-500 focus:outline-none transition ${
                    chatMsgType === 'urgent'
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                      : chatMsgType === 'announcement'
                      ? 'border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30'
                      : 'border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!chatInputText.trim() || chatSending}
                  className={`p-2.5 rounded-2xl text-white shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                    chatMsgType === 'urgent'
                      ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                      : chatMsgType === 'announcement'
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                      : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 shadow-purple-600/30'
                  }`}
                  title="सन्देश पठाउनुहोस्"
                >
                  {chatSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PROFILE & ASSETS */}
        {/* ========================================================================= */}
        {mobileTab === 'profile' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Digital ID Card Badge Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center relative overflow-hidden shadow-2xl">
              <div className="w-12 h-2 bg-slate-800 rounded-full mx-auto mb-4 border border-slate-700"></div>

              <div className="flex items-center justify-center gap-2 mb-3 bg-white/5 py-1.5 px-3 rounded-xl border border-white/10">
                <img 
                  src="/ap1-logo.png" 
                  alt="AP1 Television" 
                  className="h-7 w-auto shrink-0 object-contain drop-shadow" 
                  style={{ aspectRatio: '800/339' }} 
                />
                <h3 className="font-black text-[11px] tracking-wider text-white uppercase">AP1 TELEVISION</h3>
              </div>

              <div className="relative w-24 h-24 mx-auto mb-2">
                {activeEmployee.photo_url && !activeEmployee.photo_url.includes('unsplash') ? (
                  <img
                    src={activeEmployee.photo_url}
                    alt={activeEmployee.full_name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-purple-500 shadow-xl"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white font-black text-2xl flex items-center justify-center border-2 border-purple-400 shadow-xl">
                    {activeEmployee.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                )}

                <label
                  htmlFor="portal-profile-photo-change"
                  className="absolute bottom-0 right-0 p-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-full shadow-lg border-2 border-slate-900 cursor-pointer transition-transform active:scale-95"
                  title="तस्विर राख्नुहोस् वा फेर्नुहोस् (Change Photo)"
                >
                  {isUpdatingPhoto ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  <input
                    id="portal-profile-photo-change"
                    type="file"
                    accept="image/*"
                    onChange={handleUpdateProfilePhoto}
                    className="hidden"
                    disabled={isUpdatingPhoto}
                  />
                </label>
              </div>

              {photoUploadMsg && (
                <div className="mb-2 p-2 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold text-center animate-fade-in shadow-md">
                  {photoUploadMsg}
                </div>
              )}

              <div className="mb-2.5 flex items-center justify-center gap-2">
                <label
                  htmlFor="portal-profile-photo-change"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-700/60 text-[10px] text-fuchsia-300 font-bold hover:bg-purple-900/80 transition-colors cursor-pointer"
                >
                  <Camera className="w-3 h-3 text-fuchsia-400" />
                  <span>तस्विर फेर्नुहोस् (Change Photo)</span>
                </label>
              </div>

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

            {/* Sign Out */}
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-red-950/30 hover:bg-red-900/40 text-rose-300 border border-rose-800/40 rounded-2xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </main>

      {/* FIXED MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pt-1.5 px-2 safe-bottom select-none">
        <div className="max-w-lg mx-auto grid grid-cols-5 gap-0.5 text-center">
          <button
            type="button"
            onClick={() => setMobileTab('home')}
            className={`py-1.5 flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
              mobileTab === 'home' ? 'text-fuchsia-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] sm:text-[10px]">Home</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('attendance')}
            className={`py-1.5 flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
              mobileTab === 'attendance' ? 'text-fuchsia-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] sm:text-[10px]">Attendance</span>
          </button>

          {/* Group Chat Button with Real-time Unread Badge */}
          <button
            type="button"
            onClick={() => {
              setMobileTab('chat');
              setUnreadChatCount(0);
            }}
            className={`py-1.5 flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer relative ${
              mobileTab === 'chat' ? 'text-fuchsia-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 mb-0.5" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-[8px] rounded-full min-w-3.5 h-3.5 flex items-center justify-center shadow-lg shadow-red-500/40 animate-bounce">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px]">Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('leaves')}
            className={`py-1.5 flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
              mobileTab === 'leaves' ? 'text-fuchsia-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] sm:text-[10px]">Leaves</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('profile')}
            className={`py-1.5 flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
              mobileTab === 'profile' ? 'text-fuchsia-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] sm:text-[10px]">ID / Assets</span>
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

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Start Time *</label>
                    <input
                      type="time"
                      required
                      value={fdStartTime}
                      onChange={e => setFdStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">End Time *</label>
                    <input
                      type="time"
                      required
                      value={fdEndTime}
                      onChange={e => setFdEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium"
                    />
                  </div>
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

      {/* iOS Guide Modal */}
      {renderIosGuideModal()}
    </div>
  );
}
