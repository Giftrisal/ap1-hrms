import * as XLSX from 'xlsx';
import { 
  bsToAd, 
  getNepaliDate, 
  getDaysInBsMonth, 
  NEPALI_MONTHS_NP, 
  NEPALI_MONTHS_EN, 
  NEPALI_DAYS_NP, 
  toNepaliDigits 
} from '@/lib/nepali-date';
import { Employee, DailyAttendance, BiometricLog } from '@/lib/types';

export interface StaffDailyAttendanceRow {
  sn: number;
  snNp: string;
  bsDay: number;
  bsDateStr: string;        // e.g. २०८३/०७/०१
  adDateStr: string;        // e.g. 2026-10-18
  dayNameNp: string;        // e.g. आइतबार
  dayNameEn: string;        // e.g. Sunday
  statusNp: string;         // e.g. उपस्थित, ढिलो उपस्थित, साप्ताहिक बिदा, बिदा, अनुपस्थित
  statusKey: 'PRESENT' | 'LATE' | 'WEEK_OFF' | 'LEAVE' | 'ABSENT' | 'UPCOMING' | 'PENDING' | 'WEEK_OFF_WORK';
  inTimeStr: string;        // e.g. 09:30 AM or '-'
  outTimeStr: string;       // e.g. 05:45 PM or '-'
  workedHours: number;
  workedHoursStr: string;   // e.g. ८.५ घण्टा or '-'
  lateMinutes: number;
  lateMinutesStr: string;   // e.g. १५ मिनेट or '-'
  remarks: string;
}

export interface StaffMonthlyReportData {
  staff: {
    id: string;
    name: string;
    pin: string;
    department: string;
    designation: string;
    weeklyOff: string;
  };
  bsYear: number;
  bsMonth: number;
  monthNameNp: string;
  monthNameEn: string;
  daysCount: number;
  summary: {
    totalDays: number;
    presentDays: number;
    lateDays: number;
    weekOffDays: number;
    leaveDays: number;
    absentDays: number;
    upcomingDays: number;
    totalWorkedHours: number;
    totalLateMinutes: number;
    attendanceRate: number;
  };
  days: StaffDailyAttendanceRow[];
}

/**
 * Format any ISO/punch time to standard 12-hour AM/PM format
 */
export function formatTime12h(timeStr?: string | null): string {
  if (!timeStr) return '-';
  const s = String(timeStr).trim();
  if (!s || s === '-' || s === 'null' || s === 'undefined') return '-';

  try {
    if (s.includes('T') || (s.includes('-') && s.includes(':'))) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        let hours = d.getHours();
        const mins = d.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
      }
    }
    
    // Fallback: extract time part
    const timeMatch = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const mins = parseInt(timeMatch[2], 10);
      const isPm = /pm/i.test(s) || hours >= 12;
      hours = hours % 12 || 12;
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;
    }
  } catch {}

  return s;
}

/**
 * Clean & normalize date string to YYYY-MM-DD
 */
export function normalizeDate(d?: string | null): string {
  if (!d) return '';
  const s = String(d).trim();
  if (s.includes('T')) return s.split('T')[0];
  if (s.includes(' ')) return s.split(' ')[0];
  return s.slice(0, 10);
}

/**
 * Generate complete day-by-day attendance data for a particular staff in a BS month
 */
