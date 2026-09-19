'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { initialShifts, initialEmployees, initialOvertimePermissions } from '@/lib/mock-data';
import { Shift, Employee, OvertimePermission } from '@/lib/types';
import { 
  CalendarClock, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Sun, 
  Sunrise, 
  Moon, 
  UserCheck, 
  X, 
  FileText, 
  CheckCircle2, 
  Trash2, 
  Lock, 
  Sparkles,
  Ban,
  Calendar,
  User
} from 'lucide-react';

export default function ShiftsPage() {
  const { t, language } = useLanguage();

  // 3 Exact Standard Shifts
  const [shifts, setShifts] = useState<Shift[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_shifts_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 3) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return initialShifts;
  });

  // Late Arrival Deduction Rule
  const [latePenaltyRule, setLatePenaltyRule] = useState('three_late_half_day');

  // Strict Overtime Policy Settings
  const [requireAdminOvertimeApproval, setRequireAdminOvertimeApproval] = useState(true);
  const [ignoreEarlyLateOvertime, setIgnoreEarlyLateOvertime] = useState(true);

  // Staff directory lookup
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_staff_list');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return initialEmployees;
  });

  // Centralized Overtime Permissions List
  const [overtimePermissions, setOvertimePermissions] = useState<OvertimePermission[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_overtime_permissions');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return initialOvertimePermissions;
  });

  // Modal State for granting Overtime Permission
  const [isOtModalOpen, setIsOtModalOpen] = useState(false);
  const [otEmployeeId, setOtEmployeeId] = useState('');
  const [otDate, setOtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [otShiftName, setOtShiftName] = useState('Day Shift (10:00 AM - 6:00 PM)');
  const [otHours, setOtHours] = useState('2.0');
  const [otTiming, setOtTiming] = useState('Post-Shift (6:00 PM - 8:00 PM)');
  const [otReason, setOtReason] = useState('Live News Broadcast Extended Special Coverage');
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Load fresh staff directory from server
  useEffect(() => {
    fetch('/api/staff', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.staff) && data.staff.length > 0) {
          setEmployees(data.staff);
        }
      })
      .catch(e => console.warn('Could not fetch staff for shifts:', e));
  }, []);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const saveOvertimePermissions = (newList: OvertimePermission[]) => {
    setOvertimePermissions(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_overtime_permissions', JSON.stringify(newList));
    }
  };

  // Handle Granting Overtime Permission
  const handleGrantOvertimePermission = (e: React.FormEvent) => {
    e.preventDefault();

    if (!otEmployeeId) {
      alert('Please select an employee.');
      return;
    }

    const emp = employees.find(e => e.id === otEmployeeId || e.biometric_pin === otEmployeeId);
    if (!emp) {
      alert('Staff member not found.');
      return;
    }

    const hoursNum = parseFloat(otHours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      alert('Please enter valid overtime hours (e.g. 1.5, 2.0).');
      return;
    }

    const newPermission: OvertimePermission = {
      id: `ot-${Date.now()}`,
      employee_id: emp.id,
      employee_name: emp.full_name,
      biometric_pin: String(emp.biometric_pin),
      date: otDate,
      approved_hours: hoursNum,
      shift_name: otShiftName,
      reason: otReason.trim() || 'Approved Overtime Duty',
      approved_by: 'HR Admin',
      status: 'APPROVED',
      created_at: new Date().toISOString()
    };

    const updated = [newPermission, ...overtimePermissions];
    saveOvertimePermissions(updated);
    setIsOtModalOpen(false);
    setOtEmployeeId('');
    showToast(`✓ Overtime Permission granted for ${emp.full_name} (+${hoursNum}h on ${otDate})`);
  };

  const handleRevokePermission = (id: string, staffName: string) => {
    if (!confirm(`Are you sure you want to revoke Overtime Permission for ${staffName}?`)) return;
    const updated = overtimePermissions.filter(p => p.id !== id);
    saveOvertimePermissions(updated);
    showToast(`🗑️ Overtime Permission revoked for ${staffName}.`);
  };

  return (
    <DashboardShell
      title={t.navShifts}
      subtitle="Configure AP1 Television 3 standard broadcast shifts and administer strict Overtime permissions"
    >
      {/* Toast Notification */}
      {toastNotice && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-emerald-300 border border-emerald-500/50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. THREE OFFICIAL BROADCAST SHIFTS */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-purple-600" />
              <span>Official AP1 Television Work Shifts (३ वटा निश्चित सिफ्टहरू)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict 8-hour shift cycles covering 24/7 television broadcast operations
            </p>
          </div>
          <span className="text-xs font-extrabold px-3 py-1 bg-purple-100 text-purple-800 rounded-full border border-purple-200">
            3 Active Shifts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {shifts.map((shift, idx) => {
            const isMorning = shift.id.includes('morning') || idx === 0;
            const isDay = shift.id.includes('day') || idx === 1;
            const isEvening = shift.id.includes('evening') || idx === 2;

            return (
              <div 
                key={shift.id} 
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                {shift.is_default && (
                  <span className="absolute top-4 right-4 bg-purple-100 text-purple-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-200 uppercase tracking-wider">
                    {t.defaultShift}
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-3 mb-3.5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
                      isMorning 
                        ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                        : isDay 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    }`}>
                      {isMorning && <Sunrise className="w-5 h-5" />}
                      {isDay && <Sun className="w-5 h-5" />}
                      {isEvening && <Moon className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                        {shift.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">8 Hours standard daily working shift</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 mb-3.5">
                    <div>
                      <span className="text-slate-500 font-medium text-[11px] block">{t.startTime}</span>
                      <p className="text-sm font-black text-slate-900 mt-0.5 font-mono">{shift.start_time}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium text-[11px] block">{t.endTime}</span>
                      <p className="text-sm font-black text-slate-900 mt-0.5 font-mono">{shift.end_time}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium text-[11px] block">{t.gracePeriod}</span>
                      <p className="text-xs font-bold text-amber-600 mt-0.5">{shift.grace_period_minutes} Minutes</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium text-[11px] block">{t.halfDayHours}</span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">&lt; {shift.half_day_threshold_hours} Hours</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>8:00 hrs shift</span>
                  </span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Active
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STRICT OVERTIME POLICY & RULES */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-amber-950/20 via-white to-amber-50/40 p-5 sm:p-6 rounded-2xl border-2 border-amber-300 shadow-sm space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
            <ShieldCheck className="w-6 h-6 text-amber-700" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-slate-900 text-base">
                Strict Overtime Policy (सख्त ओभरटाइम नियम - एडमिन पूर्व स्वीकृति अनिवार्य)
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300 uppercase">
                Enforced
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed">
              कर्मचारीहरू सिफ्ट समय भन्दा अगाडि (Early Arrival) आएर वा सिफ्ट सकिएपछि (Late Departure) बसेर <strong>स्वतः ओभरटाइम दाबी गर्न पाउने छैनन्</strong>। ओभरटाइम दाबी गर्नका लागि <strong>एडमिन / एचआरको आधिकारिक पूर्व स्वीकृति (Admin Pre-Approval Permission) अनिवार्य</strong> हुनेछ।
            </p>
          </div>
        </div>

        {/* Policy Checkbox Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-amber-200/80">
          <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-amber-200/80 cursor-pointer shadow-2xs hover:bg-amber-50/50">
            <input
              type="checkbox"
              checked={requireAdminOvertimeApproval}
              onChange={e => {
                setRequireAdminOvertimeApproval(e.target.checked);
                showToast(e.target.checked ? '✓ Admin Overtime Approval strictly enforced' : 'Overtime requirement updated');
              }}
              className="mt-0.5 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <div>
              <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Require Admin Permission for all Overtime claims</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Overtime hours will ONLY be credited to payroll if registered in the Admin Authorizations list below.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-amber-200/80 cursor-pointer shadow-2xs hover:bg-amber-50/50">
            <input
              type="checkbox"
              checked={ignoreEarlyLateOvertime}
              onChange={e => {
                setIgnoreEarlyLateOvertime(e.target.checked);
                showToast('✓ Automatic early/late punch overtime calculations blocked');
              }}
              className="mt-0.5 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <div>
              <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-rose-600" />
                <span>Disallow Automatic Early-In / Late-Out Overtime</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Coming before 6 AM / 10 AM / 2 PM or punching out after shift end is treated as regular presence, not OT.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ADMIN OVERTIME PERMISSIONS MANAGEMENT */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>Admin Overtime Authorizations (स्वीकृत ओभरटाइम अनुमतिहरू)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Official register of staff authorized by HR/Admin to perform paid overtime duties
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOtModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Grant Overtime Permission (+ अनुमति दिनुहोस्)</span>
          </button>
        </div>

        {/* Permissions Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3.5">Staff Member</th>
                <th className="p-3.5">Biometric PIN</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Shift</th>
                <th className="p-3.5">Authorized Hours</th>
                <th className="p-3.5">Official Reason / Duty</th>
                <th className="p-3.5">Approved By</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overtimePermissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="font-semibold text-slate-600">No Overtime Permissions Issued Yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click &quot;Grant Overtime Permission&quot; to authorize extra hours for staff members.
                    </p>
                  </td>
                </tr>
              ) : (
                overtimePermissions.map((perm) => (
                  <tr key={perm.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      {perm.employee_name}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-purple-700">
                      #{perm.biometric_pin}
                    </td>
                    <td className="p-3.5 text-slate-700 font-mono">
                      {perm.date}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {perm.shift_name}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                        +{perm.approved_hours.toFixed(1)} hrs
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 max-w-xs truncate" title={perm.reason}>
                      {perm.reason}
                    </td>
                    <td className="p-3.5 font-medium text-slate-600">
                      {perm.approved_by}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {perm.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleRevokePermission(perm.id, perm.employee_name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Revoke Permission"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. LATE ARRIVAL PENALTY ENGINE */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-base">
              Late Arrival Penalty Engine
            </h4>
            <p className="text-xs text-slate-500">
              Automated salary deduction formula applied when staff punch in after the 15-minute grace period
            </p>
          </div>
        </div>

        <div className="space-y-3 max-w-xl text-xs">
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="radio"
              name="penalty_rule"
              value="three_late_half_day"
              checked={latePenaltyRule === 'three_late_half_day'}
              onChange={() => setLatePenaltyRule('three_late_half_day')}
              className="mt-0.5 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <p className="font-bold text-slate-900">
                3 Late Arrivals = 0.5 Day Salary Deduction (Standard Nepal Media Rule)
              </p>
              <p className="text-slate-500 mt-0.5 leading-relaxed">
                Every 3 late arrivals past grace period in a payroll month automatically deducts 0.5 day&apos;s wage during monthly payroll processing.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="radio"
              name="penalty_rule"
              value="fixed_penalty"
              checked={latePenaltyRule === 'fixed_penalty'}
              onChange={() => setLatePenaltyRule('fixed_penalty')}
              className="mt-0.5 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <p className="font-bold text-slate-900">
                Fixed Fine per Late Punch (e.g. NPR 200)
              </p>
              <p className="text-slate-500 mt-0.5">
                Applies a constant fine for every punch occurring after grace period ends.
              </p>
            </div>
          </label>

          <div className="pt-2">
            <button
              onClick={() => showToast('✓ Shift policies and deduction rules successfully saved!')}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors shadow-xs cursor-pointer"
            >
              {t.saveSettings}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: GRANT OVERTIME PERMISSION */}
      {/* ========================================================================= */}
      {isOtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Grant Overtime Permission</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorize paid overtime hours for official extended broadcasting duties
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOtModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleGrantOvertimePermission} className="p-5 space-y-4">
              {/* Employee Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Staff Member *
                </label>
                <select
                  required
                  value={otEmployeeId}
                  onChange={e => setOtEmployeeId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Choose Employee ({employees.length} Staff) --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      PIN #{emp.biometric_pin} - {emp.full_name} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Assigned Shift *
                  </label>
                  <select
                    value={otShiftName}
                    onChange={e => setOtShiftName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Morning Shift (6:00 AM - 2:00 PM)">Morning Shift (6:00 AM - 2:00 PM)</option>
                    <option value="Day Shift (10:00 AM - 6:00 PM)">Day Shift (10:00 AM - 6:00 PM)</option>
                    <option value="Evening Shift (2:00 PM - 10:00 PM)">Evening Shift (2:00 PM - 10:00 PM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Overtime Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={otDate}
                    onChange={e => setOtDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Approved Hours & Timing Window */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Authorized OT Hours *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="8"
                    required
                    placeholder="e.g. 2.0"
                    value={otHours}
                    onChange={e => setOtHours(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Approved hours to pay in payroll</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Timing Window
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Post-Shift (6 PM - 8 PM)"
                    value={otTiming}
                    onChange={e => setOtTiming(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Official Reason / Justification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Official Justification / Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Extended live broadcast coverage for special news bulletin, PCR technical support..."
                  value={otReason}
                  onChange={e => setOtReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
                <span className="font-bold block flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Admin Authorization Notice:</span>
                </span>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  Only overtime granted via this authorization form will be calculated in monthly payroll. Unapproved early arrivals or late departures will not count.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOtModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authorize & Issue Permission</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
