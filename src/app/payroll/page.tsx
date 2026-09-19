'use client';

import React, { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';
import { initialEmployees } from '@/lib/mock-data';
import { PayrollRecord, AdvanceSalary } from '@/lib/types';
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
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function PayrollPage() {
  const { t, language } = useLanguage();
  const { role } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState('9'); // September
  const [selectedYear, setSelectedYear] = useState('2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);

  // Generate initial calculated payroll records for all 32 staff
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>(() => {
    return initialEmployees.map((emp, i) => {
      const workingDays = 26;
      let lateDays = (i * 3) % 5;
      let absentDays = i === 28 ? 1 : i === 29 ? 2 : 0;
      let unpaidDays = i === 30 ? 1 : 0;
      let overtimeHours = i % 3 === 0 ? 8 : 0;

      const dailyRate = emp.base_salary / workingDays;
      const hourlyRate = dailyRate / 8;

      // Late deduction (e.g. every 3 lates = 0.5 day wage)
      const latePenaltyDays = Math.floor(lateDays / 3) * 0.5;
      const lateDeduction = Math.round(latePenaltyDays * dailyRate);
      const absentDeduction = Math.round(absentDays * dailyRate);
      const unpaidLeaveDeduction = Math.round(unpaidDays * dailyRate);
      const advanceDeduction = i === 4 ? 5000 : 0;
      const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5);
      const allowances = i < 3 ? 10000 : 3000;
      const taxDeduction = Math.round((emp.base_salary * 0.01)); // 1% Social Security Tax in Nepal

      const totalDeductions = lateDeduction + absentDeduction + unpaidLeaveDeduction + advanceDeduction + taxDeduction;
      const netSalary = Math.round(emp.base_salary + allowances + overtimePay - totalDeductions);

      return {
        id: `pr-${emp.id}-${selectedYear}-${selectedMonth}`,
        employee_id: emp.id,
        employee_name: emp.full_name,
        employee_designation: emp.designation,
        department_name: emp.department_name,
        pan_number: emp.pan_number,
        bank_name: emp.bank_name,
        bank_account_number: emp.bank_account_number,
        year: 2026,
        month: 9,
        base_salary: emp.base_salary,
        working_days: workingDays,
        present_days: workingDays - absentDays - unpaidDays,
        absent_days: absentDays,
        late_days: lateDays,
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
  });

  const filteredPayrolls = payrolls.filter(p => 
    p.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.department_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Total Summary
  const totalGross = payrolls.reduce((acc, p) => acc + p.base_salary + p.allowances + p.overtime_pay, 0);
  const totalNet = payrolls.reduce((acc, p) => acc + p.net_salary, 0);
  const totalDeductions = totalGross - totalNet;

  const handleDownloadPdf = (payroll: PayrollRecord) => {
    const doc = generatePayslipPdf(payroll);
    doc.save(`Payslip_${payroll.employee_name?.replace(/\s+/g, '_')}_Sep2026.pdf`);
  };

  const handleSendWhatsApp = async (payroll: PayrollRecord) => {
    const employee = initialEmployees.find(e => e.id === payroll.employee_id);
    const phone = employee?.phone || '9779841234567';

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
            netSalary: payroll.net_salary
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
      'Employee': p.employee_name,
      'Designation': p.employee_designation,
      'Department': p.department_name,
      'Base Salary': p.base_salary,
      'Allowances': p.allowances,
      'Overtime Pay': p.overtime_pay,
      'Late Deduction': p.late_deduction,
      'Absent Deduction': p.absent_deduction,
      'Tax (1% SST)': p.tax_deduction,
      'Advance Repayment': p.advance_deduction,
      'Net Salary (NPR)': p.net_salary,
      'Status': p.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll Register');
    XLSX.writeFile(wb, `Goinfi_Payroll_Register_Sep_2026.xlsx`);
  };

  return (
    <DashboardShell
      title={t.navPayroll}
      subtitle="Monthly salary processing, automated deductions, overtime, and PDF payslips"
    >
      {/* 3 Executive Financial Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.grossSalary}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              NPR {totalGross.toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">Base + Allowances + OT</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.deductions}</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">
              NPR {totalDeductions.toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-red-500 font-medium mt-0.5 block">Lates, Absents, Tax, Advances</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.netSalary}</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              NPR {totalNet.toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">Total Disbursed to 32 Staff</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchStaffPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Register</span>
          </button>

          {(role === 'admin' || role === 'hr') && (
            <button
              onClick={() => alert('Monthly payroll recalculated with latest ZKTeco attendance and late penalty deductions!')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
            >
              <Calculator className="w-4 h-4" />
              <span>{t.generatePayroll}</span>
            </button>
          )}
        </div>
      </div>

      {/* Payroll Register Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">{t.colStaff}</th>
                <th className="py-3 px-4">{t.colBaseSalary}</th>
                <th className="py-3 px-4">OT Pay</th>
                <th className="py-3 px-4">Late Deduct</th>
                <th className="py-3 px-4">Absent / LWP</th>
                <th className="py-3 px-4">Advance</th>
                <th className="py-3 px-4">{t.netSalary}</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Payslip & WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayrolls.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Staff info */}
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900 leading-tight">{p.employee_name}</p>
                    <p className="text-[11px] text-slate-500 leading-tight">{p.employee_designation}</p>
                  </td>

                  {/* Base Salary */}
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    NPR {p.base_salary.toLocaleString('en-IN')}
                  </td>

                  {/* Overtime Pay */}
                  <td className="py-3 px-4 text-emerald-700 font-medium">
                    {p.overtime_pay > 0 ? `+NPR ${p.overtime_pay.toLocaleString('en-IN')}` : '-'}
                  </td>

                  {/* Late Deduction */}
                  <td className="py-3 px-4 text-red-600 font-medium">
                    {p.late_deduction > 0 ? `-NPR ${p.late_deduction.toLocaleString('en-IN')}` : '-'}
                  </td>

                  {/* Absent / LWP */}
                  <td className="py-3 px-4 text-red-600 font-medium">
                    {p.absent_deduction + p.unpaid_leave_deduction > 0 
                      ? `-NPR ${(p.absent_deduction + p.unpaid_leave_deduction).toLocaleString('en-IN')}` 
                      : '-'}
                  </td>

                  {/* Advance */}
                  <td className="py-3 px-4 text-amber-700 font-medium">
                    {p.advance_deduction > 0 ? `-NPR ${p.advance_deduction.toLocaleString('en-IN')}` : '-'}
                  </td>

                  {/* Net Salary */}
                  <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                    NPR {p.net_salary.toLocaleString('en-IN')}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
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
                      {/* PDF Payslip */}
                      <button
                        onClick={() => handleDownloadPdf(p)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px] transition-colors"
                        title="Download PDF Payslip"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600" />
                        <span>PDF</span>
                      </button>

                      {/* WhatsApp Send */}
                      <button
                        onClick={() => handleSendWhatsApp(p)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-[11px] transition-colors"
                        title="Dispatch Payslip via WhatsApp Meta Cloud API"
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
