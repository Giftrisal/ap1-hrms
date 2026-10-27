'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { initialDepartments } from '@/lib/mock-data';
import { 
  FileBarChart, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  Users, 
  Building2,
  TrendingUp,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  getNepaliDate, 
  getBsMonthAdDates, 
  getDaysInBsMonth, 
  NEPALI_MONTHS_NP, 
  NEPALI_MONTHS_EN, 
  toNepaliDigits, 
  AVAILABLE_BS_YEARS 
} from '@/lib/nepali-date';

export default function ReportsPage() {
  const { t, language } = useLanguage();
  const [reportType, setReportType] = useState<'monthly_attendance' | 'department_matrix' | 'leave_summary'>('monthly_attendance');

  // Current Bikram Sambat date
  const todayBs = useMemo(() => getNepaliDate(new Date()), []);
  const [selectedBsYear, setSelectedBsYear] = useState<number>(() => todayBs.bsYear);
  const [selectedBsMonth, setSelectedBsMonth] = useState<number>(() => todayBs.bsMonth);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  const [employees, setEmployees] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_staff_list');
      if (saved) {
        try {
          return JSON.parse(saved).filter((p: any) => String(p.biometric_pin) !== '999' && !p.is_master_admin && p.id !== 'emp-master');
        } catch (e) {}
      }
    }
    return [];
  });

  const [records, setRecords] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_attendance_records');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [];
  });

  useEffect(() => {
    // 1. Fetch Staff
    fetch('/api/staff')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.staff) && d.staff.length > 0) {
          const clean = d.staff.filter((p: any) => String(p.biometric_pin) !== '999' && !p.is_master_admin && p.id !== 'emp-master');
          setEmployees(clean);
          if (typeof window !== 'undefined') {
            localStorage.setItem('goinfi_staff_list', JSON.stringify(clean));
          }
        }
      })
      .catch(() => {});

    // 2. Fetch Biometric Records
    fetch('/api/biometric/sync')
      .then(r => r.json())
      .then(d => {
        if (d && Array.isArray(d.recent_logs)) {
          // Keep local storage updated
          if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('goinfi_attendance_records');
            if (saved) {
              try { setRecords(JSON.parse(saved)); } catch {}
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  // Compute the AD date strings for every day in the selected Nepali (Bikram Sambat) Month
  const monthAdDates = useMemo(() => {
    return getBsMonthAdDates(selectedBsYear, selectedBsMonth);
  }, [selectedBsYear, selectedBsMonth]);

  const daysInBsMonth = useMemo(() => {
    return getDaysInBsMonth(selectedBsYear, selectedBsMonth);
  }, [selectedBsYear, selectedBsMonth]);

  const selectedBsMonthName = NEPALI_MONTHS_NP[selectedBsMonth - 1] || 'बैशाख';
  const selectedBsMonthNameEn = NEPALI_MONTHS_EN[selectedBsMonth - 1] || 'Baishakh';

  // Calculate actual attendance statistics per staff for the selected Bikram Sambat Month
  const staffMonthlyStats = useMemo(() => {
    // Create a fast lookup set of AD dates that belong to this BS month
    const validDatesSet = new Set(monthAdDates);

    // Filter all records that occurred on any of these BS month dates
    const relevantRecords = records.filter(r => {
      const rDate = r.date || (r.in_time ? r.in_time.split('T')[0] : '');
      return validDatesSet.has(rDate);
    });

    // Map by pin or employee_id
    const statsMap = new Map<string, {
      pin: string;
      name: string;
      department: string;
      designation: string;
      presentDays: number;
      lateDays: number;
      absentDays: number;
      leaveDays: number;
      weekOffDays: number;
      overtimeHours: number;
      totalWorkedHours: number;
      attendancePct: number;
    }>();

    employees.forEach(emp => {
      const pin = String(emp.biometric_pin || emp.id);
      statsMap.set(pin, {
        pin: emp.biometric_pin || '-',
        name: emp.full_name,
        department: emp.department_name || 'AP1 Television',
        designation: emp.designation || 'Staff',
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
        leaveDays: 0,
        weekOffDays: 0,
        overtimeHours: 0,
        totalWorkedHours: 0,
        attendancePct: 0
      });
    });

    // Aggregate records
    relevantRecords.forEach(r => {
      const pin = String(r.employee_pin || r.biometric_pin || r.employee_id || '');
      const entry = statsMap.get(pin);
      if (!entry) return;

      if (r.status === 'PRESENT') {
        entry.presentDays += 1;
      } else if (r.status === 'LATE' || (r.late_minutes && r.late_minutes > 0)) {
        entry.presentDays += 1;
        entry.lateDays += 1;
      } else if (r.status === 'WEEK_OFF' || r.status === 'WEEKEND') {
        entry.weekOffDays += 1;
      } else if (r.status === 'ON_LEAVE' || r.status === 'HALF_DAY') {
        entry.leaveDays += 1;
      } else if (r.status === 'ABSENT') {
        entry.absentDays += 1;
      }

      const worked = Number(r.worked_hours || 0);
      entry.totalWorkedHours += worked;
      if (worked > 8) {
        entry.overtimeHours += Number((worked - 8).toFixed(1));
      }
    });

    // Calculate attendance percentage based on standard 26 working days
    const totalWorkingDays = 26;
    return Array.from(statsMap.values()).map(s => {
      // If no records at all were found in system, provide sensible baseline
      const effectivePresent = s.presentDays;
      const effectiveAbsent = Math.max(0, totalWorkingDays - effectivePresent - s.leaveDays);
      const attendancePct = Math.min(100, Math.round(((effectivePresent + s.weekOffDays) / 30) * 100));

      return {
        ...s,
        absentDays: s.absentDays > 0 ? s.absentDays : effectiveAbsent,
        attendancePct: attendancePct > 0 ? attendancePct : 0,
        totalWorkedHours: Math.round(s.totalWorkedHours * 10) / 10
      };
    });
  }, [employees, records, monthAdDates]);

  // Filtered staff list based on search and department
  const filteredStats = useMemo(() => {
    return staffMonthlyStats.filter(s => {
      const matchesSearch = !searchQuery.trim() || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.pin.includes(searchQuery);
      const matchesDept = deptFilter === 'ALL' || s.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [staffMonthlyStats, searchQuery, deptFilter]);

  // Unique departments for filter dropdown
  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department_name) set.add(e.department_name);
    });
    return Array.from(set);
  }, [employees]);

  // Export to Excel with pure Nepali Bikram Sambat headings
  const exportExcelReport = () => {
    const rows = [
      ['AP1 TELEVISION NETWORK PVT. LTD.'],
      ['मासिक हाजिरी तथा पेरोल अडिट रिपोर्ट (MONTHLY ATTENDANCE REGISTER)'],
      [`महिना: ${selectedBsMonthName} ${toNepaliDigits(selectedBsYear)} (वि.सं.)`, `कुल दिन: ${toNepaliDigits(daysInBsMonth)} दिन`, `रिपोर्ट मिति: ${todayBs.formattedNp}`],
      [],
      ['क्र.सं.', 'PIN', 'कर्मचारीको नाम', 'विभाग', 'पद', 'उपस्थित दिन', 'ढिलो दिन', 'अनुपस्थित दिन', 'बिदा दिन', 'ओभरटाइम (घण्टा)', 'कुल काम गरेको घण्टा', 'हाजिरी दर %']
    ];

    filteredStats.forEach((s, idx) => {
      rows.push([
        toNepaliDigits(idx + 1),
        s.pin,
        s.name,
        s.department,
        s.designation,
        `${toNepaliDigits(s.presentDays)} दिन`,
        `${toNepaliDigits(s.lateDays)} दिन`,
        `${toNepaliDigits(s.absentDays)} दिन`,
        `${toNepaliDigits(s.leaveDays)} दिन`,
        `${toNepaliDigits(s.overtimeHours)} घ`,
        `${toNepaliDigits(s.totalWorkedHours)} घ`,
        `${toNepaliDigits(s.attendancePct)}%`
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 }, { wch: 10 }, { wch: 25 }, { wch: 22 }, { wch: 20 },
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 14 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedBsMonthName} ${selectedBsYear}`);
    XLSX.writeFile(wb, `AP1_Hajiri_Report_${selectedBsYear}_${selectedBsMonthNameEn}.xlsx`);
  };

  // Export to PDF with Bikram Sambat Nepali Date format
  const exportPdfReport = () => {
    const doc = new jsPDF('landscape');
    
    // Header Banner
    doc.setFillColor(185, 28, 28); // AP1 Red
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AP1 TELEVISION NETWORK', 14, 11);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`MONTHLY ATTENDANCE REGISTER - ${selectedBsMonthNameEn.toUpperCase()} ${selectedBsYear} BS (NEPALI CALENDAR)`, 14, 18);
    doc.text(`Total Staff: ${filteredStats.length} | Generated: ${todayBs.formattedNp}`, 175, 18);

    const body = filteredStats.map((s, idx) => [
      String(idx + 1),
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
      startY: 28,
      head: [['S.N.', 'PIN', 'Staff Name', 'Department', 'Present', 'Late', 'Absent', 'Overtime', 'Attendance %']],
      body,
      styles: { fontSize: 8 }
    });

    doc.save(`AP1_Monthly_Attendance_${selectedBsYear}_${selectedBsMonthNameEn}.pdf`);
  };

  return (
    <DashboardShell
      title={t.navReports}
      subtitle="नेपाली क्यालेन्डर (विक्रम संवत्) अनुसार मासिक हाजिरी सारांश, विभाग विश्लेषण तथा रिपोर्ट"
    >
      {/* Top Report Type & Bikram Sambat Month-Year Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: View Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReportType('monthly_attendance')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              reportType === 'monthly_attendance' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            मासिक हाजिरी रिपोर्ट (Monthly)
          </button>
          <button
            onClick={() => setReportType('department_matrix')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              reportType === 'department_matrix' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            विभागगत विश्लेषण (Department)
          </button>
        </div>

        {/* Center: BIKRAM SAMBAT (BS) Month & Year Picker */}
        <div className="flex items-center flex-wrap gap-2 bg-red-50/80 p-2 rounded-xl border border-red-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
            <Calendar className="w-4 h-4 text-red-600" />
            <span>नेपाली क्यालेन्डर:</span>
          </div>

          {/* BS Year Selector */}
          <select
            value={selectedBsYear}
            onChange={(e) => setSelectedBsYear(Number(e.target.value))}
            className="px-2.5 py-1 text-xs font-bold bg-white border border-red-300 rounded-lg text-red-950 focus:outline-none cursor-pointer"
          >
            {AVAILABLE_BS_YEARS.map(year => (
              <option key={year} value={year}>{toNepaliDigits(year)} साल (BS)</option>
            ))}
          </select>

          {/* BS Month Selector */}
          <select
            value={selectedBsMonth}
            onChange={(e) => setSelectedBsMonth(Number(e.target.value))}
            className="px-2.5 py-1 text-xs font-bold bg-white border border-red-300 rounded-lg text-red-950 focus:outline-none cursor-pointer"
          >
            {NEPALI_MONTHS_NP.map((monthName, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {monthName} ({NEPALI_MONTHS_EN[idx]})
              </option>
            ))}
          </select>

          {/* Active Month Tag */}
          <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 bg-red-600 text-white rounded-md">
            {selectedBsMonthName} {toNepaliDigits(selectedBsYear)}
          </span>
        </div>

        {/* Right: Export Buttons */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={exportExcelReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
            title="Download Bikram Sambat Excel Register"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel डाउनलोड</span>
          </button>
          <button
            onClick={exportPdfReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 transition-colors cursor-pointer"
            title="Download Bikram Sambat PDF Register"
          >
            <Download className="w-3.5 h-3.5 text-red-600" />
            <span>PDF डाउनलोड</span>
          </button>
        </div>
      </div>

      {/* Monthly Attendance Table */}
      {reportType === 'monthly_attendance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header & Filter Controls */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>मासिक हाजिरी विवरण - {selectedBsMonthName} {toNepaliDigits(selectedBsYear)}</span>
                <span className="text-[11px] font-normal px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                  विक्रम संवत् {toNepaliDigits(selectedBsYear)}
                </span>
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                यस महिनाको कुल दिन: <span className="font-bold text-slate-800">{toNepaliDigits(daysInBsMonth)} दिन</span> | 
                मानक कार्य दिन: <span className="font-bold text-slate-800">२६ दिन</span> | 
                कुल कर्मचारी: <span className="font-bold text-slate-800">{toNepaliDigits(filteredStats.length)} जना</span>
              </p>
            </div>

            {/* Search and Dept Filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="कर्मचारी वा PIN खोज्नुहोस्..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-red-500 font-medium"
                />
              </div>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">सबै विभागहरू</option>
                {uniqueDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">PIN</th>
                  <th className="py-3 px-4">कर्मचारी</th>
                  <th className="py-3 px-4">विभाग</th>
                  <th className="py-3 px-4 text-emerald-800 font-bold">उपस्थित (Present)</th>
                  <th className="py-3 px-4 text-amber-800 font-bold">ढिलो (Late)</th>
                  <th className="py-3 px-4 text-red-800 font-bold">अनुपस्थित (Absent)</th>
                  <th className="py-3 px-4 text-blue-800 font-bold">ओभरटाइम (OT)</th>
                  <th className="py-3 px-4">हाजिरी दर %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStats.map((s) => (
                  <tr key={s.pin} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">#{s.pin}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{s.department}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{toNepaliDigits(s.presentDays)} दिन</td>
                    <td className="py-3 px-4 font-semibold text-amber-700">
                      {s.lateDays > 0 ? `${toNepaliDigits(s.lateDays)} दिन` : '-'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-red-600">
                      {s.absentDays > 0 ? `${toNepaliDigits(s.absentDays)} दिन` : '-'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-700">
                      {s.overtimeHours > 0 ? `${toNepaliDigits(s.overtimeHours)} घ` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{toNepaliDigits(s.attendancePct)}%</span>
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
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    {dept.code}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">कर्मचारी संख्या</span>
                    <span className="font-bold text-slate-800">{toNepaliDigits(staffInDept.length)} जना</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">विभागको औसत हाजिरी दर</span>
                    <span className="font-bold text-emerald-600">{toNepaliDigits(avgAttendance)}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-medium">{selectedBsMonthName} महिनाको कुल ढिलो</span>
                    <span className="font-bold text-amber-600">
                      {toNepaliDigits(staffInDept.reduce((acc, s) => acc + s.lateDays, 0))} पटक
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
