import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BsDateRangeItem, 
  getNepaliDate, 
  toNepaliDigits 
} from '@/lib/nepali-date';
import { Employee, DailyAttendance, BiometricLog } from '@/lib/types';
import { formatTime12h, normalizeDate } from '@/lib/individual-staff-excel';

export interface DateRangeDailyEntry {
  sn: number;
  snNp: string;
  employeePin: string;
  employeeName: string;
  department: string;
  designation: string;
  bsDateStr: string;        // "2083/07/02"
  adDateStr: string;        // "2026-10-19"
  dayNameNp: string;        // "Monday"
  statusNp: string;         // "Present"
  statusKey: 'PRESENT' | 'LATE' | 'WEEK_OFF' | 'LEAVE' | 'ABSENT' | 'UPCOMING' | 'PENDING' | 'WEEK_OFF_WORK';
  inTimeStr: string;
  outTimeStr: string;
  workedHours: number;
  workedHoursStr: string;
  lateMinutes: number;
  lateMinutesStr: string;
  remarks: string;
}

export interface DateRangeStaffSummary {
  pin: string;
  name: string;
  department: string;
  designation: string;
  totalDays: number;
  presentDays: number;
  lateDays: number;
  weekOffDays: number;
  leaveDays: number;
  absentDays: number;
  totalWorkedHours: number;
  totalLateMinutes: number;
  attendancePct: number;
}

export interface DateRangeReportData {
  rangeLabel: string;
  totalDays: number;
  department: string;
  staffFilter: string;
  isIndividual: boolean;
  selectedStaffName?: string;
  summaries: DateRangeStaffSummary[];
  dailyEntries: DateRangeDailyEntry[];
  totalEmployees: number;
  overallAttendanceRate: number;
  overallWorkedHours: number;
  overallLateCount: number;
}

/**
 * Build complete date-range attendance data for all or individual staff across arbitrary BS dates
 */