export function generateStaffMonthlyDailyData(
  staff: Partial<Employee> | any,
  bsYear: number,
  bsMonth: number,
  records: any[] = [],
  rawPunches: any[] = []
): StaffMonthlyReportData {
  const daysCount = getDaysInBsMonth(bsYear, bsMonth);
  const monthNameNp = NEPALI_MONTHS_NP[bsMonth - 1] || 'बैशाख';
  const monthNameEn = NEPALI_MONTHS_EN[bsMonth - 1] || 'Baishakh';

  const staffPin = String(staff?.biometric_pin || '').trim();
  const staffId = String(staff?.id || '').trim();
  const staffName = staff?.full_name || staff?.name || 'Staff';
  const department = staff?.department_name || staff?.department || 'AP1 Television';
  const designation = staff?.designation || 'Staff';
  const weeklyOffDay = staff?.weekly_off_day || 'Saturday';

  // Current today in AD (YYYY-MM-DD)
  const now = new Date();
  const todayAdStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Filter relevant DailyAttendance records for this staff
  const staffRecs = records.filter(r => {
    const rPin = String(r.employee_pin || r.biometric_pin || '').trim();
    const rId = String(r.employee_id || '').trim();
    const pinMatch = staffPin && rPin && rPin === staffPin;
    const idMatch = staffId && rId && rId === staffId;
    return pinMatch || idMatch;
  });

  // Group records by YYYY-MM-DD
  const recsByDate = new Map<string, any>();
  staffRecs.forEach(r => {
    const dStr = normalizeDate(r.date || r.in_time);
    if (dStr) recsByDate.set(dStr, r);
  });

  // Filter relevant raw biometric punches for this staff
  const staffPunches = rawPunches.filter(p => {
    const pPin = String(p.user_id || p.biometric_pin || p.pin || '').trim();
    return staffPin && pPin && pPin === staffPin;
  });

  // Group raw punches by YYYY-MM-DD
  const punchesByDate = new Map<string, any[]>();
  staffPunches.forEach(p => {
    const dStr = normalizeDate(p.punch_time);
    if (dStr) {
      const list = punchesByDate.get(dStr) || [];
      list.push(p);
      punchesByDate.set(dStr, list);
    }
  });

  const days: StaffDailyAttendanceRow[] = [];
  let presentDays = 0;
  let lateDays = 0;
  let weekOffDays = 0;
  let leaveDays = 0;
  let absentDays = 0;
  let upcomingDays = 0;
  let totalWorkedHours = 0;
  let totalLateMinutes = 0;

  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let day = 1; day <= daysCount; day++) {
    const adDateObj = bsToAd(bsYear, bsMonth, day);
    const y = adDateObj.getUTCFullYear();
    const m = String(adDateObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(adDateObj.getUTCDate()).padStart(2, '0');
    const adDateStr = `${y}-${m}-${d}`;

    const dayOfWeekIdx = adDateObj.getUTCDay();
    const dayNameNp = NEPALI_DAYS_NP[dayOfWeekIdx] || 'आइतबार';
    const dayNameEn = daysEn[dayOfWeekIdx];

    const bsMonthPadded = String(bsMonth).padStart(2, '0');
    const bsDayPadded = String(day).padStart(2, '0');
    const bsDateStr = `${bsYear}/${bsMonthPadded}/${bsDayPadded}`;

    const isAssignedWeeklyOff = weeklyOffDay.toLowerCase() === dayNameEn.toLowerCase();
    const isToday = adDateStr === todayAdStr;
    const isPast = adDateStr < todayAdStr;
    const isFuture = adDateStr > todayAdStr;

    // Check records and punches
    const existingRec = recsByDate.get(adDateStr);
    const dayPunches = (punchesByDate.get(adDateStr) || []).sort((a, b) => 
      (a.punch_time || '').localeCompare(b.punch_time || '')
    );

    let inTimeRaw: string | null = null;
    let outTimeRaw: string | null = null;
    let workedHours = 0;
    let lateMinutes = 0;
    let remarks = '';
    let statusKey: StaffDailyAttendanceRow['statusKey'] = 'ABSENT';
    let statusNp = 'Absent';

    // 1. Resolve In / Out from punches or records
    if (dayPunches.length > 0) {
      inTimeRaw = dayPunches[0].punch_time;
      if (dayPunches.length > 1) {
        outTimeRaw = dayPunches[dayPunches.length - 1].punch_time;
      }
      remarks = `Biometric punch (${dayPunches.length} times)`;
    }

    if (existingRec) {
      if (!inTimeRaw && existingRec.in_time) inTimeRaw = existingRec.in_time;
      if (!outTimeRaw && existingRec.out_time) outTimeRaw = existingRec.out_time;
      if (existingRec.worked_hours) workedHours = Number(existingRec.worked_hours);
      if (existingRec.late_minutes) lateMinutes = Number(existingRec.late_minutes);
      if (existingRec.remarks) remarks = existingRec.remarks;
    }

    // Compute worked hours if not explicit
    if (workedHours <= 0 && inTimeRaw && outTimeRaw && inTimeRaw !== outTimeRaw) {
      const diffMs = new Date(outTimeRaw).getTime() - new Date(inTimeRaw).getTime();
      if (diffMs > 0) {
        workedHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
      }
    } else if (workedHours <= 0 && inTimeRaw && !outTimeRaw && !isToday) {
      // Single punch on past day
      workedHours = 8; // Standard shift credit or single punch
    }

    const hasPunched = Boolean(inTimeRaw || (existingRec && (existingRec.status === 'PRESENT' || existingRec.status === 'LATE')));

    // 2. Resolve Status
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
        remarks = remarks || `Duty on Weekly Off (${dayNameEn})`;
      } else if (lateMinutes > 0 || existingRec?.status === 'LATE') {
        statusKey = 'LATE';
        statusNp = 'Late';
        presentDays += 1;
        lateDays += 1;
        totalLateMinutes += lateMinutes;
      } else {
        statusKey = 'PRESENT';
        statusNp = 'Present';
        presentDays += 1;
      }
    } else {
      // Staff did NOT punch
      if (isAssignedWeeklyOff) {
        statusKey = 'WEEK_OFF';
        statusNp = 'Week Off';
        weekOffDays += 1;
        remarks = remarks || `Weekly Off (${dayNameEn})`;
      } else if (isFuture) {
        statusKey = 'UPCOMING';
        statusNp = 'Upcoming';
        upcomingDays += 1;
      } else if (isToday) {
        statusKey = 'PENDING';
        statusNp = 'Pending';
      } else {
        statusKey = 'ABSENT';
        statusNp = 'Absent';
        absentDays += 1;
      }
    }

    totalWorkedHours += workedHours;

    const inTimeStr = formatTime12h(inTimeRaw);
    const outTimeStr = formatTime12h(outTimeRaw);
    const workedHoursStr = workedHours > 0 ? `${workedHours.toFixed(1)} hrs` : '-';
    const lateMinutesStr = lateMinutes > 0 ? `${lateMinutes} mins` : '-';

    days.push({
      sn: day,
      snNp: toNepaliDigits(day),
      bsDay: day,
      bsDateStr,
      adDateStr,
      dayNameNp,
      dayNameEn,
      statusNp,
      statusKey,
      inTimeStr,
      outTimeStr,
      workedHours,
      workedHoursStr,
      lateMinutes,
      lateMinutesStr,
      remarks: remarks || '-'
    });
  }

  // Calculate Attendance Percentage based on standard 26 workdays or elapsed days
  const effectiveTotal = Math.max(1, presentDays + weekOffDays + absentDays + leaveDays);
  const attendanceRate = Math.min(100, Math.round(((presentDays + weekOffDays) / effectiveTotal) * 100));

  return {
    staff: {
      id: staffId,
      name: staffName,
      pin: staffPin || '-',
      department,
      designation,
      weeklyOff: weeklyOffDay
    },
    bsYear,
    bsMonth,
    monthNameNp,
    monthNameEn,
    daysCount,
    summary: {
      totalDays: daysCount,
      presentDays,
      lateDays,
      weekOffDays,
      leaveDays,
      absentDays,
      upcomingDays,
      totalWorkedHours: Math.round(totalWorkedHours * 10) / 10,
      totalLateMinutes,
      attendanceRate
    },
    days
  };
}

