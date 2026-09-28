'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';
import { initialEmployees } from '@/lib/mock-data';
import { PayrollRecord, Employee } from '@/lib/types';
import { generatePayslipPdf } from '@/lib/pdf/payslip-generator';
import { 
  CircleDollarSign, 
  Download, 
  Send, 
  FileText, 
  Calculator, 
  Search, 
  CreditCard,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Edit3,
  Check,
  X,
  User,
  Sliders
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function PayrollPage() {
  const { t, language } = useLanguage();
  const { role } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState('9'); // September
  const [selectedYear, setSelectedYear] = useState('2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);

  // Accounts Department Manual Hours Configuration
  const [workingDaysInput, setWorkingDaysInput] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_accounts_working_days');
      if (saved) return Number(saved);
    }
    return 26;
  });

  const [targetMonthlyHours, setTargetMonthlyHours] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_accounts_target_hours');
      if (saved) return Number(saved);
    }
    return 208.0; // 26 days * 8 hours
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Staff Adjustment Modal State
  const [adjustingStaff, setAdjustingStaff] = useState<PayrollRecord | null>(null);
  const [adjustedHours, setAdjustedHours] = useState<number>(0);

  // Load all active employees (excluding master admin)
  const [employeesList, setEmployeesList] = useState<Employee[]>(() => {
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

  // Sync staff list from API
  useEffect(() => {
    fetch('/api/staff')
      .then(res => res.json())
      .then(d => {
        if (d.success && Array.isArray(d.staff) && d.staff.length > 0) {
          const clean = d.staff.filter((p: any) => String(p.biometric_pin) !== '999' && !p.is_master_admin && p.id !== 'emp-master');
          setEmployeesList(clean);
          if (typeof window !== 'undefined') {
            localStorage.setItem('goinfi_staff_list', JSON.stringify(clean));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Calculate payroll based on Accounts-defined Target Working Hours
  const calculateRecords = (targetHours: number, days: number): PayrollRecord[] => {
    return employeesList.map((emp, i) => {
      // Base salary (defaults to 0 if not set)
      const baseSalary = emp.base_salary !== undefined && emp.base_salary !== null ? Number(emp.base_salary) : 0;
      
      // Hourly Rate = Base Salary ÷ Target Monthly Hours
      const hourlyRate = targetHours > 0 ? baseSalary / targetHours : 0;

      // Realistic logged hours from biometrics (reflecting punctuality & late arrivals)
      // Some staff have slight late arrival deficit (e.g. 200h, 202h out of 208h)
      let actualHours: number;
      if (typeof window !== 'undefined') {
        const savedHour = localStorage.getItem(`goinfi_actual_hours_${emp.id}_${selectedYear}_${selectedMonth}`);
        if (savedHour) {
          actualHours = Number(savedHour);
        } else {
          // Default distribution: most staff 208h, some with minor late deficits
          if (i === 0) actualHours = targetHours; // Gift (HRMS Manager) is 100% on target
          else if (i % 5 === 1) actualHours = Math.max(0, targetHours - 6.5); // 6.5 hrs late deficit
          else if (i % 5 === 2) actualHours = Math.max(0, targetHours - 12.0); // 12 hrs late deficit
          else if (i % 5 === 3) actualHours = Math.max(0, targetHours - 3.5); // 3.5 hrs late deficit
          else actualHours = targetHours;
        }
      } else {
        actualHours = targetHours;
      }

      // Shortfall / Deficit Hours = Target Hours - Actual Logged Hours
      const shortfallHours = Math.max(0, Number((targetHours - actualHours).toFixed(1)));

      // Late Arrival / Shortfall Deduction = Shortfall Hours * Hourly Rate
      const lateDeduction = Math.round(shortfallHours * hourlyRate);

      // Other attendance factors
      const absentDays = (i === 28) ? 1 : (i === 29) ? 2 : 0;
      const unpaidDays = (i === 30) ? 1 : 0;
      const dailyRate = baseSalary / days;
      const absentDeduction = Math.round(absentDays * dailyRate);
      const unpaidLeaveDeduction = Math.round(unpaidDays * dailyRate);
      const advanceDeduction = i === 4 ? 5000 : 0;
      
      // Approved Overtime Pay
      const overtimeHours = (i % 3 === 0 && i !== 0) ? 4 : (i === 0 ? 2 : 0);
      const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5);
      const allowances = i < 3 ? 10000 : 3000;
      const taxDeduction = Math.round(baseSalary * 0.01); // 1% SST in Nepal

      const totalDeductions = lateDeduction + absentDeduction + unpaidLeaveDeduction + advanceDeduction + taxDeduction;
      const netSalary = Math.round(baseSalary + allowances + overtimePay - totalDeductions);

      return {
        id: `pr-${emp.id}-${selectedYear}-${selectedMonth}`,
        employee_id: emp.id,
        employee_name: emp.full_name,
        employee_designation: emp.designation,
        department_name: emp.department_name || 'Broadcasting',
        pan_number: emp.pan_number || 'PAN60129381',
        bank_name: emp.bank_name || 'NIC Asia Bank',
        bank_account_number: emp.bank_account_number || '10928374829101',
        year: Number(selectedYear),
        month: Number(selectedMonth),
        base_salary: baseSalary,
        working_days: days,
        target_monthly_hours: targetHours,
        actual_worked_hours: actualHours,
        shortfall_hours: shortfallHours,
        hourly_rate: Number(hourlyRate.toFixed(2)),
        present_days: days - absentDays - unpaidDays,
        absent_days: absentDays,
        late_days: shortfallHours > 0 ? Math.ceil(shortfallHours / 2) : 0,
        paid_leave_days: 1,
        unpaid_leave_days: unpaidDays,
        overtime_hours: overtimeHours,
        overtime_pay: overtimePay,
        allowances,
        late_deduction: lateDeduction,
        absent_deduction: absentDeduction,
        unpaid_leave_deduction: unpaidLeaveDeduction,
        advance_deduction: advanceDeduction,
        tax_deduction: taxDeduction,
        net_salary: netSalary,
        status: i < 5 ? 'paid' : 'approved',
        payment_method: 'Bank Transfer'
      };
    });
  };

  const [payrolls, setPayrolls] = useState<PayrollRecord[]>(() => {
    return calculateRecords(targetMonthlyHours, workingDaysInput);
  });

  // Handle saving Accounts Monthly Hours Configuration
  const handleApplyAccountsHours = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_accounts_working_days', String(workingDaysInput));
      localStorage.setItem('goinfi_accounts_target_hours', String(targetMonthlyHours));
    }
    const updated = calculateRecords(targetMonthlyHours, workingDaysInput);
    setPayrolls(updated);
    showToast(`✓ Accounts Hours Applied! Target: ${targetMonthlyHours} hrs (${workingDaysInput} days) across all staff.`);
  };

  // Quick auto-calculation of hours when days change (26 days * 8 hrs = 208 hrs)
  const handleDaysChange = (days: number) => {
    setWorkingDaysInput(days);
    setTargetMonthlyHours(Number((days * 8).toFixed(1)));
  };

  // Handle individual staff actual hours adjustment
  const handleSaveStaffHours = () => {
    if (!adjustingStaff) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `goinfi_actual_hours_${adjustingStaff.employee_id}_${selectedYear}_${selectedMonth}`,
        String(adjustedHours)
      );
    }
    const updated = calculateRecords(targetMonthlyHours, workingDaysInput);
    setPayrolls(updated);
    setAdjustingStaff(null);
    showToast(`✓ Updated ${adjustingStaff.employee_name}'s monthly logged hours to ${adjustedHours} hrs.`);
  };

  const filteredPayrolls = payrolls.filter(p => 
    p.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.department_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Total Summary
  const totalGross = payrolls.reduce((acc, p) => acc + p.base_salary + p.allowances + p.overtime_pay, 0);
  const totalNet = payrolls.reduce((acc, p) => acc + p.net_salary, 0);
  const totalLateDeductions = payrolls.reduce((acc, p) => acc + p.late_deduction, 0);
  const totalShortfallHours = payrolls.reduce((acc, p) => acc + (p.shortfall_hours || 0), 0);
  const totalDeductions = totalGross - totalNet;

  const handleDownloadPdf = (payroll: PayrollRecord) => {
    const doc = generatePayslipPdf(payroll, 'AP1 Television');
    doc.save(`AP1_Payslip_${payroll.employee_name?.replace(/\s+/g, '_')}_Sep2026.pdf`);
  };

  const handleSendWhatsApp = async (payroll: PayrollRecord) => {
    const employee = employeesList.find(e => e.id === payroll.employee_id);
    const phone = employee?.phone || '9705355569';

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payslip',
          recipientPhone: phone,
          payload: {
            employeeName: payroll.employee_name,
            month: 'September',
            year: 2026,
            netSalary: payroll.net_salary,
            targetHours: payroll.target_monthly_hours,
            actualHours: payroll.actual_worked_hours,
            lateDeduction: payroll.late_deduction
          }
        })
      });
      const data = await res.json();
      if (data.detail?.link) {
        window.open(data.detail.link, '_blank');
      } else {
        alert(`WhatsApp payslip alert successfully sent to ${payroll.employee_name}!`);
      }
    } catch (e) {
      alert('Failed to send WhatsApp message: ' + e);
    }
  };

  const exportPayrollRegister = () => {
    const data = payrolls.map(p => ({
      'Staff PIN': p.employee_id,
      'Employee': p.employee_name,
      'Designation': p.employee_designation,
      'Department': p.department_name,
      'Base Salary (NPR)': p.base_salary,
      'Target Monthly Hours (Accounts)': p.target_monthly_hours,
      'Actual Logged Hours': p.actual_worked_hours,
      'Shortfall / Late Hours': p.shortfall_hours,
      'Hourly Rate (NPR/hr)': p.hourly_rate,
      'Late / Shortfall Deduction (NPR)': p.late_deduction,
      'Overtime Pay (NPR)': p.overtime_pay,
      'Allowances (NPR)': p.allowances,
      'Absent / LWP Deduction': p.absent_deduction + p.unpaid_leave_deduction,
      'Advance Repayment': p.advance_deduction,
      'Net Salary (NPR)': p.net_salary,
      'Status': p.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll Register');
    XLSX.writeFile(wb, `AP1_Payroll_Register_Sep_2026.xlsx`);
  };

  return (
    <DashboardShell
      title={t.navPayroll}
      subtitle="AP1 Television Monthly Payroll, Accounts Working Hours Control, and Pro-Rata Late Arrival Penalty Engine"
    >
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACCOUNTS DEPARTMENT WORKING HOURS CONTROL PANEL */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-bold uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-purple-300" />
              <span>Accounts Monthly Hours Engine (अकाउन्ट कार्य घण्टा इन्जिन)</span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Monthly Target Working Hours & Late Arrival Penalty
            </h2>
            <p className="text-xs text-purple-200/80 leading-relaxed">
              प्रत्येक महिना Accounts ले कुल कार्य दिन अनुसार आवश्यक कुल कार्य घण्टा (Monthly Target Hours) प्रविष्टि गर्दछ। बायोमेट्रिक मेसिनको हाजिरी अनुसार नपुगेको घण्टा (Shortfall/Late Arrival) हिसाब गरी सोही अनुपातमा Payslip मा तलब कट्टी गरिन्छ।
            </p>
          </div>

          {/* Accounts Manual Input Box */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div>
              <label className="text-[11px] font-bold text-purple-200 block mb-1">
                कुल कार्य दिन (Working Days)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={workingDaysInput}
                onChange={(e) => handleDaysChange(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-white/20 border border-white/25 rounded-xl text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-purple-200 block mb-1">
                कुल कार्य घण्टा (Target Hours)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="350"
                  value={targetMonthlyHours}
                  onChange={(e) => setTargetMonthlyHours(Number(e.target.value))}
                  className="w-28 px-3 py-2 bg-white/20 border border-white/25 rounded-xl text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-purple-300 pointer-events-none">
                  hrs
                </span>
              </div>
            </div>

            <div className="sm:self-end">
              <button
                onClick={handleApplyAccountsHours}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Calculator className="w-4 h-4" />
                <span>लागू & Recalculate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Formula Strip */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 text-purple-200">
            <span className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center text-[10px] font-bold">१</span>
            <span>प्रति घण्टा दर = Base Salary ÷ {targetMonthlyHours} hrs</span>
          </div>
          <div className="flex items-center gap-2 text-purple-200">
            <span className="w-5 h-5 rounded-full bg-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-300">२</span>
            <span>नपुगेको घण्टा = {targetMonthlyHours} hrs − बायोमेट्रिक घण्टा</span>
          </div>
          <div className="flex items-center gap-2 text-purple-200">
            <span className="w-5 h-5 rounded-full bg-red-500/30 flex items-center justify-center text-[10px] font-bold text-red-300">३</span>
            <span>कट्टी रकम = नपुगेको घण्टा × प्रति घण्टा दर</span>
          </div>
        </div>
      </div>

      {/* 4 Financial & Hours Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.grossSalary}</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              NPR {totalGross.toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">Base + Allowances + OT</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Late / Shortfall Deductions</p>
            <h3 className="text-xl font-bold text-amber-600 mt-1">
              NPR {totalLateDeductions.toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-amber-600 font-medium mt-0.5 block">
              {totalShortfallHours.toFixed(1)} hrs deficit deducted
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.deductions}</p>
            <h3 className="text-xl font-bold text-red-600 mt-1">
              NPR {totalDeductions.toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-red-500 font-medium mt-0.5 block">Lates, Absents, Tax, Advances</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.netSalary}</p>
            <h3 className="text-xl font-bold text-emerald-600 mt-1">
              NPR {totalNet.toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
              Disbursed to {payrolls.length} AP1 Staff
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchStaffPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
            >
              <option value="9">September 2026 (Ashwin 2083)</option>
              <option value="8">August 2026 (Bhadra 2083)</option>
              <option value="7">July 2026 (Shrawan 2083)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={exportPayrollRegister}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Register (Excel)</span>
          </button>

          {(role === 'admin' || role === 'hr') && (
            <button
              onClick={handleApplyAccountsHours}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-700 hover:bg-purple-600 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>{t.generatePayroll}</span>
            </button>
          )}
        </div>
      </div>

      {/* Payroll Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">{t.colStaff}</th>
                <th className="py-3.5 px-4">कार्य घण्टा (Target vs Logged)</th>
                <th className="py-3.5 px-4">{t.colBaseSalary}</th>
                <th className="py-3.5 px-4">Hourly Rate</th>
                <th className="py-3.5 px-4">Late Shortfall Deduct</th>
                <th className="py-3.5 px-4">OT Pay</th>
                <th className="py-3.5 px-4">{t.netSalary}</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Payslip & WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayrolls.map((p) => {
                const shortfall = p.shortfall_hours || 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Staff info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {p.employee_name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">{p.employee_name}</p>
                          <p className="text-[11px] text-slate-500 leading-tight">{p.employee_designation}</p>
                        </div>
                      </div>
                    </td>

                    {/* Target vs Logged Hours */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="font-bold text-slate-900 font-mono">
                            {p.actual_worked_hours?.toFixed(1)}
                          </span>
                          <span className="text-slate-400 text-[11px]"> / {p.target_monthly_hours?.toFixed(1)}h</span>
                        </div>

                        {shortfall > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                            -{shortfall.toFixed(1)}h
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                            ✓ Met
                          </span>
                        )}

                        <button
                          onClick={() => {
                            setAdjustingStaff(p);
                            setAdjustedHours(p.actual_worked_hours ?? targetMonthlyHours);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          title="Adjust staff monthly logged hours"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Base Salary */}
                    <td className="py-3 px-4 font-semibold text-slate-800 font-mono">
                      NPR {p.base_salary.toLocaleString('en-IN')}
                    </td>

                    {/* Hourly Rate */}
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      NPR {p.hourly_rate?.toFixed(2)}/h
                    </td>

                    {/* Late Shortfall Deduction */}
                    <td className="py-3 px-4 font-medium">
                      {p.late_deduction > 0 ? (
                        <div className="text-red-600 font-bold font-mono">
                          -NPR {p.late_deduction.toLocaleString('en-IN')}
                          <span className="block text-[10px] font-normal text-slate-400">
                            ({shortfall.toFixed(1)} hrs × NPR {p.hourly_rate?.toFixed(2)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-medium text-[11px]">No Penalty</span>
                      )}
                    </td>

                    {/* Overtime Pay */}
                    <td className="py-3 px-4 text-emerald-700 font-medium font-mono">
                      {p.overtime_pay > 0 ? `+NPR ${p.overtime_pay.toLocaleString('en-IN')}` : '-'}
                    </td>

                    {/* Net Salary */}
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm font-mono">
                      NPR {p.net_salary.toLocaleString('en-IN')}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {p.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Detail Modal */}
                        <button
                          onClick={() => setSelectedPayroll(p)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px] transition-colors"
                          title="View Payslip Breakdown"
                        >
                          <FileText className="w-3.5 h-3.5 text-purple-700 inline mr-1" />
                          <span>View</span>
                        </button>

                        {/* PDF Payslip */}
                        <button
                          onClick={() => handleDownloadPdf(p)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold text-[11px] transition-colors"
                          title="Download PDF Payslip"
                        >
                          <Download className="w-3.5 h-3.5 text-purple-700" />
                          <span>PDF</span>
                        </button>

                        {/* WhatsApp Send */}
                        <button
                          onClick={() => handleSendWhatsApp(p)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-[11px] transition-colors"
                          title="Dispatch Payslip via WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADJUST STAFF MONTHLY HOURS */}
      {/* ========================================================================= */}
      {adjustingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Adjust Monthly Logged Hours</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{adjustingStaff.employee_name} ({adjustingStaff.employee_designation})</p>
                </div>
              </div>
              <button
                onClick={() => setAdjustingStaff(null)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900">
                <p className="font-bold">Accounts Target Hours: {targetMonthlyHours} hrs</p>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  Hourly Rate for this staff: NPR {adjustingStaff.hourly_rate?.toFixed(2)}/hr
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Actual Logged Monthly Hours (बायोमेट्रिक अनुसार काम गरेको घण्टा)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={targetMonthlyHours + 50}
                  value={adjustedHours}
                  onChange={(e) => setAdjustedHours(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              {targetMonthlyHours - adjustedHours > 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <p className="font-bold">
                    Shortfall: {(targetMonthlyHours - adjustedHours).toFixed(1)} hrs
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Late deduction will be: -NPR {Math.round((targetMonthlyHours - adjustedHours) * (adjustingStaff.hourly_rate || 0)).toLocaleString('en-IN')}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-bold">
                  ✓ Full Target Met! No late deduction will be applied.
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingStaff(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStaffHours}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                >
                  Save & Update Payslip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAYSLIP DETAIL BREAKDOWN */}
      {/* ========================================================================= */}
      {selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-200 font-black">
                  AP1
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">AP1 Television - Payslip Detail</h3>
                  <p className="text-xs text-purple-200">September 2026 (Ashwin 2083)</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayroll(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs">
              {/* Staff Info */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{selectedPayroll.employee_name}</p>
                  <p className="text-slate-500 text-[11px]">{selectedPayroll.employee_designation} • {selectedPayroll.department_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 font-semibold">Payment Method</p>
                  <p className="font-bold text-slate-700">{selectedPayroll.payment_method}</p>
                </div>
              </div>

              {/* Working Hours Breakdown Box */}
              <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200/80 space-y-2">
                <p className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-700" />
                  <span>कार्य घण्टा गणना (Accounts Working Hours Calculation)</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-purple-200/60">
                  <div>
                    <span className="text-purple-700">Accounts Target Hours:</span>
                    <span className="font-bold text-purple-950 ml-1.5">{selectedPayroll.target_monthly_hours} hrs</span>
                  </div>
                  <div>
                    <span className="text-purple-700">Actual Logged Hours:</span>
                    <span className="font-bold text-purple-950 ml-1.5">{selectedPayroll.actual_worked_hours} hrs</span>
                  </div>
                  <div>
                    <span className="text-purple-700">Shortfall / Late Hours:</span>
                    <span className={`font-bold ml-1.5 ${(selectedPayroll.shortfall_hours || 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {selectedPayroll.shortfall_hours || 0} hrs
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-700">Hourly Pay Rate:</span>
                    <span className="font-bold text-purple-950 ml-1.5">NPR {selectedPayroll.hourly_rate?.toFixed(2)}/hr</span>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Earnings */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <p className="font-bold text-slate-800 border-b border-slate-200 pb-1">Earnings</p>
                  <div className="flex justify-between text-slate-600">
                    <span>Base Salary:</span>
                    <span className="font-mono font-semibold text-slate-900">NPR {selectedPayroll.base_salary.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Allowances:</span>
                    <span className="font-mono font-semibold text-slate-900">NPR {selectedPayroll.allowances.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Overtime Pay:</span>
                    <span className="font-mono font-semibold text-emerald-700">+NPR {selectedPayroll.overtime_pay.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <p className="font-bold text-slate-800 border-b border-slate-200 pb-1">Deductions</p>
                  <div className="flex justify-between text-slate-600">
                    <span>Late Shortfall:</span>
                    <span className="font-mono font-semibold text-red-600">-NPR {selectedPayroll.late_deduction.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (1% SST):</span>
                    <span className="font-mono font-semibold text-red-600">-NPR {selectedPayroll.tax_deduction.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Advance / LWP:</span>
                    <span className="font-mono font-semibold text-red-600">
                      -NPR {(selectedPayroll.advance_deduction + selectedPayroll.absent_deduction).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Salary Highlight */}
              <div className="p-4 bg-slate-900 rounded-2xl text-white flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-purple-200 font-semibold uppercase">Net Salary Payable</p>
                  <h4 className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                    NPR {selectedPayroll.net_salary.toLocaleString('en-IN')}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadPdf(selectedPayroll)}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={() => handleSendWhatsApp(selectedPayroll)}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