export function buildDateRangeReportData(options: {
  dateRange: BsDateRangeItem[];
  rangeLabel: string;
  employees: Employee[] | any[];
  records: DailyAttendance[] | any[];
  rawPunches?: BiometricLog[] | any[];
  departmentFilter?: string; // 'ALL' or department name
  staffPinFilter?: string;   // 'ALL' or specific PIN
}): DateRangeReportData {
  const {
    dateRange,
    rangeLabel,
    employees,
    records = [],
    rawPunches = [],
    departmentFilter = 'ALL',
    staffPinFilter = 'ALL'
  } = options;

  const now = new Date();
  const todayAdStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 1. Filter Employees
  const filteredEmployees = employees.filter(emp => {
    if (String(emp.biometric_pin) === '999' || emp.is_master_admin || emp.id === 'emp-master') {
      return false;
    }
    const pin = String(emp.biometric_pin || emp.id).trim();
    const dept = emp.department_name || emp.department || 'AP1 Television';

    const matchesDept = departmentFilter === 'ALL' || dept === departmentFilter;
    const matchesStaff = staffPinFilter === 'ALL' || pin === staffPinFilter;

    return matchesDept && matchesStaff;
  });

  const isIndividual = staffPinFilter !== 'ALL' && filteredEmployees.length === 1;
  const selectedStaffName = isIndividual ? filteredEmployees[0]?.full_name : undefined;

  // 2. Pre-index records and punches by employee + date
  const recMap = new Map<string, any>();
  records.forEach(r => {
    const dStr = normalizeDate(r.date || r.in_time);
    const pin = String(r.employee_pin || r.biometric_pin || '').trim();
    const id = String(r.employee_id || '').trim();
    if (dStr && pin) recMap.set(`${pin}_${dStr}`, r);
    if (dStr && id) recMap.set(`${id}_${dStr}`, r);
  });

  const punchMap = new Map<string, any[]>();
  rawPunches.forEach(p => {
    const dStr = normalizeDate(p.punch_time);
    const pin = String(p.user_id || p.biometric_pin || p.pin || '').trim();
    if (dStr && pin) {
      const key = `${pin}_${dStr}`;
      const list = punchMap.get(key) || [];
      list.push(p);
      punchMap.set(key, list);
    }
  });

  const dailyEntries: DateRangeDailyEntry[] = [];
  const summaries: DateRangeStaffSummary[] = [];

  let snCounter = 1;

  filteredEmployees.forEach(emp => {
    const pin = String(emp.biometric_pin || emp.id || '-').trim();
    const name = emp.full_name || emp.name || 'Staff';
    const dept = emp.department_name || emp.department || 'AP1 Television';
    const desig = emp.designation || 'Staff';
    const weeklyOff = emp.weekly_off_day || 'Saturday';

    let presentDays = 0;
    let lateDays = 0;
    let weekOffDays = 0;
    let leaveDays = 0;
    let absentDays = 0;
    let staffWorkedHours = 0;
    let staffLateMinutes = 0;

    dateRange.forEach(dateItem => {
      const adDateStr = dateItem.adDateStr;
      const isAssignedWeeklyOff = weeklyOff.toLowerCase() === (dateItem.dayNameEn || '').toLowerCase() || 
        (dateItem.dayOfWeek === 6 && weeklyOff.toLowerCase() === 'saturday');
      const isToday = adDateStr === todayAdStr;
      const isPast = adDateStr < todayAdStr;
      const isFuture = adDateStr > todayAdStr;

      const existingRec = recMap.get(`${pin}_${adDateStr}`) || recMap.get(`${emp.id}_${adDateStr}`);
      const dayPunches = (punchMap.get(`${pin}_${adDateStr}`) || []).sort((a, b) => 
        (a.punch_time || '').localeCompare(b.punch_time || '')
      );

      let inTimeRaw: string | null = null;
      let outTimeRaw: string | null = null;
      let workedHours = 0;
      let lateMinutes = 0;
      let remarks = '';
      let statusKey: DateRangeDailyEntry['statusKey'] = 'ABSENT';
      let statusNp = 'Absent';

      if (dayPunches.length > 0) {
        inTimeRaw = dayPunches[0].punch_time;
        if (dayPunches.length > 1) {
          outTimeRaw = dayPunches[dayPunches.length - 1].punch_time;
        }
        remarks = `Biometric (${dayPunches.length} punches)`;
      }

      if (existingRec) {
        if (!inTimeRaw && existingRec.in_time) inTimeRaw = existingRec.in_time;
        if (!outTimeRaw && existingRec.out_time) outTimeRaw = existingRec.out_time;
        if (existingRec.worked_hours) workedHours = Number(existingRec.worked_hours);
        if (existingRec.late_minutes) lateMinutes = Number(existingRec.late_minutes);
        if (existingRec.remarks) remarks = existingRec.remarks;
      }

      if (workedHours <= 0 && inTimeRaw && outTimeRaw && inTimeRaw !== outTimeRaw) {
        const diffMs = new Date(outTimeRaw).getTime() - new Date(inTimeRaw).getTime();
        if (diffMs > 0) {
          workedHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
        }
      } else if (workedHours <= 0 && inTimeRaw && !outTimeRaw && !isToday) {
        workedHours = 8;
      }

      const hasPunched = Boolean(inTimeRaw || (existingRec && (existingRec.status === 'PRESENT' || existingRec.status === 'LATE')));

      if (existingRec?.status === 'ON_LEAVE') {
        statusKey = 'LEAVE';
        statusNp = 'Leave';
        leaveDays += 1;
        remarks = remarks || 'Approved Leave';
      } else if (existingRec?.status === 'HALF_DAY') {
        statusKey = 'LEAVE';
        statusNp = 'Half Day';
        leaveDays += 0.5;
        presentDays += 0.5;
      } else if (hasPunched) {
        if (isAssignedWeeklyOff) {
          statusKey = 'WEEK_OFF_WORK';
          statusNp = 'Off-Day Duty';
          presentDays += 1;
          remarks = remarks || `Duty on Weekly Off (${dateItem.dayNameEn})`;
        } else if (lateMinutes > 0 || existingRec?.status === 'LATE') {
          statusKey = 'LATE';
          statusNp = 'Late';
          presentDays += 1;
          lateDays += 1;
          staffLateMinutes += lateMinutes;
        } else {
          statusKey = 'PRESENT';
          statusNp = 'Present';
          presentDays += 1;
        }
      } else {
        if (isAssignedWeeklyOff) {
          statusKey = 'WEEK_OFF';
          statusNp = 'Week Off';
          weekOffDays += 1;
          remarks = remarks || `Weekly Off (${dateItem.dayNameEn})`;
        } else if (isFuture) {
          statusKey = 'UPCOMING';
          statusNp = 'Upcoming';
        } else if (isToday) {
          statusKey = 'PENDING';
          statusNp = 'Not Punched';
        } else {
          statusKey = 'ABSENT';
          statusNp = 'Absent';
          absentDays += 1;
        }
      }

      staffWorkedHours += workedHours;

      dailyEntries.push({
        sn: snCounter++,
        snNp: String(snCounter - 1),
        employeePin: pin,
        employeeName: name,
        department: dept,
        designation: desig,
        bsDateStr: dateItem.bsDateStr,
        adDateStr: dateItem.adDateStr,
        dayNameNp: dateItem.dayNameEn,
        statusNp,
        statusKey,
        inTimeStr: formatTime12h(inTimeRaw),
        outTimeStr: formatTime12h(outTimeRaw),
        workedHours,
        workedHoursStr: workedHours > 0 ? `${workedHours.toFixed(1)} hrs` : '-',
        lateMinutes,
        lateMinutesStr: lateMinutes > 0 ? `${lateMinutes} mins` : '-',
        remarks: remarks || '-'
      });
    });

    const effectiveTotal = Math.max(1, presentDays + weekOffDays + absentDays + leaveDays);
    const attendancePct = Math.min(100, Math.round(((presentDays + weekOffDays) / effectiveTotal) * 100));

    summaries.push({
      pin,
      name,
      department: dept,
      designation: desig,
      totalDays: dateRange.length,
      presentDays,
      lateDays,
      weekOffDays,
      leaveDays,
      absentDays,
      totalWorkedHours: Math.round(staffWorkedHours * 10) / 10,
      totalLateMinutes: staffLateMinutes,
      attendancePct
    });
  });

  const totalEmployees = filteredEmployees.length;
  const overallAttendanceRate = summaries.length > 0 
    ? Math.round(summaries.reduce((a, b) => a + b.attendancePct, 0) / summaries.length) 
    : 0;
  const overallWorkedHours = Math.round(summaries.reduce((a, b) => a + b.totalWorkedHours, 0) * 10) / 10;
  const overallLateCount = summaries.reduce((a, b) => a + b.lateDays, 0);

  return {
    rangeLabel,
    totalDays: dateRange.length,
    department: departmentFilter,
    staffFilter: staffPinFilter,
    isIndividual,
    selectedStaffName,
    summaries,
    dailyEntries,
    totalEmployees,
    overallAttendanceRate,
    overallWorkedHours,
    overallLateCount
  };
}

