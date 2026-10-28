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
    const bsDateStr = `${toNepaliDigits(bsYear)}/${toNepaliDigits(bsMonthPadded)}/${toNepaliDigits(bsDayPadded)}`;

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
    let statusNp = 'अनुपस्थित';

    // 1. Resolve In / Out from punches or records
    if (dayPunches.length > 0) {
      inTimeRaw = dayPunches[0].punch_time;
      if (dayPunches.length > 1) {
        outTimeRaw = dayPunches[dayPunches.length - 1].punch_time;
      }
      remarks = `बायोमेट्रिक पञ्च (${toNepaliDigits(dayPunches.length)} पटक)`;
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
      statusNp = 'स्वीकृत बिदा (LEAVE)';
      leaveDays += 1;
      remarks = remarks || 'स्वीकृत बिदा';
    } else if (existingRec?.status === 'HALF_DAY') {
      statusKey = 'LEAVE';
      statusNp = 'आधा दिन बिदा (HALF DAY)';
      leaveDays += 0.5;
      presentDays += 0.5;
    } else if (hasPunched) {
      if (isAssignedWeeklyOff) {
        statusKey = 'WEEK_OFF_WORK';
        statusNp = 'हप्ता बिदामा काम (OFF-DAY DUTY)';
        presentDays += 1;
        remarks = remarks || `साप्ताहिक बिदामा अतिरिक्त ड्युटी (${dayNameNp})`;
      } else if (lateMinutes > 0 || existingRec?.status === 'LATE') {
        statusKey = 'LATE';
        statusNp = 'ढिलो उपस्थित (LATE)';
        presentDays += 1;
        lateDays += 1;
        totalLateMinutes += lateMinutes;
      } else {
        statusKey = 'PRESENT';
        statusNp = 'उपस्थित (PRESENT)';
        presentDays += 1;
      }
    } else {
      // Staff did NOT punch
      if (isAssignedWeeklyOff) {
        statusKey = 'WEEK_OFF';
        statusNp = 'साप्ताहिक बिदा (WEEK OFF)';
        weekOffDays += 1;
        remarks = remarks || `तोकिएको साप्ताहिक बिदा (${dayNameNp})`;
      } else if (isFuture) {
        statusKey = 'UPCOMING';
        statusNp = 'आगामी दिन (UPCOMING)';
        upcomingDays += 1;
      } else if (isToday) {
        statusKey = 'PENDING';
        statusNp = 'प्रतीक्षारत (NOT PUNCHED YET)';
      } else {
        statusKey = 'ABSENT';
        statusNp = 'अनुपस्थित (ABSENT)';
        absentDays += 1;
      }
    }

    totalWorkedHours += workedHours;

    const inTimeStr = formatTime12h(inTimeRaw);
    const outTimeStr = formatTime12h(outTimeRaw);
    const workedHoursStr = workedHours > 0 ? `${toNepaliDigits(workedHours.toFixed(1))} घण्टा` : '-';
    const lateMinutesStr = lateMinutes > 0 ? `${toNepaliDigits(lateMinutes)} मिनेट` : '-';

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
    ['व्यक्तिगत मासिक दैनिक हाजिरी विवरण (INDIVIDUAL MONTHLY ATTENDANCE REGISTER)'],
    [`नेपाली क्यालेन्डर (विक्रम संवत्) - ${data.monthNameNp} ${toNepaliDigits(bsYear)}`],
    [],
    // Employee Info Card
    ['कर्मचारीको विवरण:', '', '', '', 'मासिक हाजिरी सारांश:'],
    [
      `कर्मचारीको नाम: ${data.staff.name}`,
      `बायोमेट्रिक PIN: #${data.staff.pin}`,
      `विभाग: ${data.staff.department}`,
      '',
      `महिना: ${data.monthNameNp} ${toNepaliDigits(bsYear)} (वि.सं.)`,
      `कुल दिन: ${toNepaliDigits(data.daysCount)} दिन`
    ],
    [
      `पद: ${data.staff.designation}`,
      `साप्ताहिक बिदा: ${data.staff.weeklyOff}`,
      `डाउनलोड मिति: ${todayBs.formattedNp}`,
      '',
      `उपस्थित दिन: ${toNepaliDigits(data.summary.presentDays)} दिन`,
      `साप्ताहिक बिदा: ${toNepaliDigits(data.summary.weekOffDays)} दिन`
    ],
    [
      '',
      '',
      '',
      '',
      `ढिलो दिन: ${toNepaliDigits(data.summary.lateDays)} दिन`,
      `अनुपस्थित दिन: ${toNepaliDigits(data.summary.absentDays)} दिन`
    ],
    [
      '',
      '',
      '',
      '',
      `स्वीकृत बिदा: ${toNepaliDigits(data.summary.leaveDays)} दिन`,
      `कुल काम गरेको समय: ${toNepaliDigits(data.summary.totalWorkedHours.toFixed(1))} घण्टा`
    ],
    [
      '',
      '',
      '',
      '',
      `कुल ढिलो समय: ${toNepaliDigits(data.summary.totalLateMinutes)} मिनेट`,
      `हाजिरी दर: ${toNepaliDigits(data.summary.attendanceRate)}%`
    ],
    [],
    // Table Headers
    [
      'क्र.सं.',
      'मिति (वि.सं.)',
      'बार',
      'स्थिति (Status)',
      'आएको समय (In Time)',
      'गएको समय (Out Time)',
      'काम गरेको समय',
      'ढिलो समय',
      'कैफियत / विवरण'
    ]
  ];

  // Table Data Rows
  data.days.forEach(d => {
    rows.push([
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
  });

  // Table Summary Footer
  rows.push([]);
  rows.push([
    'कुल / सारांश',
    `${toNepaliDigits(data.daysCount)} दिन`,
    '',
    `उपस्थित: ${toNepaliDigits(data.summary.presentDays)} दिन`,
    '',
    '',
    `${toNepaliDigits(data.summary.totalWorkedHours.toFixed(1))} घण्टा`,
    `${toNepaliDigits(data.summary.totalLateMinutes)} मिनेट`,
    `हाजिरी दर: ${toNepaliDigits(data.summary.attendanceRate)}%`
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column Widths for comfortable readability in Excel
  ws['!cols'] = [
    { wch: 8 },  // क्र.सं.
    { wch: 16 }, // मिति (वि.सं.)
    { wch: 14 }, // बार
    { wch: 28 }, // स्थिति (Status)
    { wch: 20 }, // आएको समय
    { wch: 20 }, // गएको समय
    { wch: 18 }, // काम गरेको समय
    { wch: 16 }, // ढिलो समय
    { wch: 32 }  // कैफियत / विवरण
  ];

  const wb = XLSX.utils.book_new();
  const safeSheetName = `${data.monthNameNp} ${bsYear}`.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const cleanName = data.staff.name.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
  const fileName = `AP1_Staff_${data.staff.pin || 'PIN'}_${cleanName}_${bsYear}_${data.monthNameEn}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
