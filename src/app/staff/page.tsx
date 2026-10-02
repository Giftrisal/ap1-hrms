'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';
import { initialEmployees, initialDepartments, initialShifts, getStoredDepartments, saveStoredDepartments } from '@/lib/mock-data';
import { Employee, Department, Shift } from '@/lib/types';
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  Filter, 
  Edit3, 
  Trash2, 
  Fingerprint, 
  Mail, 
  Phone, 
  Calendar,
  CreditCard,
  Building,
  Building2,
  CheckCircle2,
  X,
  Save,
  LayoutGrid,
  Table as TableIcon,
  Send,
  Sparkles,
  QrCode,
  Printer,
  Camera,
  Upload,
  MessageSquare,
  History,
  Radio,
  Settings,
  ExternalLink,
  Copy,
  RefreshCw,
  ShieldCheck,
  Check,
  UserCheck,
  UserX,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function StaffPage() {
  const { t, language } = useLanguage();
  const { role } = useAuth();
  
  // Load employees from localStorage with clean purge of old staff
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_staff_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Strictly exclude master admin with pin 999 from regular staff list
            const cleaned = parsed.filter((p: any) => String(p.biometric_pin) !== '999' && !p.is_master_admin && p.id !== 'emp-master');
            return cleaned;
          }
        } catch (e) {}
      }
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_staff_view_mode');
      if (saved === 'grid' || saved === 'table') return saved;
    }
    return 'table'; // Default to Table style as requested
  });

  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_staff_view_mode', mode);
    }
  };
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Employee | null>(null);
  const [idCardStaff, setIdCardStaff] = useState<Employee | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [broadcastEmail, setBroadcastEmail] = useState(true);
  const [staffBio, setStaffBio] = useState('');
  const [broadcastResult, setBroadcastResult] = useState<any>(null);

  // SMS Broadcast & Notice Center State
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [smsTab, setSmsTab] = useState<'bulk' | 'individual' | 'logs'>('bulk');
  const [smsTargetDept, setSmsTargetDept] = useState<string>('ALL');
  const [smsSelectedStaffId, setSmsSelectedStaffId] = useState<string>('');
  const [smsCustomPhone, setSmsCustomPhone] = useState<string>('');
  const [smsMessage, setSmsMessage] = useState<string>('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsStatusMsg, setSmsStatusMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [gatewaySavedNotice, setGatewaySavedNotice] = useState('');
  const [smsGatewayConfig, setSmsGatewayConfig] = useState<{
    provider: 'sparrow' | 'twozero' | 'aakash' | 'custom';
    apiKey: string;
    senderId: string;
    apiUrl: string;
  }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('goinfi_sms_gateway_config');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      provider: 'twozero',
      apiKey: 'sk_Fc6uqsPMOcEhunlMg4DKPW675opkXhAgqZ0KmQZZlA2chwPt2x13DVhfyzlO',
      senderId: 'GOINFI',
      apiUrl: 'https://sms.twozero.io/api/v1/sms/send'
    };
  });
  const [smsLogs, setSmsLogs] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('goinfi_sms_logs');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Portal Registration Approvals State
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);

  // Real-time live sync: staff list & pending registrations every 3 seconds
  useEffect(() => {
    let prevPendingCount = 0;

    const syncStaffData = () => {
      fetch(`/api/staff?t=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            if (Array.isArray(d.staff) && d.staff.length > 0) {
              const clean = d.staff.filter((p: any) => String(p.biometric_pin) !== '999' && !p.is_master_admin && p.id !== 'emp-master');
              setEmployees(clean);
              if (typeof window !== 'undefined') {
                localStorage.setItem('goinfi_staff_list', JSON.stringify(clean));
              }
            } else if (Array.isArray(d.staff) && d.staff.length === 0) {
              const saved = typeof window !== 'undefined' ? localStorage.getItem('goinfi_staff_list') : null;
              if (saved) {
                try {
                  const parsed = JSON.parse(saved);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    const clean = parsed.filter((p: any) => String(p.biometric_pin) !== '999' && !p.is_master_admin && p.id !== 'emp-master');
                    if (clean.length > 0) {
                      fetch('/api/staff', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ staff: clean })
                      }).catch(() => {});
                      setEmployees(clean);
                    }
                  }
                } catch {}
              }
            }

            if (Array.isArray(d.registrations)) {
              const pending = d.registrations.filter((r: any) => r.status === 'PENDING_APPROVAL');
              setPendingRegistrations(pending);
              
              // If new request just arrived in real time, notify admin
              if (pending.length > prevPendingCount && prevPendingCount > 0) {
                showNotice(`🔔 नयाँ स्टाफ दर्ता अनुरोध: ${pending[0].staffName} (PIN #${pending[0].pin})`);
              }
              prevPendingCount = pending.length;
            }
          }
        })
        .catch(err => console.warn('Could not fetch staff from server:', err));
    };

    syncStaffData();
    const liveInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      syncStaffData();
    }, 60000); // 60s interval, pauses when tab is inactive
    return () => clearInterval(liveInterval);
  }, []);

  const handleApproveRegistration = async (pin: string) => {
    setApprovalLoading(pin);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'approve_registration', 
          pin, 
          approvedBy: 'HR Admin',
          gatewayConfig: smsGatewayConfig 
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.registrations) {
          setPendingRegistrations(data.registrations.filter((r: any) => r.status === 'PENDING_APPROVAL'));
        }
        if (data.staff) {
          saveEmployeesList(data.staff);
        }
        const smsNote = data.phone ? ` (SMS notification sent to +977-${data.phone})` : '';
        showNotice(`✓ Staff PIN #${pin} approved and activated!${smsNote}`);
      } else {
        showNotice(data.error || 'Failed to approve registration.');
      }
    } catch (e) {
      showNotice(`Error approving staff PIN #${pin}`);
    } finally {
      setApprovalLoading(null);
    }
  };

  const handleRejectRegistration = async (pin: string) => {
    if (!confirm(`Are you sure you want to reject registration request for PIN #${pin}?`)) return;
    setApprovalLoading(pin);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reject_registration', 
          pin,
          gatewayConfig: smsGatewayConfig 
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.registrations) {
          setPendingRegistrations(data.registrations.filter((r: any) => r.status === 'PENDING_APPROVAL'));
        }
        const smsNote = data.phone ? ` (Rejection SMS dispatched to +977-${data.phone})` : '';
        showNotice(`Registration for PIN #${pin} was rejected.${smsNote}`);
      } else {
        showNotice(data.error || 'Failed to reject registration.');
      }
    } catch (e) {
      showNotice(`Error rejecting registration`);
    } finally {
      setApprovalLoading(null);
    }
  };

  const handleOpenIndividualSms = (emp: Employee) => {
    setSmsTab('individual');
    setSmsSelectedStaffId(emp.id);
    const digits = (emp.phone || '').replace(/[^0-9]/g, '');
    const clean = digits.startsWith('977') && digits.length === 13 ? digits.substring(3) : digits;
    setSmsCustomPhone(clean);
    setSmsStatusMsg(null);
    setIsSmsModalOpen(true);
  };

  const handleOpenBulkSms = (dept = 'ALL') => {
    setSmsTab('bulk');
    setSmsTargetDept(dept);
    setSmsStatusMsg(null);
    setIsSmsModalOpen(true);
  };

  const handleSendSmsBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmsStatusMsg(null);

    const trimmed = smsMessage.trim();
    if (!trimmed) {
      setSmsStatusMsg({ type: 'error', text: 'Please enter a message to send.' });
      return;
    }

    let recipientList: any[] = [];
    if (smsTab === 'bulk') {
      const targetEmps = smsTargetDept === 'ALL' 
        ? employees 
        : employees.filter(e => e.department_name === smsTargetDept || e.department_id === smsTargetDept);

      if (targetEmps.length === 0) {
        setSmsStatusMsg({ type: 'error', text: 'No staff found in the selected department.' });
        return;
      }

      recipientList = targetEmps.map(emp => ({
        phone: emp.phone,
        name: emp.full_name,
        pin: emp.biometric_pin,
        department: emp.department_name
      }));
    } else {
      const chosen = employees.find(e => e.id === smsSelectedStaffId) || employees.find(e => e.biometric_pin === smsSelectedStaffId);
      const phone = (smsCustomPhone || chosen?.phone || '').replace(/[^0-9]/g, '');
      if (!phone || phone.length < 9) {
        setSmsStatusMsg({ type: 'error', text: 'Please enter a valid 10-digit mobile number.' });
        return;
      }
      recipientList = [{
        phone,
        name: chosen?.full_name || 'Staff',
        pin: chosen?.biometric_pin || '0',
        department: chosen?.department_name || 'AP1'
      }];
    }

    setSmsSending(true);
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: smsTab,
          recipients: recipientList,
          message: trimmed,
          gatewayConfig: smsGatewayConfig
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorText = data.error || 'Failed to send SMS. Please verify your SMS gateway balance and API key.';
        setSmsStatusMsg({
          type: 'error',
          text: `❌ ${errorText}`
        });
        return;
      }

      const newLog = {
        id: `sms-log-${Date.now()}`,
        type: smsTab,
        target: smsTab === 'bulk' ? (smsTargetDept === 'ALL' ? `All Staff (${recipientList.length})` : `${smsTargetDept} (${recipientList.length})`) : (recipientList[0]?.name || smsCustomPhone),
        recipientCount: recipientList.length,
        message: trimmed,
        sentAt: new Date().toISOString(),
        successCount: data.successCount,
        failedCount: data.failedCount
      };

      const updatedLogs = [newLog, ...smsLogs];
      setSmsLogs(updatedLogs);
      if (typeof window !== 'undefined') {
        localStorage.setItem('goinfi_sms_logs', JSON.stringify(updatedLogs));
      }

      setSmsStatusMsg({
        type: 'success',
        text: `✅ ${data.message || 'SMS broadcast dispatched successfully!'}`
      });
      setSmsMessage('');
    } catch (err: any) {
      setSmsStatusMsg({
        type: 'error',
        text: `❌ ${err.message || 'An error occurred while sending SMS.'}`
      });
    } finally {
      setSmsSending(false);
    }
  };

  // Dynamic Departments loaded from localStorage
  const [departments, setDepartments] = useState<Department[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredDepartments();
    }
    return initialDepartments;
  });

  const saveDepartmentsList = (newList: Department[]) => {
    setDepartments(newList);
    saveStoredDepartments(newList);
  };

  // Active Shifts loaded from localStorage
  const [shifts, setShifts] = useState<Shift[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_shifts_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return initialShifts;
  });

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [isQuickDeptOpen, setIsQuickDeptOpen] = useState(false);
  const [quickDeptName, setQuickDeptName] = useState('');

  const handleAddDepartment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newDeptName.trim();
    if (!trimmed) {
      alert('Please enter department name');
      return;
    }

    const code = (newDeptCode.trim() || trimmed.substring(0, 4).toUpperCase()).replace(/[^A-Z0-9]/g, '') || 'DEPT';
    const id = `dept-${Date.now()}`;
    const newDept: Department = {
      id,
      name: trimmed,
      code,
      description: newDeptDesc.trim() || `${trimmed} Department`,
      employee_count: 0
    };

    const updated = [...departments, newDept];
    saveDepartmentsList(updated);
    setNewDeptName('');
    setNewDeptCode('');
    setNewDeptDesc('');
    showNotice(`✅ Department "${trimmed}" created successfully!`);
  };

  const handleQuickAddDept = (isEditing = false) => {
    const trimmed = quickDeptName.trim();
    if (!trimmed) return;

    const code = trimmed.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DEPT';
    const id = `dept-${Date.now()}`;
    const newDept: Department = {
      id,
      name: trimmed,
      code,
      description: `${trimmed} Department`,
      employee_count: 0
    };

    const updated = [...departments, newDept];
    saveDepartmentsList(updated);

    if (isEditing && editingStaff) {
      setEditingStaff({ ...editingStaff, department_id: id, department_name: trimmed });
    } else {
      setFormData(prev => ({ ...prev, department_id: id }));
    }

    setQuickDeptName('');
    setIsQuickDeptOpen(false);
    showNotice(`✅ New Department "${trimmed}" created and selected!`);
  };

  const handleDeleteDepartment = (deptId: string, deptName: string) => {
    const assignedCount = employees.filter(e => e.department_id === deptId || e.department_name === deptName).length;
    if (assignedCount > 0) {
      alert(
        `Cannot delete department "${deptName}" because ${assignedCount} staff member(s) are currently in it. Please reassign them first.`
      );
      return;
    }

    if (!confirm(
      `Are you sure you want to delete department "${deptName}"?`
    )) return;

    const updated = departments.filter(d => d.id !== deptId);
    saveDepartmentsList(updated);
    showNotice(`🗑️ Department "${deptName}" removed.`);
  };

  const saveEmployeesList = (newList: Employee[]) => {
    setEmployees(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_staff_list', JSON.stringify(newList));
    }
    // Sync with centralized API so mobile portal and all devices stay up-to-date
    fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff: newList })
    }).catch(e => console.warn('Could not sync staff list to API:', e));
  };

  const handleClearAllStaff = () => {
    if (confirm('Are you sure you want to delete all staff?')) {
      saveEmployeesList([]);
      showNotice('All staff cleared successfully. Ready for manual registration.');
    }
  };

  // Form data for adding new employee
  const [formData, setFormData] = useState<Partial<Employee>>({
    full_name: '',
    email: '',
    phone: '+977-98',
    biometric_pin: '',
    photo_url: '',
    department_id: departments[0]?.id || 'dept-1',
    designation: '',
    base_salary: 0,
    join_date: '',
    dob: '',
    role: 'employee',
    status: 'active',
    bank_name: 'Global IME Bank',
    bank_account_number: '102000000001',
    pan_number: 'PAN000001',
    weekly_off_day: 'Saturday'
  });

  const handleOpenEdit = (emp: Employee) => {
    const today = new Date().toISOString().split('T')[0];
    const isAutoOrToday = !emp.join_date || 
      emp.join_date === today || 
      emp.join_date === '2023-01-01' ||
      emp.join_date === '2026-09-19' ||
      emp.join_date === '2026-09-20' ||
      (!(emp as any).is_joining_date_set && (emp.join_date === today || emp.join_date === '2023-01-01'));

    setEditingStaff({
      ...emp,
      shift_id: emp.shift_id || 'shift-day',
      shift_name: emp.shift_name || shifts.find(s => s.id === emp.shift_id)?.name || 'Day Shift (10:00 AM - 6:00 PM)',
      weekly_off_day: emp.weekly_off_day || 'Saturday',
      join_date: isAutoOrToday ? '' : emp.join_date,
      dob: emp.dob || ''
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo is too large! Please choose an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (isEditing && editingStaff) {
        setEditingStaff(prev => prev ? ({ ...prev, photo_url: result }) : null);
      } else {
        setFormData(prev => ({ ...prev, photo_url: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.biometric_pin.includes(searchQuery);
    const matchesDept = selectedDept === 'ALL' || emp.department_name === selectedDept;
    return matchesSearch && matchesDept;
  });

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.biometric_pin) {
      alert('Please provide Full Name and Biometric PIN');
      return;
    }

    const dept = departments.find(d => d.id === formData.department_id);
    const selectedShift = shifts.find(s => s.id === formData.shift_id) || shifts[0];
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      biometric_pin: formData.biometric_pin!,
      full_name: formData.full_name!,
      email: formData.email || `${formData.full_name.toLowerCase().replace(/\s+/g, '.')}@ap1hdtv.com`,
      phone: formData.phone || '+977-9800000000',
      photo_url: formData.photo_url || '',
      department_id: formData.department_id || departments[0]?.id || 'dept-1',
      department_name: dept?.name || 'Operations & Broadcasting',
      shift_id: formData.shift_id || selectedShift?.id || 'shift-day',
      shift_name: selectedShift?.name || 'Day Shift (10:00 AM - 6:00 PM)',
      weekly_off_day: formData.weekly_off_day || 'Saturday',
      designation: formData.designation || 'Staff',
      role: formData.role || 'employee',
      status: 'active',
      join_date: formData.join_date || '',
      dob: formData.dob || undefined,
      base_salary: typeof formData.base_salary === 'number' && !isNaN(formData.base_salary) ? formData.base_salary : 0,
      bank_name: formData.bank_name || 'Global IME Bank',
      bank_account_number: formData.bank_account_number || '102000000001',
      pan_number: formData.pan_number || 'PAN000001'
    };

    saveEmployeesList([newEmp, ...employees]);
    setIsAddModalOpen(false);
    setFormData({
      full_name: '',
      email: '',
      phone: '+977-98',
      biometric_pin: '',
      photo_url: '',
      department_id: departments[0]?.id || 'dept-1',
      designation: '',
      base_salary: 0,
      join_date: '',
      dob: '',
      role: 'employee',
      status: 'active',
      bank_name: 'Global IME Bank',
      bank_account_number: '102000000001',
      pan_number: 'PAN000001',
      weekly_off_day: 'Saturday'
    });

    // Auto-broadcast welcome introduction email if enabled!
    if (broadcastEmail) {
      try {
        const res = await fetch('/api/staff/welcome-broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: newEmp.full_name,
            designation: newEmp.designation,
            department_name: newEmp.department_name,
            email: newEmp.email,
            phone: newEmp.phone,
            photo_url: newEmp.photo_url,
            join_date: newEmp.join_date,
            bio: staffBio
          })
        });
        const data = await res.json();
        setBroadcastResult(data);
        showNotice(`🎉 ${newEmp.full_name} added & Welcome Email sent to all 32 team members!`);
      } catch (err) {
        showNotice('Staff added. (Email notification queued)');
      }
    } else {
      showNotice('New staff member added successfully!');
    }
  };

  const handleBroadcastWelcome = async (emp: Employee) => {
    try {
      const res = await fetch('/api/staff/welcome-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: emp.full_name,
          designation: emp.designation,
          department_name: emp.department_name,
          email: emp.email,
          phone: emp.phone,
          photo_url: emp.photo_url,
          join_date: emp.join_date,
          bio: `Excited to have ${emp.full_name} leading as ${emp.designation} at Goinfi Technologies!`
        })
      });
      const data = await res.json();
      setBroadcastResult(data);
      showNotice(`🎉 Welcome Announcement sent to all staff for ${emp.full_name}!`);
    } catch (e) {
      alert('Failed to send broadcast');
    }
  };

  const handleUpdateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    const dept = departments.find(d => d.id === editingStaff.department_id);
    const selectedShift = shifts.find(s => s.id === editingStaff.shift_id);
    const updated = {
      ...editingStaff,
      department_name: dept?.name || editingStaff.department_name,
      shift_id: editingStaff.shift_id || 'shift-day',
      shift_name: selectedShift?.name || editingStaff.shift_name || 'Day Shift (10:00 AM - 6:00 PM)',
      base_salary: Number(editingStaff.base_salary),
      join_date: editingStaff.join_date || '',
      is_joining_date_set: Boolean(editingStaff.join_date)
    };

    const updatedList = employees.map(emp => emp.id === updated.id ? updated : emp);
    saveEmployeesList(updatedList);
    setEditingStaff(null);
    showNotice('Employee details & salary updated successfully!');
  };

  const handleDeleteStaff = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name}?`)) {
      const updatedList = employees.filter(e => e.id !== id);
      saveEmployeesList(updatedList);
      setEditingStaff(null);
      showNotice(`${name} has been removed.`);
    }
  };

  const showNotice = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 5000);
  };

  const exportStaffDirectory = () => {
    const data = employees.map((e) => ({
      'Biometric PIN': e.biometric_pin,
      'Full Name': e.full_name,
      'Email': e.email,
      'Phone': e.phone,
      'Department': e.department_name,
      'Designation': e.designation,
      'Base Salary (NPR)': e.base_salary,
      'Join Date': e.join_date,
      'Date of Birth': e.dob || '',
      'Role': e.role,
      'PAN': e.pan_number,
      'Bank': e.bank_name,
      'Account Number': e.bank_account_number
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Staff Directory');
    XLSX.writeFile(workbook, `Goinfi_Staff_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <DashboardShell
      title={t.navStaff}
    >
      {/* Toast Notice */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Broadcast Result Banner (When welcome email is triggered) */}
      {broadcastResult && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">{broadcastResult.subject}</p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Sent to {broadcastResult.recipientCount} staff emails.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setBroadcastResult(null)}
            className="px-3 py-1 bg-white border border-blue-200 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 cursor-pointer self-start sm:self-auto"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Enterprise Executive Strip with Official AP1 Logo */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-purple-950 p-5 sm:p-6 rounded-2xl text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4 sm:gap-5">
          <Link 
            href="/dashboard"
            className="shrink-0 transition-transform active:scale-95 group inline-block"
            title="Go to Dashboard"
          >
            <img 
              src="/ap1-logo.png" 
              alt="AP1 Logo" 
              className="h-16 sm:h-20 w-auto shrink-0 object-contain drop-shadow-xl group-hover:scale-105 transition-transform" 
              style={{ aspectRatio: '800/339' }}
            />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Link 
                href="/dashboard" 
                className="px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white uppercase shadow-xs transition-colors cursor-pointer"
                title="Go to Dashboard"
              >
                AP1 TELEVISION
              </Link>
              <span className="text-xs text-purple-200 font-semibold">• Corporate HRMS by Goinfi</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1.5 tracking-tight">
              AP1 Tv Staff Directory & Biometric Terminal Management
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Real-time biometric punch synchronization with ZKTeco face & fingerprint hardware
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-stretch md:self-auto justify-end flex-wrap">
          {/* Hardware Status Pill */}
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-emerald-300 text-xs tracking-wide">Online</span>
          </div>
        </div>
      </div>

      {/* 4 Premium Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Workforce
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {employees.length} <span className="text-xs font-semibold text-slate-400">Staff</span>
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> AP1 Registered
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Biometric Enrolled
            </span>
            <span className="text-2xl font-black text-blue-700 mt-1 block">
              {employees.filter(e => Boolean(e.biometric_pin)).length} <span className="text-xs font-semibold text-slate-400">PINs</span>
            </span>
            <span className="text-[10px] text-blue-600 font-semibold mt-0.5 inline-flex items-center gap-1">
              <Fingerprint className="w-3 h-3 text-blue-500" /> ZKTeco Ready
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
            <Fingerprint className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Monthly Payroll
            </span>
            <span className="text-xl font-black text-emerald-700 mt-1 block">
              NPR {employees.reduce((sum, e) => sum + (e.base_salary || 0), 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
              Disbursement active
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Admin & HR Ops
            </span>
            <span className="text-2xl font-black text-indigo-700 mt-1 block">
              {employees.filter(e => e.role === 'admin' || e.role === 'hr').length} <span className="text-xs font-semibold text-slate-400">Accounts</span>
            </span>
            <span className="text-[10px] text-indigo-600 font-semibold mt-0.5 block">
              System access control
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <Building className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Top Action & Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full xl:w-auto flex-1 flex-wrap sm:flex-nowrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchStaffPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium text-slate-700"
          >
            <option value="ALL">{t.filterDepartment}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* View Toggle + Add Button (Tablet & Mobile Friendly with flex-wrap) */}
        <div className="flex items-center flex-wrap gap-2 w-full xl:w-auto justify-start xl:justify-end">
          {/* View Switcher: Table vs Cards (Table Default) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => handleSetViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View (Default)"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => handleSetViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>

          <button
            onClick={exportStaffDirectory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          {/* 1-Click Refresh Staff Directory */}
          <button
            onClick={() => {
              fetch('/api/staff')
                .then(r => r.json())
                .then(d => {
                  const clean = (d.staff || []).filter((p: any) => String(p.biometric_pin) !== '999' && !p.is_master_admin && p.id !== 'emp-master');
                  saveEmployeesList(clean);
                  showNotice(`✅ Staff directory refreshed (${clean.length} active staff)`);
                })
                .catch(() => showNotice('Could not reach staff server'));
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition-all cursor-pointer"
            title="Refresh staff directory from server"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Refresh ({employees.length})</span>
          </button>

          {/* Manage Departments Button */}
          <button
            onClick={() => setIsDeptModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs transition-all cursor-pointer"
            title="Manage Corporate Departments & Units"
          >
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>{`🏢 Departments (${departments.length})`}</span>
          </button>

          {/* Send SMS Broadcast Button */}
          <button
            onClick={() => handleOpenBulkSms('ALL')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
            title="Send bulk or individual SMS to staff via Goinfi SMS"
          >
            <Send className="w-3.5 h-3.5 text-white" />
            <span>📢 SMS Notice</span>
          </button>

          {/* Clear All Staff Button */}
          {employees.length > 0 && (
            <button
              onClick={handleClearAllStaff}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
              title="Delete all staff from directory"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

          {/* Staff Registration Approvals Button */}
          <button
            onClick={() => setIsApprovalModalOpen(true)}
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
              pendingRegistrations.length > 0
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white animate-pulse'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
            title="Approve or Reject Staff Portal Signups"
          >
            <ShieldCheck className={`w-4 h-4 ${pendingRegistrations.length > 0 ? 'text-white' : 'text-amber-500'}`} />
            <span>Portal Approvals</span>
            {pendingRegistrations.length > 0 && (
              <span className="px-1.5 py-0.5 bg-white text-orange-700 font-black rounded-full text-[10px] shadow-xs">
                {pendingRegistrations.length}
              </span>
            )}
          </button>

          {/* Big Add Staff Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Add New Staff</span>
          </button>
        </div>
      </div>

      {/* Empty State when directory is empty */}
      {filteredEmployees.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center my-6 shadow-xs">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Staff Directory is Empty
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            All old staff records have been cleared. Click below to add staff members manually.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Add New Staff</span>
          </button>
        </div>
      )}

      {/* VIEW 1: CARD VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((emp) => (
            <div 
              key={emp.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: PIN & Role */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                    <Fingerprint className="w-3 h-3 text-blue-600" />
                    PIN #{emp.biometric_pin}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {emp.role}
                  </span>
                </div>

                {/* Avatar & Name */}
                <div className="flex items-center gap-3 mb-3">
                  {emp.photo_url && !emp.photo_url.includes('unsplash') ? (
                    <img
                      src={emp.photo_url}
                      alt={emp.full_name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white font-bold text-sm flex items-center justify-center border border-purple-400/30 shadow-xs shrink-0">
                      {emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{emp.full_name}</h4>
                    <p className="text-xs text-blue-600 font-semibold">{emp.designation}</p>
                    <p className="text-[11px] text-slate-500">{emp.department_name}</p>
                  </div>
                </div>

                {/* Salary Highlight Box */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Monthly Salary:</span>
                    <span className="font-bold text-slate-900 text-sm text-emerald-700">
                      NPR {emp.base_salary.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <span>Email:</span>
                    <span className="truncate max-w-[140px] text-slate-700">{emp.email}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>Shift:</span>
                    </span>
                    <span className="font-semibold text-slate-800 truncate max-w-[150px]" title={emp.shift_name}>
                      {emp.shift_name || 'Day Shift (10:00 AM - 6:00 PM)'}
                    </span>
                  </div>
                  {emp.join_date && emp.join_date !== '2023-01-01' && emp.join_date !== '2026-09-19' && emp.join_date !== '2026-09-20' && (
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Joined:</span>
                      <span className="font-semibold text-slate-700">{emp.join_date}</span>
                    </div>
                  )}
                  {emp.dob && (
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>DOB:</span>
                      <span className="font-semibold text-slate-700">{emp.dob}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2.5 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(emp)}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-white" />
                    <span>Edit Details</span>
                  </button>
                  <button
                    onClick={() => handleOpenIndividualSms(emp)}
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                    title="Send Direct SMS to this Staff"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIdCardStaff(emp)}
                    className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer"
                    title="Generate Digital ID Card"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(emp.id, emp.full_name)}
                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer"
                    title="Delete Staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Broadcast Welcome Button */}
                <button
                  onClick={() => handleBroadcastWelcome(emp)}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 hover:text-blue-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Send welcome intro email to all 32 staff"
                >
                  <Send className="w-3 h-3 text-blue-600" />
                  <span>Send Intro Email to All Staff</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Machine PIN</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Assigned Shift</th>
                  <th className="py-3 px-4">साप्ताहिक बिदा (Week-Off)</th>
                  <th className="py-3 px-4">Join Date & DOB</th>
                  <th className="py-3 px-4">Base Salary</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {emp.photo_url && !emp.photo_url.includes('unsplash') ? (
                          <img
                            src={emp.photo_url}
                            alt={emp.full_name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white font-bold text-xs flex items-center justify-center border border-purple-400/30 shadow-xs shrink-0">
                            {emp.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{emp.full_name}</p>
                          <p className="text-[11px] text-slate-500 leading-tight">{emp.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      PIN #{emp.biometric_pin}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-700">
                      {emp.department_name}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {emp.designation}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>{emp.shift_name || 'Day Shift'}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Calendar className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span>{emp.weekly_off_day ? (emp.weekly_off_day === 'Sunday' ? 'आइतबार' : emp.weekly_off_day === 'Saturday' ? 'शनिबार' : emp.weekly_off_day) : 'शनिबार'}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[11px] text-slate-600">
                      {emp.join_date && emp.join_date !== '2023-01-01' && emp.join_date !== '2026-09-19' && emp.join_date !== '2026-09-20' ? (
                        <div><span className="font-semibold text-slate-700">Join:</span> {emp.join_date}</div>
                      ) : (
                        <div className="text-slate-400 italic">Not set</div>
                      )}
                      {emp.dob && <div><span className="font-semibold text-slate-700">DOB:</span> {emp.dob}</div>}
                    </td>

                    <td className="py-3 px-4 font-bold text-emerald-700 text-sm">
                      NPR {emp.base_salary.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-white" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleOpenIndividualSms(emp)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                          title="Send Direct SMS"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setIdCardStaff(emp)}
                          className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 cursor-pointer"
                          title="View ID Card"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT STAFF & SALARY MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <span>Edit Staff: {editingStaff.full_name}</span>
              </h3>
              <button 
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-4 mt-4 text-xs">
              {/* Photo Upload & Preview */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0 shadow-2xs">
                  {editingStaff.photo_url ? (
                    <img src={editingStaff.photo_url} alt={editingStaff.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Employee Profile Photo
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-blue-600 border border-blue-200 shadow-2xs cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{editingStaff.photo_url ? 'Change Photo' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, true)}
                      />
                    </label>
                    {editingStaff.photo_url && (
                      <button
                        type="button"
                        onClick={() => setEditingStaff({ ...editingStaff, photo_url: '' })}
                        className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Supports JPG, PNG, WebP (Max 5MB)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.full_name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Biometric Machine PIN *</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.biometric_pin}
                    onChange={(e) => setEditingStaff({ ...editingStaff, biometric_pin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Salary Highlight Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div>
                  <label className="block font-bold text-blue-900 mb-1">Monthly Base Salary (NPR) *</label>
                  <input
                    type="number"
                    required
                    value={editingStaff.base_salary ?? 0}
                    onChange={(e) => setEditingStaff({ ...editingStaff, base_salary: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-white border border-blue-400 rounded-lg font-bold text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  <span className="text-[10px] text-blue-700 mt-1 block font-medium">Used for monthly payslips & OT calculation</span>
                </div>
                <div>
                  <label className="block font-bold text-blue-900 mb-1">Designation / Position *</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.designation}
                    onChange={(e) => setEditingStaff({ ...editingStaff, designation: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-blue-400 rounded-lg font-semibold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  <span className="text-[10px] text-blue-700 mt-1 block font-medium">E.g. Lead Engineer, HR Manager</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Department</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickDeptOpen(!isQuickDeptOpen)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      {isQuickDeptOpen ? '✕ Close' : '+ New Dept'}
                    </button>
                  </div>
                  {isQuickDeptOpen && (
                    <div className="mb-2 p-2 bg-blue-50/80 border border-blue-200 rounded-lg flex gap-1.5">
                      <input
                        type="text"
                        value={quickDeptName}
                        onChange={(e) => setQuickDeptName(e.target.value)}
                        placeholder="New department name..."
                        className="flex-1 px-2 py-1 text-xs bg-white border border-blue-300 rounded focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickAddDept(true)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 text-white rounded hover:bg-blue-500 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  )}
                  <select
                    value={editingStaff.department_id}
                    onChange={(e) => setEditingStaff({ ...editingStaff, department_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Assigned Shift (कार्य सिफ्ट) *</label>
                    <span className="text-[10px] text-blue-600 font-bold font-mono">
                      {shifts.find(s => s.id === editingStaff.shift_id)?.start_time ? `${shifts.find(s => s.id === editingStaff.shift_id)?.start_time?.substring(0, 5)} - ${shifts.find(s => s.id === editingStaff.shift_id)?.end_time?.substring(0, 5)}` : 'Flexible'}
                    </span>
                  </div>
                  <select
                    value={editingStaff.shift_id || 'shift-day'}
                    onChange={(e) => {
                      const sft = shifts.find(s => s.id === e.target.value);
                      setEditingStaff({ 
                        ...editingStaff, 
                        shift_id: e.target.value,
                        shift_name: sft?.name || editingStaff.shift_name
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium text-slate-900"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    साप्ताहिक बिदा (Assigned Weekly Off) *
                  </label>
                  <select
                    value={editingStaff.weekly_off_day || 'Saturday'}
                    onChange={(e) => setEditingStaff({ ...editingStaff, weekly_off_day: e.target.value })}
                    className="w-full px-3 py-2 bg-indigo-50/70 border border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500 font-bold text-indigo-900"
                  >
                    <option value="Saturday">शनिबार (Saturday - Default)</option>
                    <option value="Sunday">आइतबार (Sunday)</option>
                    <option value="Monday">सोमबार (Monday)</option>
                    <option value="Tuesday">मंगलबार (Tuesday)</option>
                    <option value="Wednesday">बुधबार (Wednesday)</option>
                    <option value="Thursday">बिहीबार (Thursday)</option>
                    <option value="Friday">शुक्रबार (Friday)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">System Access Role</label>
                  <select
                    value={editingStaff.role}
                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium"
                  >
                    <option value="employee">Employee / Staff</option>
                    <option value="hr">HR Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Email Address</label>
                  <input
                    type="email"
                    value={editingStaff.email}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingStaff.phone}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date of Joining
                  </label>
                  <input
                    type="date"
                    value={editingStaff.join_date || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, join_date: e.target.value, is_joining_date_set: Boolean(e.target.value) } as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editingStaff.dob || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, dob: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* ACTION BUTTONS (DELETE & SAVE) */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteStaff(editingStaff.id, editingStaff.full_name)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>Delete Staff</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-white" />
                    <span>{t.save}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW STAFF MODAL WITH AUTOMATED WELCOME EMAIL CHECKBOX */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Add New Employee</span>
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 mt-4 text-xs">
              {/* Photo Upload & Preview */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0 shadow-2xs">
                  {formData.photo_url ? (
                    <img src={formData.photo_url} alt="Staff Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Employee Profile Photo
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-blue-600 border border-blue-200 shadow-2xs cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{formData.photo_url ? 'Change Photo' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, false)}
                      />
                    </label>
                    {formData.photo_url && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                        className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Supports JPG, PNG, WebP (Max 5MB)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold"
                    placeholder="e.g. Sujan Shrestha"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Biometric Machine PIN *</label>
                  <input
                    type="text"
                    required
                    value={formData.biometric_pin}
                    onChange={(e) => setFormData({ ...formData, biometric_pin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono font-bold"
                    placeholder="e.g. 133"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    placeholder="sujan.s@goinfi.com"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    placeholder="+977-9800000000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Department *</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickDeptOpen(!isQuickDeptOpen)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      {isQuickDeptOpen ? '✕ Close' : '+ New Dept'}
                    </button>
                  </div>
                  {isQuickDeptOpen && (
                    <div className="mb-2 p-2 bg-blue-50/80 border border-blue-200 rounded-lg flex gap-1.5">
                      <input
                        type="text"
                        value={quickDeptName}
                        onChange={(e) => setQuickDeptName(e.target.value)}
                        placeholder="New department name..."
                        className="flex-1 px-2 py-1 text-xs bg-white border border-blue-300 rounded focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickAddDept(false)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 text-white rounded hover:bg-blue-500 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  )}
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Shift (कार्य सिफ्ट) *
                  </label>
                  <select
                    value={formData.shift_id || 'shift-day'}
                    onChange={(e) => setFormData({ ...formData, shift_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium text-slate-800"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation / Position *</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    placeholder="e.g. Lead Engineer, Editor"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Base Salary (NPR)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.base_salary ?? 0}
                    onChange={(e) => setFormData({ ...formData, base_salary: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-bold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Access Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium"
                  >
                    <option value="employee">Employee</option>
                    <option value="hr">HR Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    साप्ताहिक बिदा (Assigned Weekly Off) *
                  </label>
                  <select
                    value={formData.weekly_off_day || 'Saturday'}
                    onChange={(e) => setFormData({ ...formData, weekly_off_day: e.target.value })}
                    className="w-full px-3 py-2 bg-indigo-50/70 border border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500 font-bold text-indigo-900"
                  >
                    <option value="Saturday">शनिबार (Saturday - Default)</option>
                    <option value="Sunday">आइतबार (Sunday)</option>
                    <option value="Monday">सोमबार (Monday)</option>
                    <option value="Tuesday">मंगलबार (Tuesday)</option>
                    <option value="Wednesday">बुधबार (Wednesday)</option>
                    <option value="Thursday">बिहीबार (Thursday)</option>
                    <option value="Friday">शुक्रबार (Friday)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date of Joining
                  </label>
                  <input
                    type="date"
                    value={formData.join_date || ''}
                    onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dob || ''}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Short Bio Field */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Short Introduction / Bio</label>
                <textarea
                  rows={2}
                  value={staffBio}
                  onChange={(e) => setStaffBio(e.target.value)}
                  placeholder="e.g. Sujan brings 3+ years of React experience and loves building high-performance web systems!"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              {/* AUTOMATED WELCOME BROADCAST CHECKBOX */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-blue-950">
                  <input
                    type="checkbox"
                    checked={broadcastEmail}
                    onChange={(e) => setBroadcastEmail(e.target.checked)}
                    className="rounded text-blue-600 w-4 h-4"
                  />
                  <span>🎉 Broadcast Welcome Email to All Staff</span>
                </label>
                <p className="text-[11px] text-blue-700 pl-6.5">
                  Automatically introduces {formData.full_name || 'this new staff member'} to all team members via email with photo and designation.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>{t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIGITAL ID CARD PREVIEW & PRINT MODAL */}
      {idCardStaff && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Official Staff ID Badge</span>
              <button onClick={() => setIdCardStaff(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable ID Card */}
            <div className="w-full bg-slate-900 text-white rounded-2xl overflow-hidden shadow-xl border border-slate-800 text-center relative p-5">
              {/* Lanyard punch hole simulation */}
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

              {idCardStaff.photo_url && !idCardStaff.photo_url.includes('unsplash') ? (
                <img
                  src={idCardStaff.photo_url}
                  alt={idCardStaff.full_name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-red-500 mx-auto shadow-lg mb-2"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white font-black text-2xl flex items-center justify-center border-2 border-red-400 mx-auto shadow-lg mb-2">
                  {idCardStaff.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
              )}

              <h4 className="font-bold text-base text-white">{idCardStaff.full_name}</h4>
              <p className="text-xs font-semibold text-red-400 mt-0.5">{idCardStaff.designation}</p>
              <span className="text-[11px] text-slate-300 font-medium">{idCardStaff.department_name}</span>

              <div className="mt-3.5 pt-3 border-t border-slate-800 grid grid-cols-3 gap-1 text-left text-[11px]">
                <div className="bg-slate-800/80 p-1.5 rounded-lg text-center">
                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Biometric PIN</span>
                  <span className="font-mono font-black text-emerald-400 text-xs">#{idCardStaff.biometric_pin}</span>
                </div>
                <div className="bg-slate-800/80 p-1.5 rounded-lg text-center">
                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Role</span>
                  <span className="text-white font-bold text-[10px] uppercase">{idCardStaff.role}</span>
                </div>
                <div className="bg-slate-800/80 p-1.5 rounded-lg text-center">
                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Status</span>
                  <span className="text-emerald-400 font-bold text-[10px]">ACTIVE</span>
                </div>
              </div>

              <div className="mt-3 pt-2 bg-slate-950/80 rounded-xl p-2 flex items-center justify-center gap-2 text-[10px] text-slate-400 border border-slate-800">
                <QrCode className="w-4 h-4 text-red-400" />
                <span className="font-medium">Verified by Goinfi Biometric HRMS</span>
              </div>
            </div>

            {/* Print Button */}
            <div className="w-full mt-4 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print ID Badge</span>
              </button>
              <button
                onClick={() => setIdCardStaff(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE DEPARTMENTS MODAL */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    Manage Departments & Units
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create, organize, and manage corporate divisions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ADD NEW DEPARTMENT FORM */}
            <form onSubmit={handleAddDepartment} className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Add New Department</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Auto-syncs across system</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="e.g. News & Current Affairs"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                    placeholder="e.g. NEWS"
                    maxLength={6}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Description / Responsibilities
                </label>
                <input
                  type="text"
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  placeholder="e.g. Newsroom reporting, bulletin desk, and live coverage"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-600/20 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Department</span>
                </button>
              </div>
            </form>

            {/* LIST OF ACTIVE DEPARTMENTS */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Active Departments ({departments.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  {employees.length} staff registered
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {departments.map((dept) => {
                  const staffCount = employees.filter(e => e.department_id === dept.id || e.department_name === dept.name).length;
                  return (
                    <div
                      key={dept.id}
                      className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-bold text-[11px] flex items-center justify-center border border-indigo-100 shrink-0">
                          {dept.code}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{dept.name}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {staffCount} staff
                            </span>
                          </div>
                          {dept.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{dept.description}</p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOINFI SMS BROADCAST & NOTICE CENTER MODAL */}
      {isSmsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <span>SMS Broadcast & Notice Center</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Goinfi SMS
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Send instant SMS notices in bulk to all staff or directly to individual employees
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSmsModalOpen(false);
                  setSmsStatusMsg(null);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSmsTab('bulk');
                  setSmsStatusMsg(null);
                }}
                className={`flex-1 py-2 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  smsTab === 'bulk' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>📢 Bulk SMS</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSmsTab('individual');
                  setSmsStatusMsg(null);
                }}
                className={`flex-1 py-2 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  smsTab === 'individual' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>👤 Individual SMS</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSmsTab('logs');
                  setSmsStatusMsg(null);
                }}
                className={`py-2 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  smsTab === 'logs' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Sent History ({smsLogs.length})</span>
              </button>
            </div>

            {/* Status Alert */}
            {smsStatusMsg && (
              <div className={`p-3 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border ${
                smsStatusMsg.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {smsStatusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span className="font-semibold">{smsStatusMsg.text}</span>
                </div>
              </div>
            )}

            {/* TAB 1 & TAB 2: SMS COMPOSER FORM */}
            {(smsTab === 'bulk' || smsTab === 'individual') && (
              <form onSubmit={handleSendSmsBroadcast} className="space-y-4 text-xs">
                {/* RECIPIENT SELECTOR */}
                {smsTab === 'bulk' ? (
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                        🎯 Target Audience
                      </label>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                        {smsTargetDept === 'ALL' 
                          ? `All Staff (${employees.length})` 
                          : `${employees.filter(e => e.department_name === smsTargetDept || e.department_id === smsTargetDept).length} Staff`}
                      </span>
                    </div>

                    <select
                      value={smsTargetDept}
                      onChange={e => setSmsTargetDept(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="ALL">🌐 All Staff ({employees.length})</option>
                      {departments.map(d => {
                        const count = employees.filter(e => e.department_id === d.id || e.department_name === d.name).length;
                        return (
                          <option key={d.id} value={d.name}>
                            🏢 {d.name} ({count} Staff)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2.5">
                    <label className="font-bold text-blue-950 uppercase tracking-wider text-[11px] block">
                      👤 Select Employee
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <select
                          value={smsSelectedStaffId}
                          onChange={e => {
                            setSmsSelectedStaffId(e.target.value);
                            const chosen = employees.find(emp => emp.id === e.target.value || emp.biometric_pin === e.target.value);
                            if (chosen) {
                              const digits = (chosen.phone || '').replace(/[^0-9]/g, '');
                              const clean = digits.startsWith('977') && digits.length === 13 ? digits.substring(3) : digits;
                              setSmsCustomPhone(clean);
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Select Employee ({employees.length}) --</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              PIN #{emp.biometric_pin} - {emp.full_name} ({emp.designation})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex rounded-xl overflow-hidden border border-blue-300 focus-within:ring-2 focus-within:ring-blue-500">
                          <span className="bg-blue-100/80 px-2.5 py-2 text-slate-600 font-mono font-bold text-xs border-r border-blue-200">
                            +977
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder="98xxxxxxxx (Mobile Number)"
                            value={smsCustomPhone}
                            onChange={e => setSmsCustomPhone(e.target.value.replace(/[^0-9]/g, ''))}
                            className="flex-1 px-3 py-2 bg-white text-xs font-mono font-semibold text-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PRESET NOTICE TEMPLATES */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Quick Preset Templates</span>
                    </span>
                    <span className="text-[10px] text-slate-400">1-click insert</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSmsMessage('Dear {name}, there will be an important staff meeting today at 2:00 PM in the hall. Please ensure your punctual attendance. - AP1 TV')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-slate-200"
                    >
                      🚨 Urgent Meeting
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmsMessage('Dear {name}, please be informed that tomorrow is an official public holiday. Office remains closed except for live broadcast staff. - AP1 TV')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-slate-200"
                    >
                      🗓️ Public Holiday
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmsMessage('Dear {name}, your monthly salary has been disbursed to your bank account. Check your Staff Portal for payslip details. - AP1 TV')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-slate-200"
                    >
                      💰 Salary Disbursed
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmsMessage('Dear {name}, please make sure to record your daily biometric punch when arriving and leaving the office. - AP1 TV HR')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-slate-200"
                    >
                      ⏰ Attendance Compliance
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmsMessage('')}
                      className="px-2 py-1 text-slate-400 hover:text-slate-600 rounded-lg text-[10px] font-medium cursor-pointer"
                    >
                      ✕ Clear
                    </button>
                  </div>
                </div>

                {/* MESSAGE TEXTAREA */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      SMS Message Text *
                    </label>
                    <div className="text-[11px] font-mono">
                      <span className="text-slate-600">{smsMessage.length} characters</span>
                      <span className="text-slate-400 mx-1">•</span>
                      <span className="font-bold text-emerald-700">
                        {Math.ceil(smsMessage.length / 160) || 1} SMS per staff
                      </span>
                    </div>
                  </div>

                  <textarea
                    required
                    rows={4}
                    value={smsMessage}
                    onChange={e => setSmsMessage(e.target.value)}
                    placeholder="Type your message here... (use {name} to personalize each message with employee name)"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-sans leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    💡 Tip: Include <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-bold">&#123;name&#125;</code> in your message to automatically personalize it with each employee's name.
                  </p>
                </div>

                {/* DISPATCH ACTION BUTTONS */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500">
                    ⚡ SMS notices will be delivered directly to employee mobile numbers via Goinfi SMS Gateway.
                  </span>

                  {smsTab === 'individual' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={smsSending || !smsMessage.trim()}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        {smsSending ? <Radio className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>{smsSending ? 'Sending SMS...' : 'Send SMS'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={smsSending || !smsMessage.trim()}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        {smsSending ? <Radio className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>
                          {smsSending 
                            ? 'Sending SMS...' 
                            : `Send Bulk SMS (${smsTargetDept === 'ALL' ? employees.length : employees.filter(e => e.department_name === smsTargetDept || e.department_id === smsTargetDept).length} Staff)`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </form>
            )}

            {/* TAB 3: SMS SENT HISTORY / LOGS */}
            {smsTab === 'logs' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Recent Sent Notices ({smsLogs.length})
                  </span>
                  {smsLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSmsLogs([]);
                        if (typeof window !== 'undefined') localStorage.removeItem('goinfi_sms_logs');
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      Clear History
                    </button>
                  )}
                </div>

                {smsLogs.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-medium">No SMS broadcast records found.</p>
                    <p className="text-[11px] mt-0.5">All sent SMS broadcasts will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {smsLogs.map((log: any) => (
                      <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{log.target}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {log.recipientCount} Delivered
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.sentAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 text-[11px] leading-relaxed">
                          {log.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: STAFF PORTAL REGISTRATION APPROVALS */}
      {/* ========================================================================= */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">Portal Registration Approvals</h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                      {pendingRegistrations.length} Pending
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review and authorize staff accounts created via the mobile portal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsApprovalModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {pendingRegistrations.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80" />
                  <p className="text-sm font-bold text-slate-700">No Pending Approvals</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    All new staff registrations are up-to-date and authorized.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRegistrations.map((req: any) => (
                    <div
                      key={req.pin}
                      className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-start gap-3">
                        {req.photo_url && !req.photo_url.includes('unsplash') ? (
                          <img
                            src={req.photo_url}
                            alt={req.staffName}
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-amber-600/15 border border-amber-500/30 flex items-center justify-center text-amber-700 font-mono font-black text-sm shrink-0">
                            #{req.pin}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{req.staffName}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              PIN #{req.pin}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {req.designation || 'Staff Member'} • <span className="font-medium text-slate-700">{req.department_name || 'Operations'}</span>
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1 font-mono font-medium text-slate-700">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {req.phone}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {req.registeredAt ? new Date(req.registeredAt).toLocaleString() : 'Just now'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/50">
                        <button
                          onClick={() => handleRejectRegistration(req.pin)}
                          disabled={approvalLoading === req.pin}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                          title="Reject this registration"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleApproveRegistration(req.pin)}
                          disabled={approvalLoading === req.pin}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                          title="Authorize and activate staff portal account"
                        >
                          {approvalLoading === req.pin ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Approve & Activate</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Instant SMS status alert is automatically sent to the staff member upon Approve or Reject.</span>
              </span>
              <button
                type="button"
                onClick={() => setIsApprovalModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
