'use client';

import React, { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { initialEmployees, initialDepartments } from '@/lib/mock-data';
import { 
  FileBarChart, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  Users, 
  Building2,
  TrendingUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const { t, language } = useLanguage();
  const [reportType, setReportType] = useState<'monthly_attendance' | 'department_matrix' | 'leave_summary'>('monthly_attendance');

  const [employees] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const resetDone = localStorage.getItem('goinfi_clean_reset_2026_v2');
      if (!resetDone) return [];
      const saved = localStorage.getItem('goinfi_staff_list');
      if (saved) {
        try {
          return JSON.parse(saved).filter((p: any) => String(p.biometric_pin) !== '999' && !p.is_master_admin && p.id !== 'emp-master');
        } catch (e) {}
      }
    }
    return [];
  });

  // Generate monthly attendance statistics per staff
  const staffMonthlyStats = employees.map((emp, i) => {
    const totalWorkingDays = 26;
    const lateDays = (i * 3) % 5;
    const absentDays = i === 28 ? 1 : i === 29 ? 2 : 0;
    const leaveDays = i % 4 === 0 ? 1 : 0;
    const presentDays = totalWorkingDays - absentDays;
    const attendancePct = Math.round((presentDays / totalWorkingDays) * 100);
    const overtimeHours = i % 3 === 0 ? 8 : 0;

    return {
      pin: emp.biometric_pin,
      name: emp.full_name,
      department: emp.department_name,
      designation: emp.designation,
      presentDays,
      lateDays,
      absentDays,
      leaveDays,
      overtimeHours,
      attendancePct
    };
  });

  const exportExcelReport = () => {
    const data = staffMonthlyStats.map(s => ({
      'PIN': s.pin,
      'Employee': s.name,
      'Department': s.department,
      'Designation': s.designation,
      'Present Days': s.presentDays,
      'Late Days': s.lateDays,
      'Absent Days': s.absentDays,
      'Leave Days': s.leaveDays,
      'OT Hours': s.overtimeHours,
      'Attendance %': `${s.attendancePct}%`
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Attendance Summary');
    XLSX.writeFile(wb, `Goinfi_Monthly_Attendance_Report.xlsx`);
  };

  const exportPdfReport = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(15);
    doc.text('GOINFI TECHNOLOGIES - MONTHLY ATTENDANCE REGISTER', 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated on ${new Date().toLocaleDateString()} | Total Staff: ${staffMonthlyStats.length}`, 14, 21);

    const body = staffMonthlyStats.map(s => [
      s.pin,
      s.name,
      s.department || '',
      `${s.presentDays} Days`,
      `${s.lateDays} Days`,
      `${s.absentDays} Days`,
      `${s.overtimeHours} hrs`,
      `${s.attendancePct}%`
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['PIN', 'Staff Name', 'Department', 'Present', 'Late', 'Absent', 'Overtime', 'Attendance %']],
      body,
      styles: { fontSize: 8 }
    });

    doc.save('Goinfi_Monthly_Attendance_Summary.pdf');
  };

  return (
    <DashboardShell
      title={t.navReports}
      subtitle="Comprehensive HR intelligence, monthly staff attendance summaries, and exportable registers"
    >
      {/* Top Report Type Selector & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReportType('monthly_attendance')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              reportType === 'monthly_attendance' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Monthly Staff Attendance
          </button>
          <button
            onClick={() => setReportType('department_matrix')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              reportType === 'department_matrix' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Department Breakdown
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportExcelReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={exportPdfReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-red-600" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Monthly Attendance Table */}
      {reportType === 'monthly_attendance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm">Monthly Attendance Summary (September 2026)</h4>
            <span className="text-xs text-slate-500 font-medium">Standard 26 Working Days</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">PIN</th>
                  <th className="py-3 px-4">{t.colStaff}</th>
                  <th className="py-3 px-4">{t.colDepartment}</th>
                  <th className="py-3 px-4">Present</th>
                  <th className="py-3 px-4">Late Days</th>
                  <th className="py-3 px-4">Absents</th>
                  <th className="py-3 px-4">OT Hours</th>
                  <th className="py-3 px-4">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffMonthlyStats.map((s) => (
                  <tr key={s.pin} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">#{s.pin}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 text-slate-700">{s.department}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{s.presentDays} Days</td>
                    <td className="py-3 px-4 font-semibold text-amber-700">{s.lateDays} Days</td>
                    <td className="py-3 px-4 font-semibold text-red-600">{s.absentDays} Days</td>
                    <td className="py-3 px-4 font-semibold text-blue-700">{s.overtimeHours > 0 ? `${s.overtimeHours} hrs` : '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{s.attendancePct}%</span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.attendancePct >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${s.attendancePct}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Department Matrix */}
      {reportType === 'department_matrix' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {initialDepartments.map((dept) => {
            const staffInDept = staffMonthlyStats.filter(s => s.department === dept.name);
            const avgAttendance = staffInDept.length 
              ? Math.round(staffInDept.reduce((acc, s) => acc + s.attendancePct, 0) / staffInDept.length)
              : 0;

            return (
              <div key={dept.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-900 text-base">{dept.name}</h4>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {dept.code}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Staff Headcount</span>
                    <span className="font-bold text-slate-800">{staffInDept.length} Members</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Department Attendance Average</span>
                    <span className="font-bold text-emerald-600">{avgAttendance}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Monthly Late Occurrences</span>
                    <span className="font-bold text-amber-600">
                      {staffInDept.reduce((acc, s) => acc + s.lateDays, 0)} Total
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