/**
 * Export Individual Staff Monthly Attendance to a beautiful, formatted Excel (.xlsx) file
 */
export function exportIndividualStaffMonthlyExcel(
  staff: Partial<Employee> | any,
  bsYear: number,
  bsMonth: number,
  records: any[] = [],
  rawPunches: any[] = []
): void {
  const data = generateStaffMonthlyDailyData(staff, bsYear, bsMonth, records, rawPunches);
  const todayBs = getNepaliDate(new Date());

  const rows: any[][] = [
    ['AP1 TELEVISION NETWORK PVT. LTD.'],
    ['INDIVIDUAL MONTHLY ATTENDANCE REGISTER (Bikram Sambat Calendar)'],
    [`BS Month: ${data.monthNameEn} ${bsYear} BS`, `Total Days: ${data.daysCount} Days`, `Report Date: ${todayBs.formattedEn}`],
    [],
    // Employee Info Card
    ['Employee Details:', '', '', '', 'Monthly Summary:'],
    [
      `Staff Name: ${data.staff.name}`,
      `Biometric PIN: #${data.staff.pin}`,
      `Department: ${data.staff.department}`,
      '',
      `Month: ${data.monthNameEn} ${bsYear} BS`,
      `Total Days: ${data.daysCount} Days`
    ],
    [
      `Designation: ${data.staff.designation}`,
      `Weekly Off: ${data.staff.weeklyOff}`,
      `Generated Date: ${todayBs.formattedEn}`,
      '',
      `Present Days: ${data.summary.presentDays} Days`,
      `Weekly Off: ${data.summary.weekOffDays} Days`
    ],
    [
      '',
      '',
      '',
      '',
      `Late Days: ${data.summary.lateDays} Days`,
      `Absent Days: ${data.summary.absentDays} Days`
    ],
    [
      '',
      '',
      '',
      '',
      `Approved Leaves: ${data.summary.leaveDays} Days`,
      `Total Worked Hours: ${data.summary.totalWorkedHours.toFixed(1)} hrs`
    ],
    [
      '',
      '',
      '',
      '',
      `Total Late Minutes: ${data.summary.totalLateMinutes} mins`,
      `Attendance Rate: ${data.summary.attendanceRate}%`
    ],
    [],
    // Table Headers
    [
      'S.N.',
      'BS Date',
      'Day',
      'Status',
      'In Time',
      'Out Time',
      'Worked Hours',
      'Late Minutes',
      'Remarks'
    ]
  ];

  // Table Data Rows
  data.days.forEach(d => {
    rows.push([
      d.sn,
      d.bsDateStr,
      d.dayNameEn,
      d.statusNp,
      d.inTimeStr,
      d.outTimeStr,
      d.workedHoursStr,
      d.lateMinutesStr,
      d.remarks
    ]);
  });

  // Table Summary Footer
  rows.push([]);
  rows.push([
    'Total / Summary',
    `${data.daysCount} Days`,
    '',
    `Present: ${data.summary.presentDays} Days`,
    '',
    '',
    `${data.summary.totalWorkedHours.toFixed(1)} hrs`,
    `${data.summary.totalLateMinutes} mins`,
    `Attendance Rate: ${data.summary.attendanceRate}%`
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column Widths for comfortable readability in Excel
  ws['!cols'] = [
    { wch: 8 },  // S.N.
    { wch: 16 }, // BS Date
    { wch: 14 }, // Day
    { wch: 20 }, // Status
    { wch: 16 }, // In Time
    { wch: 16 }, // Out Time
    { wch: 16 }, // Worked Hours
    { wch: 16 }, // Late Minutes
    { wch: 32 }  // Remarks
  ];

  const wb = XLSX.utils.book_new();
  const safeSheetName = `${data.monthNameEn} ${bsYear}`.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const cleanName = data.staff.name.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
  const fileName = `AP1_Staff_${data.staff.pin || 'PIN'}_${cleanName}_${bsYear}_${data.monthNameEn}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
