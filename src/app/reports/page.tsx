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
  AlertTriangle,
  X,
  Eye
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
  AVAILABLE_BS_YEARS,
  getBsDateRange,
  formatBsDateRangeLabel
} from '@/lib/nepali-date';
import { 
  generateStaffMonthlyDailyData, 
  exportIndividualStaffMonthlyExcel 
} from '@/lib/individual-staff-excel';
import {
  buildDateRangeReportData,
  exportDateRangeExcel,
  exportDateRangePdf
} from '@/lib/date-range-export';

export default function ReportsPage() {
  const { t } = useLanguage();
  const [reportType, setReportType] = useState<'monthly_attendance' | 'date_range' | 'department_matrix' | 'leave_summary'>('monthly_attendance');

  // Current Bikram Sambat date
  const todayBs = useMemo(() => getNepaliDate(new Date()), []);
  const [selectedBsYear, setSelectedBsYear] = useState<number>(() => todayBs.bsYear);
  const [selectedBsMonth, setSelectedBsMonth] = useState<number>(() => todayBs.bsMonth);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Date Range State (Bikram Sambat Custom Range e.g. Kartik 2 to 5)
  const [rangeFromYear, setRangeFromYear] = useState<number>(() => todayBs.bsYear);
  const [rangeFromMonth, setRangeFromMonth] = useState<number>(() => todayBs.bsMonth);
  const [rangeFromDay, setRangeFromDay] = useState<number>(1);

  const [rangeToYear, setRangeToYear] = useState<number>(() => todayBs.bsYear);
  const [rangeToMonth, setRangeToMonth] = useState<number>(() => todayBs.bsMonth);
  const [rangeToDay, setRangeToDay] = useState<number>(() => Math.min(todayBs.bsDay || 30, 30));

  const [rangeDeptFilter, setRangeDeptFilter] = useState<string>('ALL');
  const [rangeStaffFilter, setRangeStaffFilter] = useState<string>('ALL');
  const [rangeSearchQuery, setRangeSearchQuery] = useState<string>('');
  const [rangeSubView, setRangeSubView] = useState<'summary' | 'daily'>('summary');

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

  const [rawPunches, setRawPunches] = useState<any[]>([]);
  const [showIndividualModal, setShowIndividualModal] = useState<boolean>(false);
  const [selectedStaffPin, setSelectedStaffPin] = useState<string>('');

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
          if (!selectedStaffPin && clean.length > 0) {
            setSelectedStaffPin(String(clean[0].biometric_pin || clean[0].id));
          }
        }
      })
      .catch(() => {});

    // 2. Fetch Biometric Records
    fetch('/api/biometric/sync')
      .then(r => r.json())
      .then(d => {
        if (d && Array.isArray(d.recent_logs)) {
          setRawPunches(d.recent_logs);
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
  }, [selectedStaffPin]);

  // Currently selected staff object for the modal
  const selectedStaffObj = useMemo(() => {
    if (!employees || employees.length === 0) return null;
    return employees.find(e => String(e.biometric_pin) === selectedStaffPin || String(e.id) === selectedStaffPin) || employees[0];
  }, [employees, selectedStaffPin]);

  // Dynamically computed day-by-day attendance data for the individual staff modal
  const individualStaffData = useMemo(() => {
    if (!selectedStaffObj) return null;
    return generateStaffMonthlyDailyData(
      selectedStaffObj,
      selectedBsYear,
      selectedBsMonth,
      records,
      rawPunches
    );
  }, [selectedStaffObj, selectedBsYear, selectedBsMonth, records, rawPunches]);

  // Direct 1-click download handler for any employee row
  const handleExportIndividual = (pinOrId: string) => {
    const target = employees.find(e => String(e.biometric_pin) === String(pinOrId) || String(e.id) === String(pinOrId));
    if (!target) return;
    exportIndividualStaffMonthlyExcel(
      target,
      selectedBsYear,
      selectedBsMonth,
      records,
      rawPunches
    );
  };

  // Days count for Date Range month dropdowns
  const daysInFromMonth = useMemo(() => getDaysInBsMonth(rangeFromYear, rangeFromMonth), [rangeFromYear, rangeFromMonth]);
  const daysInToMonth = useMemo(() => getDaysInBsMonth(rangeToYear, rangeToMonth), [rangeToYear, rangeToMonth]);

  // Computed BS Date Range items
  const rangeDatesList = useMemo(() => {
    return getBsDateRange(
      rangeFromYear,
      rangeFromMonth,
      rangeFromDay,
      rangeToYear,
      rangeToMonth,
      rangeToDay
    );
  }, [rangeFromYear, rangeFromMonth, rangeFromDay, rangeToYear, rangeToMonth, rangeToDay]);

  const rangeLabelText = useMemo(() => {
    return formatBsDateRangeLabel(
      rangeFromYear,
      rangeFromMonth,
      rangeFromDay,
      rangeToYear,
      rangeToMonth,
      rangeToDay
    );
  }, [rangeFromYear, rangeFromMonth, rangeFromDay, rangeToYear, rangeToMonth, rangeToDay]);

  // Full Date Range Report Data (aggregates, summaries & daily breakdown)
  const dateRangeData = useMemo(() => {
    return buildDateRangeReportData({
      dateRange: rangeDatesList,
      rangeLabel: rangeLabelText,
      employees,
      records,
      rawPunches,
      departmentFilter: rangeDeptFilter,
      staffPinFilter: rangeStaffFilter
    });
  }, [rangeDatesList, rangeLabelText, employees, records, rawPunches, rangeDeptFilter, rangeStaffFilter]);

  // Filtered summaries for search query
  const filteredRangeSummaries = useMemo(() => {
    if (!rangeSearchQuery.trim()) return dateRangeData.summaries;
    const q = rangeSearchQuery.toLowerCase();
    return dateRangeData.summaries.filter(s => 
      s.name.toLowerCase().includes(q) || s.pin.includes(q) || s.department.toLowerCase().includes(q)
    );
  }, [dateRangeData.summaries, rangeSearchQuery]);

  // Filtered daily entries for search query
  const filteredRangeDailyEntries = useMemo(() => {
    if (!rangeSearchQuery.trim()) return dateRangeData.dailyEntries;
    const q = rangeSearchQuery.toLowerCase();
    return dateRangeData.dailyEntries.filter(d => 
      d.employeeName.toLowerCase().includes(q) || d.employeePin.includes(q) || d.department.toLowerCase().includes(q)
    );
  }, [dateRangeData.dailyEntries, rangeSearchQuery]);

  const handleExportDateRangeExcel = () => {
    exportDateRangeExcel(dateRangeData);
  };

  const handleExportDateRangePdf = () => {
    exportDateRangePdf(dateRangeData);
  };

  // Compute the AD date strings for every day in the selected Nepali (Bikram Sambat) Month
  const monthAdDates = useMemo(() => {
    return getBsMonthAdDates(selectedBsYear, selectedBsMonth);
  }, [selectedBsYear, selectedBsMonth]);

  const daysInBsMonth = useMemo(() => {
    return getDaysInBsMonth(selectedBsYear, selectedBsMonth);
  }, [selectedBsYear, selectedBsMonth]);

  const selectedBsMonthNameEn = NEPALI_MONTHS_EN[selectedBsMonth - 1] || 'Baishakh';

  // Calculate actual attendance statistics per staff for the selected Bikram Sambat Month
  const staffMonthlyStats = useMemo(() => {
    const validDatesSet = new Set(monthAdDates);

    const relevantRecords = records.filter(r => {
      const rDate = r.date || (r.in_time ? r.in_time.split('T')[0] : '');
      return validDatesSet.has(rDate);
    });

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

    const totalWorkingDays = 26;
    return Array.from(statsMap.values()).map(s => {
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

  // Export to Excel with Bikram Sambat headings
  const exportExcelReport = () => {
    const rows: (string | number)[][] = [
      ['AP1 TELEVISION NETWORK PVT. LTD.'],
      ['MONTHLY ATTENDANCE REGISTER (Bikram Sambat Calendar)'],
      [`Month: ${selectedBsMonthNameEn} ${selectedBsYear} BS`, `Total Days: ${daysInBsMonth} Days`, `Report Date: ${todayBs.formattedEn}`],
      [],
      ['S.N.', 'PIN', 'Staff Name', 'Department', 'Designation', 'Present Days', 'Late Days', 'Absent Days', 'Leave Days', 'Overtime (Hrs)', 'Total Worked Hours', 'Attendance Rate %']
    ];

    filteredStats.forEach((s, idx) => {
      rows.push([
        idx + 1,
        s.pin,
        s.name,
        s.department,
        s.designation,
        `${s.presentDays} Days`,
        `${s.lateDays} Days`,
        `${s.absentDays} Days`,
        `${s.leaveDays} Days`,
        `${s.overtimeHours} hrs`,
        `${s.totalWorkedHours} hrs`,
        `${s.attendancePct}%`
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 }, { wch: 10 }, { wch: 25 }, { wch: 22 }, { wch: 20 },
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 14 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedBsMonthNameEn} ${selectedBsYear}`);
    XLSX.writeFile(wb, `AP1_Attendance_Report_${selectedBsYear}_${selectedBsMonthNameEn}.xlsx`);
  };

  // Export to PDF with Bikram Sambat format
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
    doc.text(`MONTHLY ATTENDANCE REGISTER - ${selectedBsMonthNameEn.toUpperCase()} ${selectedBsYear} BS`, 14, 18);
    doc.text(`Total Staff: ${filteredStats.length} | Generated: ${todayBs.formattedEn}`, 175, 18);

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
      subtitle="Executive monthly attendance summaries, custom date-range registers and department analytics in Bikram Sambat (BS) calendar"
    >
      {/* Top Report Type & Bikram Sambat Month-Year Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: View Tabs */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setReportType('monthly_attendance')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              reportType === 'monthly_attendance' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Monthly Attendance
          </button>
          <button
            onClick={() => setReportType('date_range')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              reportType === 'date_range' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Date Range Report</span>
          </button>
          <button
            onClick={() => setReportType('department_matrix')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              reportType === 'department_matrix' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Department Matrix
          </button>
        </div>

        {/* Center: BIKRAM SAMBAT (BS) Month & Year Picker */}
        <div className="flex items-center flex-wrap gap-2 bg-red-50/80 p-2 rounded-xl border border-red-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
            <Calendar className="w-4 h-4 text-red-600" />
            <span>BS Calendar:</span>
          </div>

          {/* BS Year Selector */}
          <select
            value={selectedBsYear}
            onChange={(e) => setSelectedBsYear(Number(e.target.value))}
            className="px-2.5 py-1 text-xs font-bold bg-white border border-red-300 rounded-lg text-red-950 focus:outline-none cursor-pointer"
          >
            {AVAILABLE_BS_YEARS.map(year => (
              <option key={year} value={year}>{year} BS</option>
            ))}
          </select>

          {/* BS Month Selector */}
          <select
            value={selectedBsMonth}
            onChange={(e) => setSelectedBsMonth(Number(e.target.value))}
            className="px-2.5 py-1 text-xs font-bold bg-white border border-red-300 rounded-lg text-red-950 focus:outline-none cursor-pointer"
          >
            {NEPALI_MONTHS_EN.map((monthName, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {monthName} ({NEPALI_MONTHS_NP[idx]})
              </option>
            ))}
          </select>

          {/* Active Month Tag */}
          <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 bg-red-600 text-white rounded-md">
            {selectedBsMonthNameEn} {selectedBsYear} BS
          </span>
        </div>

        {/* Right: Export Buttons */}
        <div className="flex items-center flex-wrap gap-2 justify-end">
          <button
            onClick={() => {
              if (employees.length > 0 && !selectedStaffPin) {
                setSelectedStaffPin(String(employees[0].biometric_pin || employees[0].id));
              }
              setShowIndividualModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors cursor-pointer"
            title="View individual employee monthly attendance and export Excel register"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Individual Staff Excel</span>
          </button>
          <button
            onClick={exportExcelReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
            title="Download Bikram Sambat Excel Register"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Monthly Excel</span>
          </button>
          <button
            onClick={exportPdfReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 transition-colors cursor-pointer"
            title="Download Bikram Sambat PDF Register"
          >
            <Download className="w-3.5 h-3.5 text-red-600" />
            <span>Download PDF</span>
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
                <span>Monthly Attendance Register - {selectedBsMonthNameEn} {selectedBsYear} BS</span>
                <span className="text-[11px] font-normal px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                  {selectedBsYear} BS
                </span>
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Total Days: <span className="font-bold text-slate-800">{daysInBsMonth} Days</span> | 
                Standard Working Days: <span className="font-bold text-slate-800">26 Days</span> | 
                Total Staff: <span className="font-bold text-slate-800">{filteredStats.length}</span>
              </p>
            </div>

            {/* Search and Dept Filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff by name or PIN..."
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
                <option value="ALL">All Departments</option>
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
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-emerald-800 font-bold">Present</th>
                  <th className="py-3 px-4 text-amber-800 font-bold">Late</th>
                  <th className="py-3 px-4 text-red-800 font-bold">Absent</th>
                  <th className="py-3 px-4 text-blue-800 font-bold">Overtime (OT)</th>
                  <th className="py-3 px-4">Attendance %</th>
                  <th className="py-3 px-4 text-center">Individual Excel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStats.map((s) => (
                  <tr key={s.pin} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">#{s.pin}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{s.department}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{s.presentDays} Days</td>
                    <td className="py-3 px-4 font-semibold text-amber-700">
                      {s.lateDays > 0 ? `${s.lateDays} Days` : '-'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-red-600">
                      {s.absentDays > 0 ? `${s.absentDays} Days` : '-'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-700">
                      {s.overtimeHours > 0 ? `${s.overtimeHours} hrs` : '-'}
                    </td>
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
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleExportIndividual(s.pin)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                          title={`Download ${s.name} daily attendance Excel for ${selectedBsMonthNameEn}`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Daily Excel</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStaffPin(s.pin);
                            setShowIndividualModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                          title="Preview daily details"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      {/* ================================================================= */}
      {/* 2. CUSTOM BIKRAM SAMBAT DATE RANGE ATTENDANCE REPORT              */}
      {/* ================================================================= */}
      {reportType === 'date_range' && (
        <div className="space-y-4">
          {/* Main Filter & BS Date Range Selector Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>Bikram Sambat (BS) Date Range Report</span>
                  <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-bold">
                    {dateRangeData.rangeLabel}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Filter and export attendance records by custom Bikram Sambat date range, department, or individual staff.
                </p>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={handleExportDateRangeExcel}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                  title="Download attendance Excel for selected date range"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                  <span>Date Range Excel (.xlsx)</span>
                </button>
                <button
                  onClick={handleExportDateRangePdf}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
                  title="Download attendance PDF for selected date range"
                >
                  <Download className="w-4 h-4 text-red-100" />
                  <span>Date Range PDF (.pdf)</span>
                </button>
              </div>
            </div>

            {/* Date Range Pickers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {/* FROM BS DATE */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <span>🟢 From BS Date:</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">BS</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {/* Year */}
                  <select
                    value={rangeFromYear}
                    onChange={(e) => setRangeFromYear(Number(e.target.value))}
                    className="px-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-bold text-slate-900 cursor-pointer"
                  >
                    {AVAILABLE_BS_YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  {/* Month */}
                  <select
                    value={rangeFromMonth}
                    onChange={(e) => setRangeFromMonth(Number(e.target.value))}
                    className="px-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-bold text-slate-900 cursor-pointer"
                  >
                    {NEPALI_MONTHS_EN.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  {/* Day */}
                  <select
                    value={rangeFromDay}
                    onChange={(e) => setRangeFromDay(Number(e.target.value))}
                    className="px-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-bold text-slate-900 cursor-pointer"
                  >
                    {Array.from({ length: daysInFromMonth }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>Day {d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TO BS DATE */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <span>🔴 To BS Date:</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">BS</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {/* Year */}
                  <select
                    value={rangeToYear}
                    onChange={(e) => setRangeToYear(Number(e.target.value))}
                    className="px-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-bold text-slate-900 cursor-pointer"
                  >
                    {AVAILABLE_BS_YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  {/* Month */}
                  <select
                    value={rangeToMonth}
                    onChange={(e) => setRangeToMonth(Number(e.target.value))}
                    className="px-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-bold text-slate-900 cursor-pointer"
                  >
                    {NEPALI_MONTHS_EN.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  {/* Day */}
                  <select
                    value={rangeToDay}
                    onChange={(e) => setRangeToDay(Number(e.target.value))}
                    className="px-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-bold text-slate-900 cursor-pointer"
                  >
                    {Array.from({ length: daysInToMonth }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>Day {d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department Filter */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  🏛️ Department:
                </span>
                <select
                  value={rangeDeptFilter}
                  onChange={(e) => setRangeDeptFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {uniqueDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Staff Filter (Individual vs All) */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  👤 Select Staff:
                </span>
                <select
                  value={rangeStaffFilter}
                  onChange={(e) => setRangeStaffFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 cursor-pointer"
                >
                  <option value="ALL">All Staff</option>
                  {employees.map(e => (
                    <option key={e.id} value={String(e.biometric_pin || e.id)}>
                      #{e.biometric_pin || '-'} - {e.full_name} ({e.department_name || 'AP1'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-bar: Search & View Mode Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRangeSubView('summary')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rangeSubView === 'summary'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  📋 Staff Summary Register
                </button>
                <button
                  type="button"
                  onClick={() => setRangeSubView('daily')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rangeSubView === 'daily'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  📅 Daily Attendance Logs ({dateRangeData.dailyEntries.length} entries)
                </button>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff, PIN or department..."
                  value={rangeSearchQuery}
                  onChange={(e) => setRangeSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* KPI Stat Cards for Date Range */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Total Days in Range</span>
                <span className="text-xl font-bold text-slate-900 mt-0.5 block">{dateRangeData.totalDays} Days</span>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Included Staff</span>
                <span className="text-xl font-bold text-slate-900 mt-0.5 block">{dateRangeData.totalEmployees}</span>
              </div>
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Avg Attendance Rate</span>
                <span className="text-xl font-bold text-emerald-600 mt-0.5 block">{dateRangeData.overallAttendanceRate}%</span>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Total Worked Hours</span>
                <span className="text-xl font-bold text-slate-900 mt-0.5 block">{dateRangeData.overallWorkedHours.toFixed(1)} hrs</span>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Data Tables */}
          {rangeSubView === 'summary' ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <h5 className="font-bold text-xs text-slate-800">
                  Staff Summary Register ({dateRangeData.rangeLabel})
                </h5>
                <span className="text-[11px] text-slate-500">
                  Total {filteredRangeSummaries.length} Staff Members
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">PIN</th>
                      <th className="py-2.5 px-3">Staff Member</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Designation</th>
                      <th className="py-2.5 px-3 text-emerald-800 font-bold">Present</th>
                      <th className="py-2.5 px-3 text-amber-800 font-bold">Late</th>
                      <th className="py-2.5 px-3 text-indigo-800 font-bold">Week-Off</th>
                      <th className="py-2.5 px-3 text-blue-800 font-bold">Leaves</th>
                      <th className="py-2.5 px-3 text-red-800 font-bold">Absent</th>
                      <th className="py-2.5 px-3">Worked Hours</th>
                      <th className="py-2.5 px-3">Attendance %</th>
                      <th className="py-2.5 px-3 text-center">Excel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRangeSummaries.map((s) => (
                      <tr key={s.pin} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">#{s.pin}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{s.department}</td>
                        <td className="py-2.5 px-3 text-slate-500">{s.designation}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">{s.presentDays} Days</td>
                        <td className="py-2.5 px-3 font-semibold text-amber-700">
                          {s.lateDays > 0 ? `${s.lateDays} Days` : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-indigo-700">
                          {s.weekOffDays > 0 ? `${s.weekOffDays} Days` : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-blue-700">
                          {s.leaveDays > 0 ? `${s.leaveDays} Days` : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-red-600">
                          {s.absentDays > 0 ? `${s.absentDays} Days` : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{s.totalWorkedHours.toFixed(1)} hrs</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">{s.attendancePct}%</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              const emp = employees.find(e => String(e.biometric_pin || e.id) === s.pin);
                              if (emp) {
                                exportDateRangeExcel({
                                  ...dateRangeData,
                                  isIndividual: true,
                                  summaries: [s],
                                  dailyEntries: dateRangeData.dailyEntries.filter(d => d.employeePin === s.pin)
                                });
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                            title="Download date range Excel for this employee"
                          >
                            <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                            <span>Excel</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <h5 className="font-bold text-xs text-slate-800">
                  Daily Attendance Logs ({dateRangeData.rangeLabel})
                </h5>
                <span className="text-[11px] text-slate-500">
                  Total {filteredRangeDailyEntries.length} Entries
                </span>
              </div>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">S.N.</th>
                      <th className="py-2.5 px-3">BS Date</th>
                      <th className="py-2.5 px-3">Day</th>
                      <th className="py-2.5 px-3">PIN</th>
                      <th className="py-2.5 px-3">Staff Member</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">In Time</th>
                      <th className="py-2.5 px-3">Out Time</th>
                      <th className="py-2.5 px-3">Worked Hours</th>
                      <th className="py-2.5 px-3">Late</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRangeDailyEntries.map((d) => (
                      <tr key={`${d.employeePin}_${d.adDateStr}_${d.sn}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-500">{d.sn}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{d.bsDateStr}</td>
                        <td className="py-2 px-3 text-slate-600 font-medium">{d.dayNameNp}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">#{d.employeePin}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{d.employeeName}</td>
                        <td className="py-2 px-3 text-slate-600">{d.department}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.statusKey === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                            d.statusKey === 'LATE' ? 'bg-amber-100 text-amber-800' :
                            d.statusKey === 'WEEK_OFF' ? 'bg-indigo-100 text-indigo-800' :
                            d.statusKey === 'WEEK_OFF_WORK' ? 'bg-purple-100 text-purple-800' :
                            d.statusKey === 'LEAVE' ? 'bg-blue-100 text-blue-800' :
                            d.statusKey === 'ABSENT' ? 'bg-rose-100 text-rose-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {d.statusNp}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-700">{d.inTimeStr}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{d.outTimeStr}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{d.workedHoursStr}</td>
                        <td className="py-2 px-3 font-medium text-amber-700">{d.lateMinutesStr}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{d.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                    <span className="text-slate-500 font-medium">Total Staff</span>
                    <span className="font-bold text-slate-800">{staffInDept.length}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Average Attendance Rate</span>
                    <span className="font-bold text-emerald-600">{avgAttendance}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-medium">Total Late in {selectedBsMonthNameEn}</span>
                    <span className="font-bold text-amber-600">
                      {staffInDept.reduce((acc, s) => acc + s.lateDays, 0)} times
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================= */}
      {/* INDIVIDUAL STAFF MONTHLY DAILY ATTENDANCE MODAL (EXCEL GENERATOR) */}
      {/* ================================================================= */}
      {showIndividualModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <span>Individual Monthly Attendance Register (Bikram Sambat)</span>
                    <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-semibold">
                      Excel (.xlsx)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Complete daily attendance register for selected employee from 1st to end of month
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIndividualModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filter Controls */}
            <div className="p-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white">
              {/* Staff Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Select Employee:
                </label>
                <select
                  value={selectedStaffPin}
                  onChange={(e) => setSelectedStaffPin(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={String(emp.biometric_pin || emp.id)}>
                      #{emp.biometric_pin || '-'} - {emp.full_name} ({emp.department_name || 'AP1'})
                    </option>
                  ))}
                </select>
              </div>

              {/* BS Year */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  BS Year:
                </label>
                <select
                  value={selectedBsYear}
                  onChange={(e) => setSelectedBsYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {AVAILABLE_BS_YEARS.map(y => (
                    <option key={y} value={y}>{y} BS</option>
                  ))}
                </select>
              </div>

              {/* BS Month */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  BS Month:
                </label>
                <select
                  value={selectedBsMonth}
                  onChange={(e) => setSelectedBsMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {NEPALI_MONTHS_EN.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m} ({NEPALI_MONTHS_NP[idx]})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Body / Summary Badges & Daily Table */}
            {individualStaffData ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Employee Profile & Stat Cards */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 text-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="block text-[10px] text-slate-500 font-medium">Total Days</span>
                    <span className="font-bold text-xs text-slate-900">{individualStaffData.summary.totalDays} Days</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="block text-[10px] text-emerald-600 font-medium">Present</span>
                    <span className="font-bold text-xs text-emerald-700">{individualStaffData.summary.presentDays} Days</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="block text-[10px] text-amber-600 font-medium">Late</span>
                    <span className="font-bold text-xs text-amber-700">{individualStaffData.summary.lateDays} Days</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="block text-[10px] text-indigo-600 font-medium">Weekly Off</span>
                    <span className="font-bold text-xs text-indigo-700">{individualStaffData.summary.weekOffDays} Days</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="block text-[10px] text-blue-600 font-medium">Leaves</span>
                    <span className="font-bold text-xs text-blue-700">{individualStaffData.summary.leaveDays} Days</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="block text-[10px] text-red-600 font-medium">Absent</span>
                    <span className="font-bold text-xs text-red-700">{individualStaffData.summary.absentDays} Days</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="block text-[10px] text-slate-500 font-medium">Total Hours</span>
                    <span className="font-bold text-xs text-slate-800">{individualStaffData.summary.totalWorkedHours.toFixed(1)} hrs</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="block text-[10px] text-emerald-600 font-medium">Attendance %</span>
                    <span className="font-bold text-xs text-emerald-700">{individualStaffData.summary.attendanceRate}%</span>
                  </div>
                </div>

                {/* Day-by-Day Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">S.N.</th>
                          <th className="py-2.5 px-3">BS Date</th>
                          <th className="py-2.5 px-3">Day</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">In Time</th>
                          <th className="py-2.5 px-3">Out Time</th>
                          <th className="py-2.5 px-3">Worked Hours</th>
                          <th className="py-2.5 px-3">Late</th>
                          <th className="py-2.5 px-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {individualStaffData.days.map(d => (
                          <tr key={d.sn} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-3 font-mono font-bold text-slate-500">{d.sn}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{d.bsDateStr}</td>
                            <td className="py-2 px-3 text-slate-600 font-medium">{d.dayNameNp}</td>
                            <td className="py-2 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                d.statusKey === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                                d.statusKey === 'LATE' ? 'bg-amber-100 text-amber-800' :
                                d.statusKey === 'WEEK_OFF' ? 'bg-indigo-100 text-indigo-800' :
                                d.statusKey === 'WEEK_OFF_WORK' ? 'bg-purple-100 text-purple-800' :
                                d.statusKey === 'LEAVE' ? 'bg-blue-100 text-blue-800' :
                                d.statusKey === 'ABSENT' ? 'bg-rose-100 text-rose-800' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {d.statusNp}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-700">{d.inTimeStr}</td>
                            <td className="py-2 px-3 font-mono text-slate-700">{d.outTimeStr}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">{d.workedHoursStr}</td>
                            <td className="py-2 px-3 font-medium text-amber-700">{d.lateMinutesStr}</td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">{d.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">Please select an employee...</div>
            )}

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowIndividualModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedStaffObj) {
                    exportIndividualStaffMonthlyExcel(
                      selectedStaffObj,
                      selectedBsYear,
                      selectedBsMonth,
                      records,
                      rawPunches
                    );
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-colors cursor-pointer text-xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Daily Attendance Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