/**
 * Export Date Range Attendance to Excel (.xlsx)
 */
export function exportDateRangeExcel(data: DateRangeReportData): void {
  const todayBs = getNepaliDate(new Date());
  const wb = XLSX.utils.book_new();

  if (data.isIndividual && data.summaries.length === 1) {
    // ----------------------------------------------------
    // Individual Staff Date Range Export
    // ----------------------------------------------------
    const staff = data.summaries[0];
    const rows: any[][] = [
      ['AP1 TELEVISION NETWORK PVT. LTD.'],
      ['STAFF DATE RANGE ATTENDANCE REGISTER (Bikram Sambat Calendar)'],
      [`BS Date Range: ${data.rangeLabel}`],
      [],
      ['Employee Details:', '', '', '', 'Range Summary:'],
      [
        `Staff Name: ${staff.name}`,
        `Biometric PIN: #${staff.pin}`,
        `Department: ${staff.department}`,
        '',
        `BS Date Range: ${data.rangeLabel}`,
        `Total Days: ${data.totalDays} Days`
      ],
      [
        `Designation: ${staff.designation}`,
        `Generated Date: ${todayBs.formattedEn}`,
        '',
        '',
        `Present Days: ${staff.presentDays} Days`,
        `Weekly Off: ${staff.weekOffDays} Days`
      ],
      [
        '', '', '', '',
        `Late Days: ${staff.lateDays} Days`,
        `Absent Days: ${staff.absentDays} Days`
      ],
      [
        '', '', '', '',
        `Approved Leaves: ${staff.leaveDays} Days`,
        `Total Worked Hours: ${staff.totalWorkedHours.toFixed(1)} hrs`
      ],
      [
        '', '', '', '',
        `Total Late Minutes: ${staff.totalLateMinutes} mins`,
        `Attendance Rate: ${staff.attendancePct}%`
      ],
      [],
      ['S.N.', 'BS Date', 'Day', 'Status', 'In Time', 'Out Time', 'Worked Hours', 'Late Minutes', 'Remarks']
    ];

    data.dailyEntries.forEach(d => {
      rows.push([
        d.sn,
        d.bsDateStr,
        d.dayNameNp,
        d.statusNp,
        d.inTimeStr,
        d.outTimeStr,
        d.workedHoursStr,
        d.lateMinutesStr,
        d.remarks
      ]);
    });

    rows.push([]);
    rows.push([
      'Total / Summary',
      `${data.totalDays} Days`,
      '',
      `Present: ${staff.presentDays} Days`,
      '',
      '',
      `${staff.totalWorkedHours.toFixed(1)} hrs`,
      `${staff.totalLateMinutes} mins`,
      `Attendance Rate: ${staff.attendancePct}%`
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 32 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Individual Attendance');
    const safeName = staff.name.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
    XLSX.writeFile(wb, `AP1_Staff_${staff.pin}_${safeName}_DateRange.xlsx`);
  } else {
    // ----------------------------------------------------
    // All Staff / Department-wise Date Range Export
    // ----------------------------------------------------
    const summaryRows: any[][] = [
      ['AP1 TELEVISION NETWORK PVT. LTD.'],
      ['DATE RANGE ATTENDANCE & AUDIT REPORT (Bikram Sambat Calendar)'],
      [`BS Date Range: ${data.rangeLabel}`],
      [`Department: ${data.department === 'ALL' ? 'All Departments' : data.department}`, `Total Days: ${data.totalDays} Days`, `Total Staff: ${data.totalEmployees}`, `Report Date: ${todayBs.formattedEn}`],
      [],
      ['S.N.', 'PIN', 'Staff Name', 'Department', 'Designation', 'Total Days', 'Present Days', 'Late Days', 'Weekly Off', 'Leaves', 'Absent Days', 'Worked Hours', 'Late Mins', 'Attendance Rate %']
    ];

    data.summaries.forEach((s, idx) => {
      summaryRows.push([
        idx + 1,
        s.pin,
        s.name,
        s.department,
        s.designation,
        `${s.totalDays} Days`,
        `${s.presentDays} Days`,
        `${s.lateDays} Days`,
        `${s.weekOffDays} Days`,
        `${s.leaveDays} Days`,
        `${s.absentDays} Days`,
        `${s.totalWorkedHours.toFixed(1)} hrs`,
        `${s.totalLateMinutes} mins`,
        `${s.attendancePct}%`
      ]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 8 }, { wch: 10 }, { wch: 25 }, { wch: 20 }, { wch: 18 },
      { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Staff Summary');

    // Sheet 2: Detailed Daily Rows
    const detailRows: any[][] = [
      ['AP1 TELEVISION NETWORK PVT. LTD.'],
      ['DATE RANGE DAILY ATTENDANCE LOGS'],
      [`BS Range: ${data.rangeLabel}`, `Department: ${data.department === 'ALL' ? 'All Departments' : data.department}`],
      [],
      ['S.N.', 'BS Date', 'Day', 'PIN', 'Staff Name', 'Department', 'Status', 'In Time', 'Out Time', 'Worked Hours', 'Late Mins', 'Remarks']
    ];

    data.dailyEntries.forEach(d => {
      detailRows.push([
        d.sn,
        d.bsDateStr,
        d.dayNameNp,
        d.employeePin,
        d.employeeName,
        d.department,
        d.statusNp,
        d.inTimeStr,
        d.outTimeStr,
        d.workedHoursStr,
        d.lateMinutesStr,
        d.remarks
      ]);
    });

    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
    wsDetail['!cols'] = [
      { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 22 },
      { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 14 }, { wch: 26 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Daily Attendance Logs');

    const cleanDept = data.department.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
    XLSX.writeFile(wb, `AP1_DateRange_Attendance_${cleanDept}_Report.xlsx`);
  }
}

/**
 * Export Date Range Attendance to official PDF (.pdf)
 */
export function exportDateRangePdf(data: DateRangeReportData): void {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const todayBs = getNepaliDate(new Date());

  // Top AP1 Television Banner
  doc.setFillColor(185, 28, 28); // AP1 Red
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('AP1 TELEVISION NETWORK PVT. LTD.', 14, 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`DATE RANGE ATTENDANCE REGISTER - ${data.rangeLabel.toUpperCase()}`, 14, 17);
  doc.text(`Staff: ${data.totalEmployees} | Dept: ${data.department} | Generated: ${todayBs.formattedEn}`, 175, 17);

  if (data.isIndividual && data.dailyEntries.length > 0) {
    // Individual Day-by-Day PDF Table
    const body = data.dailyEntries.map(d => [
      d.snNp,
      d.bsDateStr,
      d.dayNameNp,
      d.statusNp,
      d.inTimeStr,
      d.outTimeStr,
      d.workedHoursStr,
      d.lateMinutesStr,
      d.remarks
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['S.N.', 'Date (BS)', 'Day', 'Status', 'In Time', 'Out Time', 'Worked Hrs', 'Late', 'Remarks']],
      body,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] }
    });
  } else {
    // Summary PDF Table
    const body = data.summaries.map((s, idx) => [
      String(idx + 1),
      s.pin,
      s.name,
      s.department,
      `${s.presentDays} Days`,
      `${s.lateDays} Days`,
      `${s.weekOffDays} Days`,
      `${s.absentDays} Days`,
      `${s.totalWorkedHours} hrs`,
      `${s.attendancePct}%`
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['S.N.', 'PIN', 'Staff Name', 'Department', 'Present', 'Late', 'Week-Off', 'Absent', 'Worked Hrs', 'Attendance %']],
      body,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59] }
    });
  }

  // Signature Block
  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  if (finalY < 185) {
    doc.setDrawColor(148, 163, 184);
    doc.line(20, finalY + 20, 80, finalY + 20);
    doc.line(210, finalY + 20, 270, finalY + 20);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Prepared by: HR Department', 20, finalY + 25);
    doc.text('Authorized by: Managing Director', 210, finalY + 25);
  }

  const cleanDept = data.department.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
  doc.save(`AP1_DateRange_${cleanDept}_Report.pdf`);
}
