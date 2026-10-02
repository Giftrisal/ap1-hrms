'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';
import { DailyAttendance, Employee, AttendanceStatus } from '@/lib/types';
import { getNepaliDate } from '@/lib/nepali-date';
import { 
  Clock, 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  X, 
  PlusCircle,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Printer,
  Building2,
  Users,
  UserCheck,
  UserX,
  Sparkles,
  Link as LinkIcon,
  Check,
  Briefcase
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface HardwareStatus {
  online: boolean;
  ip: string;
  lastSync: string | null;
  totalLogs: number;
}

export function getLocalDateStr(dateObj: Date = new Date()): string {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function extractDateStr(dateOrTime?: string | null): string {
  if (!dateOrTime) return '';
  const cleaned = String(dateOrTime).trim();
  if (cleaned.includes('T')) return cleaned.split('T')[0];
  if (cleaned.includes(' ')) return cleaned.split(' ')[0];
  return cleaned.slice(0, 10);
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const NEPALI_DAY_NAMES: Record<string, string> = {
  Sunday: 'आइतबार (Sunday)',
  Monday: 'सोमबार (Monday)',
  Tuesday: 'मंगलबार (Tuesday)',
  Wednesday: 'बुधबार (Wednesday)',
  Thursday: 'बिहीबार (Thursday)',
  Friday: 'शुक्रबार (Friday)',
  Saturday: 'शनिबार (Saturday)'
};

export function getWeekDates(dateStr: string): string[] {
  // Returns [Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday] for the week containing dateStr
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 is Sunday, 6 is Saturday
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(sunday);
    dayDate.setDate(sunday.getDate() + i);
    const yyyy = dayDate.getFullYear();
    const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
    const dd = String(dayDate.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

export interface ResolvedDayStatus {
  status: AttendanceStatus;
  isWeekOff: boolean;
  isSwapped: boolean;
  isHolidayWork: boolean;
  holidayStatus?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  remarks: string;
}

export function resolveStaffWeekStatus(
  emp: Employee,
  targetDate: string,
  allRecords: DailyAttendance[]
): ResolvedDayStatus {
  const weekDates = getWeekDates(targetDate);
  const assignedDay = emp.weekly_off_day || 'Saturday';
  const assignedDayIdx = DAY_NAMES.indexOf(assignedDay as any) >= 0 ? DAY_NAMES.indexOf(assignedDay as any) : 6;
  const assignedOffDate = weekDates[assignedDayIdx];

  // Helper to check if employee worked/punched on date D
  const hasWorkedOn = (d: string) => {
    return allRecords.some(r => 
      (r.employee_id === emp.id || (emp.biometric_pin && String(r.employee_pin).trim() === String(emp.biometric_pin).trim())) &&
      (extractDateStr(r.date) || extractDateStr(r.in_time)) === d &&
      Boolean(r.in_time || r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY')
    );
  };

  // Target record if exists
  const targetRecord = allRecords.find(r => 
    (r.employee_id === emp.id || (emp.biometric_pin && String(r.employee_pin).trim() === String(emp.biometric_pin).trim())) &&
    (extractDateStr(r.date) || extractDateStr(r.in_time)) === targetDate
  );

  const workedOnAssignedOff = hasWorkedOn(assignedOffDate);
  const workedOnTarget = hasWorkedOn(targetDate);

  // SCENARIO 1: Staff did NOT work on assigned off-day (Normal Routine)
  if (!workedOnAssignedOff) {
    if (targetDate === assignedOffDate) {
      return {
        status: 'WEEK_OFF',
        isWeekOff: true,
        isSwapped: false,
        isHolidayWork: false,
        remarks: `तोकिएको साप्ताहिक बिदा (${NEPALI_DAY_NAMES[assignedDay] || assignedDay})`
      };
    }
    if (workedOnTarget) {
      return {
        status: targetRecord?.status || 'PRESENT',
        isWeekOff: false,
        isSwapped: false,
        isHolidayWork: false,
        remarks: targetRecord?.remarks || 'Biometric'
      };
    }
    if (targetRecord?.status === 'ON_LEAVE' || targetRecord?.status === 'HALF_DAY') {
      return {
        status: targetRecord.status,
        isWeekOff: false,
        isSwapped: false,
        isHolidayWork: false,
        remarks: targetRecord.remarks || 'बिदामा'
      };
    }
    return {
      status: 'ABSENT',
      isWeekOff: false,
      isSwapped: false,
      isHolidayWork: false,
      remarks: 'हाजिरी नभएको (Absent)'
    };
  }

  // SCENARIO 2: Staff DID work on assigned off-day! (Dynamic Auto-Swap Scenario)
  // They are owed 1 day off in this week.
  // Find all unworked days in this week (excluding assignedOffDate)
  const unworkedDays = weekDates.filter(d => d !== assignedOffDate && !hasWorkedOn(d));

  if (unworkedDays.length > 0) {
    // The FIRST unworked day becomes their auto-swapped week-off!
    const swappedOffDate = unworkedDays[0];
    const assignedNpName = NEPALI_DAY_NAMES[assignedDay]?.split(' ')[0] || assignedDay;

    if (targetDate === swappedOffDate) {
      return {
        status: 'WEEK_OFF',
        isWeekOff: true,
        isSwapped: true,
        isHolidayWork: false,
        remarks: `${assignedNpName} काम गरेको सट्टामा आज स्वतः साप्ताहिक बिदा (Auto Swapped Week-Off)`
      };
    }

    if (targetDate === assignedOffDate) {
      return {
        status: targetRecord?.status || 'PRESENT',
        isWeekOff: false,
        isSwapped: false,
        isHolidayWork: false,
        remarks: 'सट्टा बिदा मिलाइएको नियमित ड्युटी (Compensated Shift)'
      };
    }

    if (unworkedDays.indexOf(targetDate) > 0) {
      // Subsequent unworked days after the 1st swapped week-off are absent
      return {
        status: targetRecord?.status === 'ON_LEAVE' ? 'ON_LEAVE' : 'ABSENT',
        isWeekOff: false,
        isSwapped: false,
        isHolidayWork: false,
        remarks: targetRecord?.status === 'ON_LEAVE' ? (targetRecord.remarks || 'बिदामा') : 'हाजिरी नभएको (Absent)'
      };
    }

    // Worked on targetDate
    return {
      status: targetRecord?.status || 'PRESENT',
      isWeekOff: false,
      isSwapped: false,
      isHolidayWork: false,
      remarks: targetRecord?.remarks || 'Biometric'
    };
  }

  // SCENARIO 3: Worked all 7 days of the week! (Non-stop duty, zero days off)
  if (targetDate === assignedOffDate) {
    return {
      status: targetRecord?.status || 'PRESENT',
      isWeekOff: true,
      isSwapped: false,
      isHolidayWork: true,
      holidayStatus: targetRecord?.holiday_work_status || 'PENDING_APPROVAL',
      remarks: 'साप्ताहिक बिदामा अतिरिक्त काम (7 Days Duty - Approval Required)'
    };
  }

  return {
    status: targetRecord?.status || 'PRESENT',
    isWeekOff: false,
    isSwapped: false,
    isHolidayWork: false,
    remarks: targetRecord?.remarks || 'Biometric'
  };
}

export default function AttendancePage() {
  const { t, language } = useLanguage();
  const { role } = useAuth();

  // Primary attendance records
  const [records, setRecords] = useState<DailyAttendance[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_attendance_records');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Auto-correct & purge only orphaned test punch for PIN 101 on 2026-09-25
            const cleaned = parsed.filter((r: any) => {
              const d = extractDateStr(r.date || r.in_time);
              if (d === '2026-09-25' && String(r.employee_pin).trim() === '101') return false;
              return true;
            });
            localStorage.setItem('goinfi_attendance_records', JSON.stringify(cleaned));
            return cleaned.map((r: any) => {
              let rec = { ...r };
              if (!rec.out_time || rec.in_time === rec.out_time) {
                rec.worked_hours = 0;
              }
              if (rec.status === 'LATE' || rec.late_minutes > 0) {
                rec.status = 'PRESENT';
                rec.late_minutes = 0;
              }
              return rec;
            });
          }
        } catch (e) {}
      }
    }
    return [];
  });

  // Staff directory for matching & quick-assign
  const [staffList, setStaffList] = useState<Employee[]>([]);

  // Filters & State - strictly defaults to today's local date
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateStr());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editRecord, setEditRecord] = useState<DailyAttendance | null>(null);

  // Hardware Status & Manual Sync Trigger
  const [hwStatus, setHwStatus] = useState<HardwareStatus>({
    online: true,
    ip: '192.168.2.201',
    lastSync: null,
    totalLogs: 0
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Unassigned PINs from machine
  const [unassignedPins, setUnassignedPins] = useState<string[]>([]);
  const [assignPinModal, setAssignPinModal] = useState<string | null>(null);
  const [assignStaffId, setAssignStaffId] = useState<string>('');
  const [isAssigningPin, setIsAssigningPin] = useState<boolean>(false);

  const openAssignPinModal = (pin: string) => {
    const cleanPin = String(pin || '').trim();
    if (!cleanPin) return;
    setAssignPinModal(cleanPin);

    // Auto-detect employee if ID or PIN matches
    const matched = staffList.find(
      s => String(s.biometric_pin || '').trim() === cleanPin ||
           String(s.id || '').trim() === cleanPin ||
           String(s.id || '').trim() === `emp-${cleanPin}`
    );
    if (matched) {
      setAssignStaffId(matched.id);
    } else {
      setAssignStaffId('');
    }
  };

  useEffect(() => {
    if (assignPinModal && !assignStaffId && staffList.length > 0) {
      const cleanPin = String(assignPinModal).trim();
      const matched = staffList.find(
        s => String(s.biometric_pin || '').trim() === cleanPin ||
             String(s.id || '').trim() === cleanPin ||
             String(s.id || '').trim() === `emp-${cleanPin}`
      );
      if (matched) {
        setAssignStaffId(matched.id);
      }
    }
  }, [assignPinModal, assignStaffId, staffList]);

  // Manual Punch Creation Modal
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualForm, setManualForm] = useState({
    staffId: '',
    date: new Date().toISOString().split('T')[0],
    inTime: '09:00',
    outTime: '17:30',
    status: 'PRESENT',
    remarks: 'फिल्ड ड्युटी / म्यानुअल हाजिरी'
  });

  // Monthly Report Modal
  const [showMonthlyModal, setShowMonthlyModal] = useState<boolean>(false);
  const [monthlyYearMonth, setMonthlyYearMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Assign Rotational Week-Off Modal
  const [showWeekOffModal, setShowWeekOffModal] = useState<boolean>(false);
  const [weekOffStaffId, setWeekOffStaffId] = useState<string>('');

  // Week-Off Roster Management Modal
  const [showRosterModal, setShowRosterModal] = useState<boolean>(false);
  const [rosterStaffList, setRosterStaffList] = useState<{ id: string; name: string; pin: string; dept: string; offDay: string }[]>([]);
  const [rosterSearch, setRosterSearch] = useState<string>('');
  const [isSavingRoster, setIsSavingRoster] = useState<boolean>(false);

  const openRosterModal = () => {
    setRosterStaffList(
      staffList.map(s => ({
        id: s.id,
        name: s.full_name,
        pin: s.biometric_pin || '-',
        dept: s.department_name || 'AP1 Television',
        offDay: s.weekly_off_day || 'Saturday'
      }))
    );
    setRosterSearch('');
    setShowRosterModal(true);
  };

  const handleSaveRoster = async () => {
    setIsSavingRoster(true);
    try {
      const updatedStaffList = staffList.map(s => {
        const item = rosterStaffList.find(r => r.id === s.id);
        return item ? { ...s, weekly_off_day: item.offDay } : s;
      });

      // 1. Sync to API & Supabase
      await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff: updatedStaffList })
      });

      // 2. Update local state & localStorage
      setStaffList(updatedStaffList);
      if (typeof window !== 'undefined') {
        localStorage.setItem('goinfi_staff_list', JSON.stringify(updatedStaffList));
      }

      setShowRosterModal(false);
      alert('साप्ताहिक बिदा तालिका (Weekly Off Roster) सफलतापूर्वक सुरक्षित गरियो!');
    } catch (e: any) {
      alert(`त्रुटि: ${e?.message || 'रोस्टर सेभ हुन सकेन।'}`);
    } finally {
      setIsSavingRoster(false);
    }
  };

  const handleBulkSetOffDay = (offDay: string) => {
    setRosterStaffList(prev => prev.map(item => ({ ...item, offDay })));
  };

  // Save records to state + localStorage
  const saveRecordsList = (newList: DailyAttendance[]) => {
    setRecords(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_attendance_records', JSON.stringify(newList));
    }
  };

  // 1. Fetch Staff Directory on Mount
  const fetchStaffDirectory = async () => {
    try {
      const res = await fetch('/api/staff');
      const data = await res.json();
      if (data.success && Array.isArray(data.staff)) {
        setStaffList(data.staff);
        if (typeof window !== 'undefined') {
          localStorage.setItem('goinfi_staff_list', JSON.stringify(data.staff));
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchStaffDirectory();
  }, []);

  // 2. Poll /api/biometric/sync for live hardware punches
  const syncBiometricPunches = async (showFeedback = false) => {
    try {
      if (showFeedback) setIsSyncing(true);
      const res = await fetch('/api/biometric/sync');
      if (!res.ok) {
        setHwStatus(prev => ({ ...prev, online: false }));
        return;
      }

      const data = await res.json();
      setHwStatus({
        online: true,
        ip: data.device_ip || '192.168.2.201',
        lastSync: data.last_sync || new Date().toISOString(),
        totalLogs: data.cached_logs_count || (data.recent_logs ? data.recent_logs.length : 0)
      });

      if (data.recent_logs && Array.isArray(data.recent_logs)) {
        // Load staff list for lookup
        let currentStaff = staffList;
        if (currentStaff.length === 0 && typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('goinfi_staff_list');
            if (saved) currentStaff = JSON.parse(saved);
          } catch (e) {}
        }

        const foundUnassigned: string[] = [];

        setRecords((prev) => {
          let updated = [...prev];
          let hasChanges = false;

          // Auto-purge any orphaned biometric logs for today that do not exist on the server
          const validKeys = new Set(data.recent_logs.map((l: any) => `${String(l.user_id || l.biometric_pin || '').trim()}_${extractDateStr(l.punch_time)}`));
          const purged = updated.filter(r => {
            if (r.id?.startsWith('zk-') && (extractDateStr(r.date) || extractDateStr(r.in_time)) === getLocalDateStr()) {
              return validKeys.has(`${String(r.employee_pin).trim()}_${getLocalDateStr()}`);
            }
            return true;
          });
          if (purged.length !== updated.length) {
            updated = purged;
            hasChanges = true;
          }

          for (const log of data.recent_logs) {
            const pin = String(log.user_id || log.biometric_pin || '').trim();
            if (!pin || pin === '999') continue;

            const matchedEmp = currentStaff.find(
              (s: any) => String(s.biometric_pin) === pin || String(s.id) === pin || String(s.id) === `emp-${pin}`
            );

            if (!matchedEmp) {
              if (!foundUnassigned.includes(pin)) {
                foundUnassigned.push(pin);
              }
            }

            const empName = matchedEmp?.full_name || `कर्मचारी (PIN #${pin})`;
            const deptName = matchedEmp?.department_name || 'AP1 Television';
            const designation = matchedEmp?.designation || (matchedEmp ? 'Staff' : 'नयाँ औंठा पञ्च');
            const photo = matchedEmp?.photo_url;
            const punchDate = extractDateStr(log.punch_time) || getLocalDateStr();

            const existingIdx = updated.findIndex(
              (r) => String(r.employee_pin) === pin && (extractDateStr(r.date) || extractDateStr(r.in_time)) === punchDate
            );

            if (existingIdx !== -1) {
              const existing = updated[existingIdx];
              const punchTime = log.punch_time;
              let newOut = existing.out_time;
              let newIn = existing.in_time;

              if (log.punch_type === 'Check-Out' || log.punch_type === 1 || (newIn && punchTime > newIn)) {
                newOut = punchTime;
              }
              if (!newIn || punchTime < newIn) {
                newIn = punchTime;
              }

              // Calculate worked hours ONLY when both In and Out punches exist
              let workedHours = 0;
              if (newIn && newOut && newIn !== newOut) {
                const diffMs = new Date(newOut).getTime() - new Date(newIn).getTime();
                if (diffMs > 0) {
                  workedHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
                }
              }

              const wasWeekOff = existing.status === 'WEEK_OFF' || existing.status === 'WEEKEND' || Boolean(existing.is_holiday_work);
              const holidayStatus = wasWeekOff 
                ? (existing.holiday_work_status || 'PENDING_APPROVAL')
                : existing.holiday_work_status;

              if (existing.in_time !== newIn || existing.out_time !== newOut || existing.employee_name !== empName || existing.worked_hours !== workedHours || (wasWeekOff && !existing.is_holiday_work)) {
                updated[existingIdx] = {
                  ...existing,
                  employee_name: empName,
                  department_name: deptName,
                  designation: designation,
                  employee_photo: photo || existing.employee_photo,
                  in_time: newIn,
                  out_time: newOut,
                  status: 'PRESENT',
                  is_holiday_work: wasWeekOff ? true : existing.is_holiday_work,
                  holiday_work_status: holidayStatus,
                  late_minutes: 0,
                  worked_hours: workedHours,
                  remarks: wasWeekOff
                    ? (holidayStatus === 'APPROVED' ? 'बिदामा काम स्वीकृत (Approved Overtime)' : '⚠️ बिदाको दिन काम (Admin Approval Pending)')
                    : (matchedEmp ? 'ZKTeco Live Machine' : '⚠️ अनरजिस्टर्ड PIN')
                };
                hasChanges = true;
              }
            } else {
              const isOutPunch = log.punch_type === 'Check-Out' || log.punch_type === 1;
              const newRec: DailyAttendance = {
                id: `zk-${pin}-${punchDate}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                employee_id: matchedEmp?.id || `unassigned-${pin}`,
                employee_name: empName,
                employee_pin: pin,
                department_name: deptName,
                designation: designation,
                employee_photo: photo,
                date: punchDate,
                in_time: log.punch_time,
                out_time: isOutPunch ? log.punch_time : undefined,
                status: 'PRESENT',
                late_minutes: 0,
                early_exit_minutes: 0,
                overtime_minutes: 0,
                worked_hours: 0, // 0 until checked out!
                source: 'biometric',
                remarks: matchedEmp ? 'ZKTeco Live Machine' : '⚠️ अनरजिस्टर्ड PIN'
              };
              updated.unshift(newRec);
              hasChanges = true;
            }
          }

          if (hasChanges && typeof window !== 'undefined') {
            localStorage.setItem('goinfi_attendance_records', JSON.stringify(updated));
          }
          return updated;
        });

        setUnassignedPins(foundUnassigned);
        if (showFeedback) {
          setSyncFeedback(`मेशिनबाट ${data.recent_logs.length} वटा पञ्च सफलतापूर्वक सिङ्क भयो!`);
          setTimeout(() => setSyncFeedback(null), 3500);
        }
      }
    } catch (err) {
      setHwStatus(prev => ({ ...prev, online: false }));
    } finally {
      if (showFeedback) setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncBiometricPunches(false);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      syncBiometricPunches(false);
    }, 45000); // 45s interval, pauses when tab is inactive
    return () => clearInterval(interval);
  }, [staffList]);

  // Quick Date Filters
  const setQuickDate = (type: 'today' | 'yesterday' | 'week' | 'month') => {
    if (type === 'today') {
      setSelectedDate(getLocalDateStr());
    } else if (type === 'yesterday') {
      setSelectedDate(getLocalDateStr(new Date(Date.now() - 86400000)));
    } else {
      setSelectedDate(getLocalDateStr());
    }
  };

  // Assign Unassigned PIN to staff
  const handleAssignPin = async () => {
    if (!assignPinModal) return;
    if (!assignStaffId) {
      alert('कृपया सूचीबाट कर्मचारी छान्नुहोस् (Please select an employee)');
      return;
    }

    const cleanPin = String(assignPinModal).trim();
    const targetStaff = staffList.find(s => s.id === assignStaffId);
    if (!targetStaff) {
      alert('कर्मचारी फेला परेन। कृपया पुनः प्रयास गर्नुहोस्।');
      return;
    }

    setIsAssigningPin(true);
    try {
      const updatedStaff = { ...targetStaff, biometric_pin: cleanPin };

      // 1. Send to server via POST (action: assign_pin)
      let res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_pin',
          staffId: targetStaff.id,
          pin: cleanPin,
          employee: updatedStaff
        })
      });

      // 2. Fallback to PUT if needed
      if (!res.ok) {
        res = await fetch('/api/staff', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedStaff)
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'सर्भरमा सेभ हुन सकेन।');
      }

      // 3. Immediately update local staffList state & localStorage
      const updatedStaffList = staffList.map(s => {
        if (s.id === targetStaff.id) {
          return { ...s, biometric_pin: cleanPin };
        }
        if (String(s.biometric_pin || '').trim() === cleanPin) {
          return { ...s, biometric_pin: '' };
        }
        return s;
      });
      setStaffList(updatedStaffList);
      if (typeof window !== 'undefined') {
        localStorage.setItem('goinfi_staff_list', JSON.stringify(updatedStaffList));
      }

      // 4. Update current attendance records matching this pin
      const updatedRecords = records.map(r => {
        if (String(r.employee_pin || '').trim() === cleanPin) {
          return {
            ...r,
            employee_id: targetStaff.id,
            employee_name: targetStaff.full_name,
            department_name: targetStaff.department_name,
            designation: targetStaff.designation,
            employee_photo: targetStaff.photo_url,
            remarks: 'ZKTeco Live Machine'
          };
        }
        return r;
      });
      saveRecordsList(updatedRecords);

      // 5. Remove this PIN from unassigned list
      setUnassignedPins(prev => prev.filter(p => String(p || '').trim() !== cleanPin));

      const assignedPinNum = cleanPin;
      const assignedStaffName = targetStaff.full_name;

      // 6. Close modal
      setAssignPinModal(null);
      setAssignStaffId('');

      // 7. Refresh in background
      fetchStaffDirectory();

      alert(`मेशिन PIN #${assignedPinNum} सफलतापूर्वक ${assignedStaffName} सँग जोडिएको छ!`);
    } catch (e: any) {
      console.error('Failed to assign PIN:', e);
      alert(`त्रुटि: ${e?.message || 'PIN जोड्न असफल भयो।'}`);
    } finally {
      setIsAssigningPin(false);
    }
  };

  // Manual Punch Submission
  const handleAddManualPunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.staffId) {
      alert('कृपया कर्मचारी छान्नुहोस्');
      return;
    }

    const emp = staffList.find(s => s.id === manualForm.staffId);
    if (!emp) return;

    const inTimeIso = `${manualForm.date}T${manualForm.inTime}:00`;
    const outTimeIso = manualForm.outTime ? `${manualForm.date}T${manualForm.outTime}:00` : undefined;

    const newRecord: DailyAttendance = {
      id: `manual-${emp.id}-${manualForm.date}-${Date.now()}`,
      employee_id: emp.id,
      employee_name: emp.full_name,
      employee_pin: emp.biometric_pin || '0',
      employee_photo: emp.photo_url,
      department_name: emp.department_name || 'AP1 Television',
      designation: emp.designation || 'Staff',
      date: manualForm.date,
      in_time: inTimeIso,
      out_time: outTimeIso,
      status: manualForm.status as any,
      late_minutes: 0,
      early_exit_minutes: 0,
      overtime_minutes: 0,
      worked_hours: outTimeIso ? Math.max(0, Math.round(((new Date(outTimeIso).getTime() - new Date(inTimeIso).getTime()) / (1000 * 60 * 60)) * 10) / 10) : 0,
      source: 'manual',
      remarks: manualForm.remarks
    };

    const updated = [newRecord, ...records.filter(r => !(r.employee_id === emp.id && r.date === manualForm.date))];
    saveRecordsList(updated);
    setShowManualModal(false);
    alert('म्यानुअल हाजिरी सफलतापूर्वक थपियो!');
  };

  // Delete & Clear handlers
  const handleDeleteRecord = (id: string, name: string) => {
    if (confirm(`Delete attendance record for ${name}?`)) {
      const updated = records.filter(r => r.id !== id);
      saveRecordsList(updated);
    }
  };

  const handleClearAllRecords = () => {
    if (confirm('Delete all attendance records?')) {
      saveRecordsList([]);
    }
  };

  // Update existing record
  const handleUpdateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;
    const updated = records.map(r => r.id === editRecord.id ? editRecord : r);
    saveRecordsList(updated);
    setEditRecord(null);
    alert('हाजिरी विवरण सफलतापूर्वक सच्याइयो!');
  };

  // 1-Click Approve / Reject Holiday & Week-Off Duty
  const handleApproveHolidayWork = (recordId: string, approve: boolean) => {
    const updated = records.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          is_holiday_work: true,
          holiday_work_status: (approve ? 'APPROVED' : 'REJECTED') as any,
          approved_by: 'Master Admin',
          approved_at: new Date().toISOString(),
          remarks: approve 
            ? `${r.remarks || ''} [बिदामा काम स्वीकृत - Approved Overtime]`.trim() 
            : `${r.remarks || ''} [बिदामा काम अस्वीकृत - Rejected]`.trim()
        };
      }
      return r;
    });
    saveRecordsList(updated);
    alert(approve ? 'बिदाको दिन काम गरेको हाजिरी सफलतापूर्वक स्वीकृत (Approved) भयो!' : 'बिदाको दिनको हाजिरी अस्वीकृत (Rejected) गरियो।');
  };

  // 1-Click Quick Mark Rotational Week-Off for any staff
  const handleQuickMarkWeekOff = (emp: { id: string; full_name: string; biometric_pin?: string; photo_url?: string; department_name?: string; designation?: string; }) => {
    const existingIndex = records.findIndex(r => 
      (r.employee_id === emp.id || (emp.biometric_pin && String(r.employee_pin) === String(emp.biometric_pin))) && 
      (extractDateStr(r.date) || extractDateStr(r.in_time)) === selectedDate
    );
    let updated: DailyAttendance[];
    if (existingIndex >= 0) {
      updated = records.map((r, i) => i === existingIndex ? {
        ...r,
        status: 'WEEK_OFF' as any,
        is_holiday_work: false,
        holiday_work_status: undefined,
        worked_hours: 0,
        remarks: 'रोटेसनल साप्ताहिक बिदा (Rotational Week-Off)'
      } : r);
    } else {
      const newRec: DailyAttendance = {
        id: `weekoff-${emp.id}-${selectedDate}-${Date.now()}`,
        employee_id: emp.id,
        employee_name: emp.full_name,
        employee_pin: emp.biometric_pin || '0',
        employee_photo: emp.photo_url,
        department_name: emp.department_name || 'AP1 Television',
        designation: emp.designation || 'Staff',
        date: selectedDate,
        status: 'WEEK_OFF' as any,
        late_minutes: 0,
        early_exit_minutes: 0,
        overtime_minutes: 0,
        worked_hours: 0,
        source: 'manual',
        remarks: 'रोटेसनल साप्ताहिक बिदा (Rotational Week-Off)'
      };
      updated = [newRec, ...records];
    }
    saveRecordsList(updated);
    alert(`${emp.full_name} को मिति ${selectedDate} मा साप्ताहिक बिदा (Week-Off) सफलतापूर्वक मार्क भयो!`);
  };

  // Assign Rotational Week-Off via Modal Form
  const handleAssignWeekOffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weekOffStaffId) {
      alert('कृपया कर्मचारी छान्नुहोस् (Please select an employee)');
      return;
    }
    const staff = staffList.find(s => s.id === weekOffStaffId);
    if (!staff) {
      alert('कर्मचारी फेला परेन।');
      return;
    }
    handleQuickMarkWeekOff(staff);
    setShowWeekOffModal(false);
    setWeekOffStaffId('');
  };

  // 1. Fully evaluated daily attendance list combining staffList & records with Auto Week-Off Engine
  const dailyEvaluatedList = useMemo(() => {
    // Map existing records for selectedDate by employee_id or PIN
    const dateRecordsMap = new Map<string, DailyAttendance>();
    records.forEach(r => {
      const recDate = extractDateStr(r.date) || extractDateStr(r.in_time);
      if (recDate === selectedDate) {
        if (r.employee_id) dateRecordsMap.set(r.employee_id, r);
        if (r.employee_pin) dateRecordsMap.set(`pin-${String(r.employee_pin).trim()}`, r);
      }
    });

    const evaluated: DailyAttendance[] = staffList.map(emp => {
      const existing = dateRecordsMap.get(emp.id) || (emp.biometric_pin ? dateRecordsMap.get(`pin-${String(emp.biometric_pin).trim()}`) : undefined);
      const resolved = resolveStaffWeekStatus(emp, selectedDate, records);

      if (existing) {
        let isHolidayWork = existing.is_holiday_work ?? resolved.isHolidayWork;
        let holidayStatus = existing.holiday_work_status ?? resolved.holidayStatus;
        let remarks = existing.remarks;

        if (resolved.isHolidayWork && !existing.is_holiday_work) {
          isHolidayWork = true;
          holidayStatus = existing.holiday_work_status || 'PENDING_APPROVAL';
          remarks = resolved.remarks;
        } else if (resolved.isSwapped && existing.status === 'WEEK_OFF') {
          remarks = resolved.remarks;
        }

        return {
          ...existing,
          employee_name: emp.full_name || existing.employee_name,
          department_name: emp.department_name || existing.department_name,
          designation: emp.designation || existing.designation,
          employee_photo: emp.photo_url || existing.employee_photo,
          is_holiday_work: isHolidayWork,
          holiday_work_status: holidayStatus,
          remarks: remarks || existing.remarks
        };
      }

      // Synthesized record for unpunched staff on selectedDate
      return {
        id: `auto-${emp.id}-${selectedDate}`,
        employee_id: emp.id,
        employee_name: emp.full_name,
        employee_pin: emp.biometric_pin || '-',
        employee_photo: emp.photo_url,
        department_name: emp.department_name || 'AP1 Television',
        designation: emp.designation || 'Staff',
        date: selectedDate,
        status: resolved.status,
        late_minutes: 0,
        early_exit_minutes: 0,
        overtime_minutes: 0,
        worked_hours: 0,
        source: 'auto_system',
        is_holiday_work: resolved.isHolidayWork,
        holiday_work_status: resolved.holidayStatus,
        remarks: resolved.remarks
      };
    });

    // Also include unassigned punches or punches from staff not in staffList
    records.forEach(r => {
      const recDate = extractDateStr(r.date) || extractDateStr(r.in_time);
      if (recDate === selectedDate) {
        const isAlreadyIncluded = staffList.some(s => s.id === r.employee_id || (s.biometric_pin && String(s.biometric_pin).trim() === String(r.employee_pin).trim()));
        if (!isAlreadyIncluded) {
          evaluated.push(r);
        }
      }
    });

    return evaluated;
  }, [staffList, records, selectedDate]);

  // Derived filtered records for table - STRICTLY filtered by selectedDate & active filters
  const filteredRecords = useMemo(() => {
    return dailyEvaluatedList.filter(r => {
      // 1. Department match
      if (departmentFilter !== 'ALL' && r.department_name !== departmentFilter) return false;

      // 2. Status filter
      if (statusFilter === 'IN_OFFICE') {
        if (!r.in_time || r.out_time) return false;
      } else if (statusFilter === 'COMPLETED') {
        if (!r.in_time || !r.out_time) return false;
      } else if (statusFilter === 'WEEK_OFF') {
        if (r.status !== 'WEEK_OFF' && r.status !== 'WEEKEND') return false;
      } else if (statusFilter === 'HOLIDAY_PENDING') {
        if (r.holiday_work_status !== 'PENDING_APPROVAL') return false;
      } else if (statusFilter !== 'ALL') {
        if (r.status !== statusFilter) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.employee_name?.toLowerCase().includes(q) ?? false;
        const matchesPin = r.employee_pin?.includes(q) ?? false;
        const matchesDept = r.department_name?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesPin && !matchesDept) return false;
      }

      return true;
    });
  }, [dailyEvaluatedList, departmentFilter, statusFilter, searchQuery]);

  // KPI Metrics for selected date
  const kpiTotal = dailyEvaluatedList.length;
  const kpiPresent = dailyEvaluatedList.filter(r => r.status === 'PRESENT' || r.in_time).length;
  const kpiInOffice = dailyEvaluatedList.filter(r => r.in_time && !r.out_time).length;
  const kpiCompleted = dailyEvaluatedList.filter(r => r.in_time && r.out_time).length;
  const kpiWeekOff = dailyEvaluatedList.filter(r => r.status === 'WEEK_OFF' || r.status === 'WEEKEND').length;
  const kpiOnLeave = dailyEvaluatedList.filter(r => r.status === 'ON_LEAVE' || r.status === 'HALF_DAY').length;
  const kpiHolidayPending = dailyEvaluatedList.filter(r => r.holiday_work_status === 'PENDING_APPROVAL').length;
  const kpiAbsent = dailyEvaluatedList.filter(r => r.status === 'ABSENT').length;

  // Departments List
  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach(s => { if (s.department_name) set.add(s.department_name); });
    records.forEach(r => { if (r.department_name) set.add(r.department_name); });
    return Array.from(set);
  }, [staffList, records]);

  // Nepali Date for selected date
  const bsDate = useMemo(() => {
    try {
      return getNepaliDate(selectedDate);
    } catch {
      return null;
    }
  }, [selectedDate]);

  // =========================================================================
  // EXPORT 1: Rich Colored DAILY Excel (.xlsx)
  // =========================================================================
  const exportDailyExcel = () => {
    const rows = [
      ['AP1 TELEVISION NETWORK PVT. LTD.'],
      ['DAILY BIOMETRIC ATTENDANCE REPORT'],
      [`Date (AD): ${selectedDate}`, `Date (BS): ${bsDate?.formattedNp || '-'}`, `Generated At: ${new Date().toLocaleTimeString()}`],
      [`Total Staff: ${kpiTotal}`, `Present: ${kpiPresent}`, `Shift Completed: ${kpiCompleted}`, `Currently In Office: ${kpiInOffice}`, `Absent: ${kpiAbsent}`],
      [], // blank line
      ['S.N.', 'PIN', 'Staff Name', 'Department', 'Designation', 'Status', 'In Time', 'Out Time', 'Worked Hours', 'Remarks']
    ];

    filteredRecords.forEach((r, idx) => {
      const inStr = r.in_time ? new Date(r.in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
      const outStr = r.out_time ? new Date(r.out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
      rows.push([
        String(idx + 1),
        r.employee_pin || '-',
        r.employee_name || '-',
        r.department_name || '-',
        r.designation || '-',
        r.status,
        inStr,
        outStr,
        `${r.worked_hours || 0} hrs`,
        r.remarks || 'Biometric'
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 6 }, { wch: 10 }, { wch: 24 }, { wch: 22 }, { wch: 20 },
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 24 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Attendance');
    XLSX.writeFile(workbook, `AP1_Daily_Attendance_${selectedDate}.xlsx`);
  };

  // =========================================================================
  // EXPORT 2: Official Colored DAILY PDF (.pdf) with Signature Blocks
  // =========================================================================
  const exportDailyPdf = () => {
    const doc = new jsPDF('portrait', 'mm', 'a4');

    // Header Banner
    doc.setFillColor(185, 28, 28); // AP1 Red
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AP1 TELEVISION NETWORK', 14, 11);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('DAILY BIOMETRIC ATTENDANCE VERIFICATION SHEET', 14, 18);
    doc.text('Kathmandu, Nepal | hr.ap1hdtv.com', 140, 18);

    // Date & Summary Sub-Header
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Date: ${selectedDate}  |  Bikram Sambat: ${bsDate?.formattedEn || '-'}`, 14, 32);

    // Summary Metric Pills
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 35, 182, 10, 2, 2, 'F');
    doc.text(`Total Staff: ${kpiTotal}   |   Present: ${kpiPresent}   |   Completed: ${kpiCompleted}   |   In Office: ${kpiInOffice}   |   Absent: ${kpiAbsent}`, 18, 41.5);

    // Table Body
    const tableBody = filteredRecords.map((r, i) => {
      const inStr = r.in_time ? new Date(r.in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
      const outStr = r.out_time ? new Date(r.out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
      return [
        String(i + 1),
        `#${r.employee_pin || '-'}`,
        r.employee_name || 'Staff',
        r.department_name || '-',
        inStr,
        outStr,
        r.status,
        `${r.worked_hours || 8}h`
      ];
    });

    autoTable(doc, {
      startY: 48,
      head: [['S.N.', 'PIN', 'Employee Name', 'Department', 'In Time', 'Out Time', 'Status', 'Worked Hours']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      didParseCell: (data) => {
        // Color code Status column
        if (data.column.index === 6 && data.section === 'body') {
          const val = String(data.cell.raw);
          if (val === 'PRESENT') {
            data.cell.styles.textColor = [16, 185, 129]; // Emerald
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'LATE') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'ABSENT') {
            data.cell.styles.textColor = [225, 29, 72]; // Rose
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // Signature Blocks at Bottom
    const finalY = (doc as any).lastAutoTable?.finalY || 220;
    const signY = Math.min(Math.max(finalY + 25, 245), 265);

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setDrawColor(148, 163, 184);

    // 3 Sign-off boxes
    doc.line(18, signY, 65, signY);
    doc.text('Prepared By (HR Officer)', 24, signY + 5);

    doc.line(82, signY, 128, signY);
    doc.text('Verified By (HOD / Admin)', 87, signY + 5);

    doc.line(145, signY, 192, signY);
    doc.text('Approved By (Managing Director)', 146, signY + 5);

    doc.save(`AP1_Daily_Attendance_${selectedDate}.pdf`);
  };

  // =========================================================================
  // EXPORT 3 & 4: MONTHLY Colored Excel (.xlsx) & PDF (.pdf)
  // =========================================================================
  const generateMonthlySummary = () => {
    // Filter records belonging to selected month (YYYY-MM)
    const monthPrefix = monthlyYearMonth; // e.g. "2026-09"
    const monthRecords = records.filter(r => r.date.startsWith(monthPrefix));

    // Group by staff
    const map = new Map<string, {
      pin: string;
      name: string;
      dept: string;
      desig: string;
      presentDays: number;
      weekOffDays: number;
      lateDays: number;
      totalLateMinutes: number;
      leaveDays: number;
      workedHours: number;
    }>();

    // Initialize with all staff
    staffList.forEach(s => {
      map.set(s.id, {
        pin: s.biometric_pin || '-',
        name: s.full_name,
        dept: s.department_name || 'AP1 Television',
        desig: s.designation || 'Staff',
        presentDays: 0,
        weekOffDays: 0,
        lateDays: 0,
        totalLateMinutes: 0,
        leaveDays: 0,
        workedHours: 0
      });
    });

    monthRecords.forEach(r => {
      const key = r.employee_id || r.employee_pin || 'unknown';
      let entry = map.get(key);
      if (!entry) {
        entry = {
          pin: r.employee_pin || '-',
          name: r.employee_name || 'Staff',
          dept: r.department_name || 'AP1 Television',
          desig: r.designation || 'Staff',
          presentDays: 0,
          weekOffDays: 0,
          lateDays: 0,
          totalLateMinutes: 0,
          leaveDays: 0,
          workedHours: 0
        };
        map.set(key, entry);
      }

      if (r.status === 'PRESENT') {
        entry.presentDays += 1;
      } else if (r.status === 'LATE' || r.late_minutes > 0) {
        entry.presentDays += 1;
        entry.lateDays += 1;
        entry.totalLateMinutes += (r.late_minutes || 0);
      } else if (r.status === 'WEEK_OFF' || r.status === 'WEEKEND') {
        entry.weekOffDays += 1;
      } else if (r.status === 'ON_LEAVE' || r.status === 'HALF_DAY') {
        entry.leaveDays += 1;
      }
      entry.workedHours += (r.worked_hours || (r.status === 'WEEK_OFF' ? 0 : 8));
    });

    return Array.from(map.values());
  };

  const exportMonthlyExcel = () => {
    const summary = generateMonthlySummary();
    const rows = [
      ['AP1 TELEVISION NETWORK PVT. LTD.'],
      ['MONTHLY ATTENDANCE & PAYROLL SUMMARY REPORT'],
      [`Month: ${monthlyYearMonth}`, `Generated At: ${new Date().toLocaleString()}`],
      [],
      ['S.N.', 'PIN', 'Staff Name', 'Department', 'Designation', 'Present Days', 'Week-Off Days', 'Late Days', 'Total Late (Mins)', 'Leave Days', 'Worked Hours', 'Attendance Rate %']
    ];

    summary.forEach((item, idx) => {
      const workingDaysEstimate = 26;
      const rate = Math.min(100, Math.round(((item.presentDays + item.weekOffDays) / 30) * 100));
      rows.push([
        String(idx + 1),
        item.pin,
        item.name,
        item.dept,
        item.desig,
        String(item.presentDays),
        String(item.weekOffDays),
        String(item.lateDays),
        String(item.totalLateMinutes),
        String(item.leaveDays),
        `${Math.round(item.workedHours * 10) / 10} hrs`,
        `${rate}%`
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 }, { wch: 10 }, { wch: 24 }, { wch: 22 }, { wch: 20 },
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 18 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Summary');
    XLSX.writeFile(wb, `AP1_Monthly_Attendance_${monthlyYearMonth}.xlsx`);
    setShowMonthlyModal(false);
  };

  const exportMonthlyPdf = () => {
    const summary = generateMonthlySummary();
    const doc = new jsPDF('landscape', 'mm', 'a4');

    // Header Banner
    doc.setFillColor(185, 28, 28); // AP1 Red
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AP1 TELEVISION NETWORK', 14, 11);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`EXECUTIVE MONTHLY ATTENDANCE & PAYROLL AUDIT (${monthlyYearMonth})`, 14, 18);
    doc.text(`Total Staff Evaluated: ${summary.length}`, 220, 18);

    const tableBody = summary.map((s, i) => {
      const rate = Math.min(100, Math.round(((s.presentDays + s.weekOffDays) / 30) * 100));
      return [
        String(i + 1),
        `#${s.pin}`,
        s.name,
        s.dept,
        String(s.presentDays),
        String(s.weekOffDays),
        String(s.lateDays),
        `${s.totalLateMinutes}m`,
        String(s.leaveDays),
        `${Math.round(s.workedHours)} hrs`,
        `${rate}%`
      ];
    });

    autoTable(doc, {
      startY: 32,
      head: [['S.N.', 'PIN', 'Employee Name', 'Department', 'Present', 'Week-Off', 'Late Days', 'Late (Mins)', 'Leaves', 'Hours Worked', 'Attendance %']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      didParseCell: (data) => {
        if (data.column.index === 10 && data.section === 'body') {
          const num = parseInt(String(data.cell.raw), 10);
          if (num >= 90) {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = 'bold';
          } else if (num < 75) {
            data.cell.styles.textColor = [225, 29, 72];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 160;
    const signY = Math.min(Math.max(finalY + 20, 175), 190);

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setDrawColor(148, 163, 184);

    doc.line(25, signY, 85, signY);
    doc.text('Prepared By (HR & Operations)', 32, signY + 5);

    doc.line(115, signY, 175, signY);
    doc.text('Reviewed By (Finance & Payroll Head)', 120, signY + 5);

    doc.line(205, signY, 265, signY);
    doc.text('Approved By (Managing Director)', 215, signY + 5);

    doc.save(`AP1_Monthly_Attendance_${monthlyYearMonth}.pdf`);
    setShowMonthlyModal(false);
  };

  return (
    <DashboardShell
      title={t.navAttendance}
      subtitle="ZKTeco UF100Plus Live Attendance & Shift Analytics"
    >
      <div className="space-y-4">
        {/* ================================================================= */}
        {/* 1. TOP BAR: LIVE HARDWARE STATUS & QUICK ACTIONS                  */}
        {/* ================================================================= */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-3.5 h-3.5 rounded-full ${hwStatus.online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {hwStatus.online && (
                <div className="absolute inset-0 w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100">
                  ZKTeco UF100Plus Biometric Terminal
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {hwStatus.ip} : 4370
                </span>
                <span className="text-xs text-slate-400">
                  (Auto-Sync: 30s)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                अन्तिम सिङ्क: {hwStatus.lastSync ? new Date(hwStatus.lastSync).toLocaleTimeString() : 'भर्खरै'} | कुल रेकर्डहरू: {hwStatus.totalLogs}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
            {/* Sync Feedback Toast */}
            {syncFeedback && (
              <span className="text-xs text-emerald-400 font-medium animate-fade-in bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                {syncFeedback}
              </span>
            )}

            {/* Manual Sync Button */}
            <button
              onClick={() => syncBiometricPunches(true)}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'सिङ्क हुँदैछ...' : 'Sync Machine Now'}</span>
            </button>

            {/* Manual Punch Button */}
            {(role === 'admin' || role === 'hr') && (
              <>
                <button
                  onClick={openRosterModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-xs cursor-pointer"
                  title="सबै कर्मचारीको साप्ताहिक बिदा तालिका (Week-Off Roster Management)"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>साप्ताहिक बिदा तालिका (Roster)</span>
                </button>

                <button
                  onClick={() => setShowWeekOffModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xs cursor-pointer"
                  title="रोटेसनल साप्ताहिक बिदा तोक्नुहोस् (Assign Rotational Week-Off)"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>+ साप्ताहिक बिदा (Week-Off)</span>
                </button>

                <button
                  onClick={() => setShowManualModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ नयाँ हाजिरी थप्नुहोस्</span>
                </button>
              </>
            )}

            {/* Print Sheet */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors cursor-pointer"
              title="Print Daily Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>प्रिन्ट (A4)</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. UNASSIGNED PIN ALERT BANNER (IF ANY)                            */}
        {/* ================================================================= */}
        {unassignedPins.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  मेशिनबाट नयाँ औंठा पञ्चहरू आएका छन् तर कुनै कर्मचारीसँग जोडिएको छैन:
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {unassignedPins.map(pin => (
                    <span key={pin} className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-200 text-amber-900 border border-amber-300">
                      PIN #{pin}
                    </span>
                  ))}
                  <span className="text-[11px] text-amber-700">
                    (यी PIN हरू वेबसाइटको Staff लिस्टमा दर्ता गर्न बाँकी छ)
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => openAssignPinModal(unassignedPins[0])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer whitespace-nowrap"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>कर्मचारीसँग जोड्नुहोस्</span>
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. INTERACTIVE KPI METRIC CARDS (CLICKABLE FILTER)                */}
        {/* ================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Staff */}
          <div
            onClick={() => setStatusFilter('ALL')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-400'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>कुल कर्मचारी</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{kpiTotal}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">सबै सूची हेर्न क्लिक गर्नुहोस्</p>
          </div>

          {/* Currently In Office */}
          <div
            onClick={() => setStatusFilter('IN_OFFICE')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'IN_OFFICE'
                ? 'bg-purple-50/80 border-purple-500 shadow-sm ring-1 ring-purple-400'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-purple-600 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                अहिले अफिसमा
              </span>
              <Building2 className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-purple-900 mt-1">{kpiInOffice}</p>
            <p className="text-[11px] text-purple-600 mt-0.5">आउट हुन बाँकी स्टाफ</p>
          </div>

          {/* Present */}
          <div
            onClick={() => setStatusFilter('PRESENT')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'PRESENT'
                ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-1 ring-emerald-400'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-600 text-xs font-semibold">
              <span>कुल उपस्थित</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-900 mt-1">{kpiPresent}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">आज पञ्च गरेका कर्मचारी</p>
          </div>

          {/* Shift Completed (Out) */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'COMPLETED'
                ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-400'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-blue-600 text-xs font-semibold">
              <span>ड्युटी पूरा (Out)</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-blue-900 mt-1">{kpiCompleted}</p>
            <p className="text-[11px] text-blue-600 mt-0.5">पञ्च आउट भइसकेका</p>
          </div>

          {/* Rotational Week-Off */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'WEEK_OFF' ? 'ALL' : 'WEEK_OFF')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'WEEK_OFF'
                ? 'bg-indigo-50/80 border-indigo-500 shadow-sm ring-1 ring-indigo-400'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-indigo-600 text-xs font-semibold">
              <span>साप्ताहिक बिदा</span>
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-indigo-900 mt-1">{kpiWeekOff}</p>
            <p className="text-[11px] text-indigo-600 mt-0.5">रोटेसनल अफ (Week-Off)</p>
          </div>

          {/* Absent / Leave */}
          <div
            onClick={() => setStatusFilter('ABSENT')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'ABSENT'
                ? 'bg-rose-50/80 border-rose-500 shadow-sm ring-1 ring-rose-400'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-rose-600 text-xs font-semibold">
              <span>अनुपस्थित / बिदा</span>
              <UserX className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-rose-900 mt-1">{kpiAbsent}</p>
            <p className="text-[11px] text-rose-600 mt-0.5">हाजिरी नभएका (गयल)</p>
          </div>
        </div>

        {/* Holiday / Week-Off Work Approval Alert Banner */}
        {kpiHolidayPending > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-amber-900 text-xs font-bold animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                सूचना: {kpiHolidayPending} जना कर्मचारीले आज बिदा / Week-Off को दिन मेशिनमा हाजिरी गर्नुभएको छ। प्रशासक (Admin) ले अनुमोदन गर्न बाँकी छ।
              </span>
            </div>
            <button
              onClick={() => setStatusFilter('HOLIDAY_PENDING')}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              अनुमोदन सूची हेर्नुहोस् (Review)
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 4. FILTER BAR: DUAL DATE, DEPARTMENTS & EXPORT OPTIONS           */}
        {/* ================================================================= */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
            {/* Left: Date Presets & Date Picker */}
            <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto">
              <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setQuickDate('today')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    selectedDate === getLocalDateStr()
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  आज (Today)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate('yesterday')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    selectedDate === getLocalDateStr(new Date(Date.now() - 86400000))
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  हिजो (Yesterday)
                </button>
              </div>

              {/* Date Input for Backdates */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] text-slate-400 font-semibold">मिति:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
                  title="पुरानो मिति (Backdate) हेर्न यहाँ मिति छान्नुहोस्"
                />
              </div>

              {/* Active Date Tag */}
              <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                selectedDate === getLocalDateStr()
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {selectedDate === getLocalDateStr() ? '🟢 आजको हाजिरी' : `📅 ${selectedDate} को हाजिरी`}
              </span>

              {/* Bikram Sambat Display Tag */}
              {bsDate && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-200">
                  <span>नेपाली मिति:</span>
                  <span className="font-bold">{bsDate.formattedNp}</span>
                </div>
              )}
            </div>

            {/* Right: Export Buttons (Daily & Monthly) */}
            <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto justify-end">
              {/* Daily Exports */}
              <button
                onClick={exportDailyExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                title="Download Daily Excel Sheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>दैनिक Excel</span>
              </button>

              <button
                onClick={exportDailyPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                title="Download Official Daily PDF"
              >
                <Download className="w-3.5 h-3.5 text-red-600" />
                <span>दैनिक PDF</span>
              </button>

              {/* Monthly Export Trigger */}
              <button
                onClick={() => setShowMonthlyModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors cursor-pointer"
                title="Open Monthly Report Generator"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>मासिक रिपोर्ट (Monthly)</span>
              </button>

              {records.length > 0 && (role === 'admin') && (
                <button
                  onClick={handleClearAllRecords}
                  className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Clear All Logs"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Sub Filter Row: Search & Department Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="कर्मचारीको नाम वा PIN नम्बर खोज्नुहोस्..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            {/* Department Filter */}
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium text-slate-700 cursor-pointer"
              >
                <option value="ALL">सबै विभागहरू (All Departments)</option>
                {uniqueDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium text-slate-700 cursor-pointer"
              >
                <option value="ALL">सबै स्थिति (All Status)</option>
                <option value="IN_OFFICE">🏢 अहिले अफिसमा (Currently In Office)</option>
                <option value="PRESENT">✅ उपस्थित (Present)</option>
                <option value="WEEK_OFF">🌴 साप्ताहिक बिदा (Rotational Week-Off)</option>
                <option value="HOLIDAY_PENDING">⚠️ बिदामा काम (Approval Pending)</option>
                <option value="LATE">⚠️ ढिलो (Late)</option>
                <option value="HALF_DAY">🌓 हाफ डे (Half Day)</option>
                <option value="ABSENT">❌ अनुपस्थित (Absent)</option>
                <option value="ON_LEAVE">🏖️ बिदामा (On Leave)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 5. MAIN ATTENDANCE TABLE WITH RICH COLORED BADGES                */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">कर्मचारी (Staff)</th>
                  <th className="py-3 px-4">बायोमेट्रिक PIN</th>
                  <th className="py-3 px-4">विभाग (Department)</th>
                  <th className="py-3 px-4">इन-टाइम (Check-In)</th>
                  <th className="py-3 px-4">आउट-टाइम (Check-Out)</th>
                  <th className="py-3 px-4">अवधि (Worked)</th>
                  <th className="py-3 px-4">स्थिति (Status)</th>
                  <th className="py-3 px-4 text-right">कार्य (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const currentlyInOffice = Boolean(r.in_time && !r.out_time);
                  const isUnassigned = r.employee_id.startsWith('unassigned-');
                  const matchedStaff = staffList.find(s => String(s.biometric_pin) === String(r.employee_pin) || s.id === r.employee_id);
                  const photoSrc = (matchedStaff?.photo_url && !matchedStaff.photo_url.includes('unsplash'))
                    ? matchedStaff.photo_url
                    : (r.employee_photo && !r.employee_photo.includes('unsplash'))
                    ? r.employee_photo
                    : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Staff Name & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={photoSrc}
                            alt={r.employee_name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              {r.employee_name}
                              {isUnassigned && (
                                <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                  अनरजिस्टर्ड
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 leading-tight">{r.designation}</p>
                          </div>
                        </div>
                      </td>

                      {/* PIN */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          #{r.employee_pin}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {r.department_name}
                      </td>

                      {/* In Time */}
                      <td className="py-3 px-4 font-mono">
                        {r.in_time ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{new Date(r.in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">--:--</span>
                        )}
                      </td>

                      {/* Out Time */}
                      <td className="py-3 px-4 font-mono">
                        {r.out_time ? (
                          <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span>{new Date(r.out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : currentlyInOffice ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 animate-pulse">
                            🏢 In Office
                          </span>
                        ) : (
                          <span className="text-slate-400">--:--</span>
                        )}
                      </td>

                      {/* Worked Hours */}
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {r.worked_hours > 0 ? (
                          <span>{r.worked_hours} hrs</span>
                        ) : r.in_time && !r.out_time ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            ⏳ अधुरो (In Progress)
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Status Colored Badge & Holiday Work Approval Status */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            r.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : r.status === 'WEEK_OFF' || r.status === 'WEEKEND'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                              : r.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : r.status === 'HALF_DAY'
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : r.status === 'ON_LEAVE'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {r.status === 'WEEK_OFF' ? '🌴 WEEK_OFF' : r.status}
                          </span>

                          {/* Approval Status Badge for Holiday / Week-Off Work */}
                          {r.holiday_work_status === 'PENDING_APPROVAL' && (
                            <div className="flex items-center gap-1.5 mt-1 bg-amber-50 p-1 rounded-lg border border-amber-300">
                              <span className="text-[10px] font-bold text-amber-900 animate-pulse">
                                ⚠️ बिदामा काम (स्वीकृति बाँकी)
                              </span>
                              {(role === 'admin' || role === 'hr') && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveHolidayWork(r.id, true)}
                                    className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                    title="Approve Holiday Work"
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveHolidayWork(r.id, false)}
                                    className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                    title="Reject"
                                  >
                                    ✕ Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {r.holiday_work_status === 'APPROVED' && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              ✓ बिदामा काम स्वीकृत
                            </span>
                          )}

                          {r.holiday_work_status === 'REJECTED' && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              ✕ बिदामा काम अस्वीकृत
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick 1-Click Week-Off Button */}
                          {(role === 'admin' || role === 'hr') && r.status !== 'WEEK_OFF' && (
                            <button
                              type="button"
                              onClick={() => handleQuickMarkWeekOff({
                                id: r.employee_id,
                                full_name: r.employee_name || 'Staff',
                                biometric_pin: r.employee_pin,
                                photo_url: r.employee_photo,
                                department_name: r.department_name,
                                designation: r.designation
                              })}
                              className="px-2 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                              title="आजको दिन यो कर्मचारीलाई साप्ताहिक बिदा (Week-Off) मार्क गर्नुहोस्"
                            >
                              <span>🌴</span>
                              <span className="hidden sm:inline">Week-Off</span>
                            </button>
                          )}
                          {isUnassigned && (
                            <button
                              onClick={() => openAssignPinModal(r.employee_pin || '')}
                              className="px-2 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors cursor-pointer"
                              title="Assign PIN to Staff"
                            >
                              जोड्नुहोस्
                            </button>
                          )}
                          {(role === 'admin' || role === 'hr') && (
                            <>
                              <button
                                onClick={() => setEditRecord(r)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="सच्याउनुहोस् (Manual Correction)"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(r.id, r.employee_name || 'Staff')}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-14 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <Clock className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">
                        कुनै हाजिरी रेकर्ड फेला परेन
                      </p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        बायोमेट्रिक मेशिनमा औंठा हान्ने बित्तिकै यहाँ रियल-टाइममा हाजिरी देखिनेछ।
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 6. MODAL: QUICK PIN ASSIGNMENT TO STAFF                           */}
        {/* ================================================================= */}
        {assignPinModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      मेशिन PIN #{assignPinModal} कर्मचारीसँग जोड्नुहोस्
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      मेशिनबाट आएको यो औंठा पञ्च कसको हो छान्नुहोस्
                    </p>
                  </div>
                </div>
                <button onClick={() => setAssignPinModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    कर्मचारी छान्नुहोस् (Select Employee):
                  </label>
                  <select
                    value={assignStaffId}
                    onChange={(e) => setAssignStaffId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                  >
                    <option value="">-- कर्मचारी छान्नुहोस् --</option>
                    {staffList.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.designation}) - हालको PIN: #{emp.biometric_pin || 'छैन'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-blue-800 text-[11px] leading-relaxed">
                  💡 यसो गर्दा अब उप्रान्त यो कर्मचारीले मेशिनमा औंठा हान्ने बित्तिकै उहाँको नाम र फोटो सहित हाजिरी स्वतः देखिनेछ।
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignPinModal(null);
                      setAssignStaffId('');
                    }}
                    disabled={isAssigningPin}
                    className="px-4 py-2 rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignPin}
                    disabled={isAssigningPin}
                    className={`px-4 py-2 rounded-lg font-bold text-white transition-all flex items-center gap-2 cursor-pointer ${
                      !assignStaffId
                        ? 'bg-amber-500/80 hover:bg-amber-600'
                        : 'bg-amber-600 hover:bg-amber-700 active:scale-95 shadow-sm'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isAssigningPin ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>सेभ गर्दैछ...</span>
                      </>
                    ) : (
                      <span>सेभ गरी जोड्नुहोस्</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 6.3. MODAL: WEEK-OFF ROSTER MANAGEMENT (ASSIGN WEEK-OFF TO STAFF) */}
        {/* ================================================================= */}
        {showRosterModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      साप्ताहिक बिदा तालिका (Weekly Off Roster)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      प्रत्येक कर्मचारीको हप्ताको १ दिन बिदा तोक्नुहोस्। बिदाको दिन काम गरेमा सिस्टमले स्वतः अर्को नआएको दिनलाई बिदा मान्नेछ।
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowRosterModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Actions & Search Bar */}
              <div className="py-3 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="कर्मचारी खोज्नुहोस्..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  <span className="text-[11px] font-bold text-slate-500">एकमुष्ठ तोक्नुहोस्:</span>
                  <button
                    type="button"
                    onClick={() => handleBulkSetOffDay('Saturday')}
                    className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 cursor-pointer"
                  >
                    सबै शनिबार
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkSetOffDay('Sunday')}
                    className="px-2 py-1 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 cursor-pointer"
                  >
                    सबै आइतबार
                  </button>
                </div>
              </div>

              {/* Roster Staff List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 my-2 pr-1">
                {rosterStaffList
                  .filter(item => {
                    const q = rosterSearch.toLowerCase().trim();
                    if (!q) return true;
                    return item.name.toLowerCase().includes(q) || item.pin.includes(q) || item.dept.toLowerCase().includes(q);
                  })
                  .map((item, idx) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/70 px-2 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 text-[11px] font-bold text-slate-400">{idx + 1}.</span>
                        <div>
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-[11px] text-slate-500">PIN #{item.pin} • {item.dept}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={item.offDay}
                          onChange={(e) => {
                            const newDay = e.target.value;
                            setRosterStaffList(prev => prev.map(r => r.id === item.id ? { ...r, offDay: newDay } : r));
                          }}
                          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-indigo-900 focus:outline-none focus:border-purple-500 cursor-pointer"
                        >
                          <option value="Saturday">शनिबार (Saturday)</option>
                          <option value="Sunday">आइतबार (Sunday)</option>
                          <option value="Monday">सोमबार (Monday)</option>
                          <option value="Tuesday">मंगलबार (Tuesday)</option>
                          <option value="Wednesday">बुधबार (Wednesday)</option>
                          <option value="Thursday">बिहीबार (Thursday)</option>
                          <option value="Friday">शुक्रबार (Friday)</option>
                        </select>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-500">
                  कुल {rosterStaffList.length} जना कर्मचारी
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRosterModal(false)}
                    disabled={isSavingRoster}
                    className="px-4 py-2 rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs cursor-pointer"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRoster}
                    disabled={isSavingRoster}
                    className="px-4 py-2 rounded-lg font-bold bg-purple-600 hover:bg-purple-700 text-white text-xs shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingRoster ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>सेभ गर्दैछ...</span>
                      </>
                    ) : (
                      <span>रोस्टर सुरक्षित गर्नुहोस् (Save Roster)</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 6.5. MODAL: ASSIGN ROTATIONAL WEEK-OFF TO STAFF                    */}
        {/* ================================================================= */}
        {showWeekOffModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      साप्ताहिक बिदा तोक्नुहोस् (Assign Week-Off)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      रोटेसनल सिफ्ट अनुसार कर्मचारीको साप्ताहिक बिदा मार्क गर्नुहोस्
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowWeekOffModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAssignWeekOffSubmit} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">कर्मचारी छान्नुहोस्</label>
                  <select
                    value={weekOffStaffId}
                    onChange={(e) => setWeekOffStaffId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="">-- कर्मचारी छान्नुहोस् --</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.designation}) - PIN #{s.biometric_pin}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-900 space-y-1">
                  <p className="font-bold">मिति: {selectedDate} {bsDate ? `(${bsDate.formattedNp})` : ''}</p>
                  <p className="text-[11px] text-indigo-700">
                    साप्ताहिक बिदा (Week-Off) मार्क गरेपछि यो दिन तलब नकाटिने गरी (Paid Leave) सुरक्षित हुनेछ। यदि उक्त दिन कर्मचारी आएर औंठा हान्नुभयो भने Admin ले अतिरिक्त ड्युटी (Overtime) स्वीकृति दिन सक्नुहुनेछ।
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWeekOffModal(false)}
                    className="px-4 py-2 rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                  >
                    साप्ताहिक बिदा सुरक्षित गर्नुहोस्
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 7. MODAL: MANUAL PUNCH ENTRY                                      */}
        {/* ================================================================= */}
        {showManualModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      नयाँ म्यानुअल हाजिरी थप्नुहोस्
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      फिल्ड ड्युटी वा छुटेको हाजिरी प्रविष्टि गर्नुहोस्
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddManualPunch} className="space-y-3.5 mt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">कर्मचारी</label>
                  <select
                    value={manualForm.staffId}
                    onChange={(e) => setManualForm({ ...manualForm, staffId: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">-- कर्मचारी छान्नुहोस् --</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.designation}) - PIN #{s.biometric_pin}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">मिति</label>
                    <input
                      type="date"
                      value={manualForm.date}
                      onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">स्थिति</label>
                    <select
                      value={manualForm.status}
                      onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    >
                      <option value="PRESENT">PRESENT (उपस्थित)</option>
                      <option value="WEEK_OFF">WEEK_OFF (साप्ताहिक बिदा)</option>
                      <option value="LATE">LATE (ढिलो)</option>
                      <option value="HALF_DAY">HALF_DAY (हाफ डे)</option>
                      <option value="ON_LEAVE">ON_LEAVE (बिदामा)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">इन-टाइम (Check-In)</label>
                    <input
                      type="time"
                      value={manualForm.inTime}
                      onChange={(e) => setManualForm({ ...manualForm, inTime: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">आउट-टाइम (Check-Out)</label>
                    <input
                      type="time"
                      value={manualForm.outTime}
                      onChange={(e) => setManualForm({ ...manualForm, outTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">कैफियत / कारण (Remarks)</label>
                  <input
                    type="text"
                    placeholder="उदा: सिंहदरबार लाइभ रिपोर्टिङ / बिरामी बिदा"
                    value={manualForm.remarks}
                    onChange={(e) => setManualForm({ ...manualForm, remarks: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-4 py-2 rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg font-bold bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    सुरक्षित गर्नुहोस्
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 8. MODAL: MONTHLY REPORT EXPORT (EXCEL & PDF)                     */}
        {/* ================================================================= */}
        {showMonthlyModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      मासिक हाजिरी रिपोर्ट जेनेरेटर (Monthly Report)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      सम्पूर्ण महिनाको रङ्गीन Excel र औपचारिक PDF डाउनलोड गर्नुहोस्
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowMonthlyModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    महिना छान्नुहोस् (Select Month & Year):
                  </label>
                  <input
                    type="month"
                    value={monthlyYearMonth}
                    onChange={(e) => setMonthlyYearMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-bold text-slate-900"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600 text-[11px] space-y-1">
                  <p className="font-bold text-slate-800">📊 रिपोर्टमा समावेश हुने विवरणहरू:</p>
                  <p>• कुल उपस्थित दिनहरू (Present Days) र हाजिरी दर (%)</p>
                  <p>• ढिलो आएका दिनहरू (Late Days) र कुल ढिलो मिनेट</p>
                  <p>• बिदा तथा अनुपस्थित दिनहरू र कार्य घण्टा (Worked Hours)</p>
                  <p>• HR Manager तथा Managing Director को हस्ताक्षर ढाँचा</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2">
                  <button
                    type="button"
                    onClick={exportMonthlyExcel}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>मासिक Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportMonthlyPdf}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>मासिक PDF (.pdf)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 9. MODAL: EDIT / ADJUST ATTENDANCE ENTRY                          */}
        {/* ================================================================= */}
        {editRecord && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  <span>हाजिरी सच्याउनुहोस् (Manual Adjustment)</span>
                </h3>
                <button onClick={() => setEditRecord(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateRecord} className="space-y-4 mt-4 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">कर्मचारी:</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{editRecord.employee_name} (PIN #{editRecord.employee_pin})</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">स्थिति (Attendance Status)</label>
                  <select
                    value={editRecord.status}
                    onChange={(e) => setEditRecord({ ...editRecord, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="PRESENT">PRESENT (उपस्थित)</option>
                    <option value="WEEK_OFF">WEEK_OFF (साप्ताहिक बिदा)</option>
                    <option value="LATE">LATE (ढिलो)</option>
                    <option value="HALF_DAY">HALF_DAY (हाफ डे)</option>
                    <option value="ABSENT">ABSENT (अनुपस्थित)</option>
                    <option value="ON_LEAVE">ON_LEAVE (बिदामा)</option>
                  </select>
                </div>

                {/* Holiday / Week-Off Work Approval Section */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit_is_holiday_work"
                      checked={Boolean(editRecord.is_holiday_work)}
                      onChange={(e) => setEditRecord({
                        ...editRecord,
                        is_holiday_work: e.target.checked,
                        holiday_work_status: e.target.checked ? (editRecord.holiday_work_status || 'PENDING_APPROVAL') : undefined
                      })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <label htmlFor="edit_is_holiday_work" className="font-bold text-slate-800 text-xs cursor-pointer">
                      बिदाको दिन काम गरेको ड्युटी (Holiday / Week-Off Work)
                    </label>
                  </div>
                  {editRecord.is_holiday_work && (
                    <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-amber-900">स्वीकृति स्थिति (Approval Status):</span>
                      <select
                        value={editRecord.holiday_work_status || 'PENDING_APPROVAL'}
                        onChange={(e) => setEditRecord({
                          ...editRecord,
                          holiday_work_status: e.target.value as any,
                          approved_by: e.target.value === 'APPROVED' ? 'Master Admin' : undefined,
                          approved_at: e.target.value === 'APPROVED' ? new Date().toISOString() : undefined
                        })}
                        className="px-2 py-1 bg-white border border-amber-300 rounded text-xs font-bold text-slate-800"
                      >
                        <option value="PENDING_APPROVAL">⚠️ PENDING_APPROVAL (स्वीकृति बाँकी)</option>
                        <option value="APPROVED">✅ APPROVED (स्वीकृत)</option>
                        <option value="REJECTED">❌ REJECTED (अस्वीकृत)</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">कार्य घण्टा (Worked Hours)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editRecord.worked_hours}
                      onChange={(e) => setEditRecord({ ...editRecord, worked_hours: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ढिलो मिनेट (Late Minutes)</label>
                    <input
                      type="number"
                      value={editRecord.late_minutes}
                      onChange={(e) => setEditRecord({ ...editRecord, late_minutes: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">सच्याउनुको कारण / कैफियत (Remarks)</label>
                  <input
                    type="text"
                    placeholder="उदा: फिल्ड ड्युटी / मेशिन रिडरमा औंठा नटिपेको"
                    value={editRecord.remarks || ''}
                    onChange={(e) => setEditRecord({ ...editRecord, remarks: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRecord(null)}
                    className="px-4 py-2 rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
