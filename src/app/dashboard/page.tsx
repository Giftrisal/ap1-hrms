'use client';

import React, { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { initialEmployees, generateTodayAttendance, initialDepartments } from '@/lib/mock-data';
import { Employee } from '@/lib/types';
import { 
  Users, 
  UserCheck, 
  Clock, 
  UserX, 
  CalendarOff, 
  ArrowUpRight, 
  Fingerprint, 
  TrendingUp, 
  Building2, 
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Send,
  MapPin,
  PackageCheck,
  Smartphone,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { getNepaliDate } from '@/lib/nepali-date';
import * as XLSX from 'xlsx';

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const [attendanceList, setAttendanceList] = useState(generateTodayAttendance());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [livePunches, setLivePunches] = useState<any[]>([]);

  // Load employees from storage with one-time clean purge of all old demo/temporary staff
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window !== 'undefined') {
      const resetDone = localStorage.getItem('goinfi_clean_reset_2026_v2');
      if (!resetDone) {
        localStorage.removeItem('goinfi_staff_list');
        localStorage.removeItem('goinfi_attendance_records');
        localStorage.removeItem('goinfi_portal_user_pin');
        localStorage.setItem('goinfi_clean_reset_2026_v2', 'true');
        return [];
      }
      const saved = localStorage.getItem('goinfi_staff_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Strictly exclude master admin with pin 999 from regular staff list
            const cleaned = parsed.filter((p: any) => String(p.biometric_pin) !== '999' && !p.is_master_admin && p.id !== 'emp-master');
            return cleaned;
          }
        } catch (e) {}
      }
    }
    return [];
  });

  // Sync staff list from backend API
  React.useEffect(() => {
    fetch('/api/staff')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.staff)) {
          const clean = data.staff.filter((p: any) => String(p.biometric_pin) !== '999' && !p.is_master_admin && p.id !== 'emp-master');
          setEmployees(clean);
          if (typeof window !== 'undefined') {
            localStorage.setItem('goinfi_staff_list', JSON.stringify(clean));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Poll /api/biometric/sync for real-time punches from hardware device
  React.useEffect(() => {
    const fetchLivePunches = async () => {
      try {
        const res = await fetch('/api/biometric/sync');
        if (!res.ok) return;
        const data = await res.json();
        if (data.recent_logs && Array.isArray(data.recent_logs) && data.recent_logs.length > 0) {
          setLivePunches(data.recent_logs);
          
          setAttendanceList((prev) => {
            let updated = [...prev];
            for (const log of data.recent_logs) {
              const pin = String(log.user_id || log.biometric_pin || '');
              if (!pin) continue;

              const matchedEmp = employees.find(
                e => String(e.biometric_pin) === pin || String(e.id) === pin || String(e.id) === `emp-${pin}`
              );

              // STRICT VALIDATION: If this PIN does not belong to any active enrolled staff in the directory, or is Master Admin (999), DO NOT register attendance!
              if (!matchedEmp || pin === '999' || matchedEmp.is_master_admin) {
                continue;
              }

              const empName = matchedEmp.full_name;
              const deptName = matchedEmp.department_name || 'AP1 Media / Operations';
              const designation = matchedEmp.designation || 'Staff Member';

              const idx = updated.findIndex((a) => a.employee_pin === pin);
              if (idx !== -1) {
                updated[idx] = {
                  ...updated[idx],
                  employee_name: empName,
                  department_name: deptName,
                  designation: designation,
                  status: log.is_late ? 'LATE' : 'PRESENT',
                  in_time: log.punch_time,
                  late_minutes: log.late_minutes || 0,
                  remarks: 'Live Biometric Machine Punch'
                };
              } else {
                updated.unshift({
                  id: `live-${pin}-${Date.now()}`,
                  employee_id: matchedEmp.id,
                  employee_name: empName,
                  employee_pin: pin,
                  department_name: deptName,
                  designation: designation,
                  date: new Date().toISOString().split('T')[0],
                  in_time: log.punch_time,
                  out_time: undefined,
                  status: log.is_late ? 'LATE' : 'PRESENT',
                  late_minutes: log.late_minutes || 0,
                  early_exit_minutes: 0,
                  overtime_minutes: 0,
                  worked_hours: 8,
                  source: 'biometric',
                  remarks: 'Live Biometric Machine Punch'
                });
              }
            }
            return updated;
          });
        }
      } catch (e) {
        // silent
      }
    };

    fetchLivePunches();
    const interval = setInterval(fetchLivePunches, 3000);
    return () => clearInterval(interval);
  }, [employees]);

  const totalStaff = employees.length;
  // Strictly filter attendance: only records for currently enrolled employees, excluding Master Admin (999)
  const validAttendance = totalStaff === 0 
    ? [] 
    : attendanceList.filter(a => 
        String(a.employee_pin) !== '999' &&
        employees.some(e => String(e.biometric_pin) === String(a.employee_pin) || e.id === a.employee_id)
      );

  const presentCount = totalStaff > 0 
    ? validAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY').length
    : 0;

  const lateCount = totalStaff > 0 
    ? validAttendance.filter(a => a.status === 'LATE').length
    : 0;

  const leaveCount = totalStaff > 0 
    ? validAttendance.filter(a => a.status === 'ON_LEAVE').length
    : 0;

  const absentCount = totalStaff > 0 
    ? Math.max(0, totalStaff - presentCount - leaveCount)
    : 0;

  const attendanceRate = totalStaff > 0 
    ? Math.min(100, Math.round((presentCount / totalStaff) * 100))
    : 0;

  // Filter list for live attendance
  const filteredList = (totalStaff > 0 ? validAttendance : []).filter(att => {
    const matchesSearch = 
      (att.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (att.employee_pin?.includes(searchQuery) ?? false);
    const matchesDept = filterDepartment === 'ALL' || att.department_name === filterDepartment;
    return matchesSearch && matchesDept;
  });

  const exportToExcel = () => {
    const data = attendanceList.map(a => ({
      'Biometric PIN': a.employee_pin,
      'Staff Name': a.employee_name,
      'Department': a.department_name,
      'Designation': a.designation,
      'Date': a.date,
      'In Time': a.in_time ? new Date(a.in_time).toLocaleTimeString() : 'N/A',
      'Out Time': a.out_time ? new Date(a.out_time).toLocaleTimeString() : 'N/A',
      'Status': a.status,
      'Late (Mins)': a.late_minutes,
      'Worked Hours': a.worked_hours
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Attendance');
    XLSX.writeFile(workbook, `Goinfi_Attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {t.statusPresent}
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            {t.statusLate}
          </span>
        );
      case 'HALF_DAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
            {t.statusHalfDay}
          </span>
        );
      case 'ON_LEAVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            {t.statusOnLeave}
          </span>
        );
      case 'ABSENT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            {t.statusAbsent}
          </span>
        );
    }
  };

  return (
    <DashboardShell
      title={t.navDashboard}
      subtitle="Live real-time staff attendance, biometric sync feed, and key metrics"
      onSyncTriggered={() => setAttendanceList(generateTodayAttendance())}
    >
      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Staff */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.totalEmployees}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalStaff}</h3>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">
              {totalStaff > 0 ? 'Across Active Departments' : 'Ready for Registration'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.presentToday}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-bold text-emerald-600">{presentCount}</h3>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                {attendanceRate}%
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">
              {totalStaff > 0 ? 'Punched in via ZKTeco' : 'No staff registered'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Late Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.lateToday}</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{lateCount}</h3>
            <span className="text-[11px] text-amber-600 font-medium mt-0.5 block">
              {lateCount > 0 ? 'After 9:15 AM Grace' : 'On-time attendance'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Absent Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.absentToday}</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">{absentCount}</h3>
            <span className="text-[11px] text-red-500 font-medium mt-0.5 block">
              {absentCount > 0 ? 'Auto-alerted via WA' : 'No absent staff'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <UserX className="w-6 h-6" />
          </div>
        </div>

        {/* On Leave Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.onLeaveToday}</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{leaveCount}</h3>
            <span className="text-[11px] text-blue-500 font-medium mt-0.5 block">Approved Requests</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <CalendarOff className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Portals & Shortcuts Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Quick Portals & Mobile Access
            </span>
          </div>
          <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            Active System
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <Link
            href="/portal"
            className="flex items-center justify-between p-3.5 bg-slate-800 hover:bg-slate-750 rounded-xl transition-all border border-slate-700/80 hover:border-red-500/50 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Staff Mobile App</p>
                <p className="text-[11px] text-slate-400">Employee PIN & Password self-service</p>
              </div>
            </div>
            <span className="text-xs text-red-400 font-semibold group-hover:translate-x-0.5 transition-transform">Open →</span>
          </Link>

          <Link
            href="/field-duty"
            className="flex items-center justify-between p-3.5 bg-slate-800 hover:bg-slate-750 rounded-xl transition-all border border-slate-700/80 hover:border-blue-500/50 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Field Duty & WFH</p>
                <p className="text-[11px] text-slate-400">Client visits & outside punch approvals</p>
              </div>
            </div>
            <span className="text-xs text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">Open →</span>
          </Link>

          <Link
            href="/assets"
            className="flex items-center justify-between p-3.5 bg-slate-800 hover:bg-slate-750 rounded-xl transition-all border border-slate-700/80 hover:border-emerald-500/50 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Asset Inventory</p>
                <p className="text-[11px] text-slate-400">Cameras, SD Cards, Laptops handover</p>
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">Open →</span>
          </Link>
        </div>
      </div>

      {/* Mid Section: Department Breakdown & ZKTeco Hardware Quick Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Overview */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-700" />
              <h4 className="font-bold text-slate-900 text-sm">
                Department Attendance Breakdown
              </h4>
            </div>
            <span className="text-xs text-slate-500 font-medium">Today's Ratio</span>
          </div>

          <div className="space-y-3">
            {initialDepartments.map((dept, i) => {
              const deptEmployees = employees.filter(e => e.department_name === dept.name || e.department_id === dept.id);
              const deptTotal = deptEmployees.length;
              const deptPresent = deptTotal > 0
                ? validAttendance.filter(a => 
                    (a.department_name === dept.name || deptEmployees.some(e => e.biometric_pin === a.employee_pin)) && 
                    (a.status === 'PRESENT' || a.status === 'LATE')
                  ).length
                : 0;
              const pct = deptTotal > 0 ? Math.min(100, Math.round((deptPresent / deptTotal) * 100)) : 0;

              return (
                <div key={dept.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{dept.name}</span>
                    <span className="text-slate-500">{deptPresent}/{deptTotal} present ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 85 ? 'bg-emerald-500' : pct >= 65 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ZKTeco Hardware Info Box */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Fingerprint className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-slate-900 text-sm">
                Machine Integration Status
              </h4>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Direct connection via TCP/IP protocol (Port 4370) to your ZKTeco biometric clocking device.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Machine Model</span>
                <span className="font-semibold text-slate-800">ZKTeco K40 / SilkBio</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Device IP</span>
                <span className="font-mono font-semibold text-slate-800">192.168.1.201:4370</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Sync Interval</span>
                <span className="font-semibold text-slate-800">Every 5 minutes</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Auto WhatsApp 10 AM</span>
                <span className="font-semibold text-emerald-600">Active (Admin Phone)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <a
              href="/settings"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-between"
            >
              <span>Manage Hardware Settings</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Live Hardware Punch Banner */}
      {livePunches.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs text-emerald-950 font-medium">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-emerald-800 uppercase tracking-wide">
              Live Biometric Punch:
            </span>
            <span>
              <strong>{livePunches[0].employee_name || `PIN ${livePunches[0].user_id}`}</strong> (PIN:{' '}
              {livePunches[0].user_id || livePunches[0].biometric_pin}) —{' '}
              {new Date(livePunches[0].punch_time).toLocaleTimeString()} ({livePunches[0].punch_type || 'Check-In'})
            </span>
          </div>
          <span className="text-[11px] font-mono bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md font-bold self-end sm:self-auto border border-emerald-300">
            ZKTeco 192.168.1.201:4370 ⚡ Live
          </span>
        </div>
      )}

      {/* Live Attendance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">{t.liveAttendanceTitle}</h3>
            <p className="text-xs text-slate-500">{t.liveAttendanceSub}</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchStaffPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Department Filter */}
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium text-slate-700"
            >
              <option value="ALL">{t.filterDepartment}</option>
              {initialDepartments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>

            {/* Export Excel */}
            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.exportExcel}</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">{t.colStaff}</th>
                <th className="py-3 px-4">{t.colBiometricPin}</th>
                <th className="py-3 px-4">{t.colDepartment}</th>
                <th className="py-3 px-4">{t.colInTime}</th>
                <th className="py-3 px-4">{t.colOutTime}</th>
                <th className="py-3 px-4">{t.colWorkedHours}</th>
                <th className="py-3 px-4">{t.colLateMin}</th>
                <th className="py-3 px-4">{t.colStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.slice(0, 15).map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Staff Info */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={record.employee_photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                        alt={record.employee_name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <p className="font-semibold text-slate-900 leading-tight">{record.employee_name}</p>
                        <p className="text-[11px] text-slate-500 leading-tight">{record.designation}</p>
                      </div>
                    </div>
                  </td>

                  {/* Machine Pin */}
                  <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                      PIN #{record.employee_pin}
                    </span>
                  </td>

                  {/* Department */}
                  <td className="py-3 px-4 font-medium text-slate-700">
                    {record.department_name}
                  </td>

                  {/* Punch In */}
                  <td className="py-3 px-4 font-mono text-slate-800">
                    {record.in_time ? (
                      <span className="text-emerald-700 font-semibold">
                        {new Date(record.in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-slate-400">--:--</span>
                    )}
                  </td>

                  {/* Punch Out */}
                  <td className="py-3 px-4 font-mono text-slate-800">
                    {record.out_time ? (
                      <span className="text-blue-700 font-semibold">
                        {new Date(record.out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-slate-400">--:--</span>
                    )}
                  </td>

                  {/* Worked Hours */}
                  <td className="py-3 px-4 font-semibold text-slate-700">
                    {record.worked_hours > 0 ? `${record.worked_hours} hrs` : '-'}
                  </td>

                  {/* Late Minutes */}
                  <td className="py-3 px-4 font-medium">
                    {record.late_minutes > 0 ? (
                      <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                        +{record.late_minutes} min
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">On time</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    {getStatusBadge(record.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* View all footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <a
            href="/attendance"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            View all {attendanceList.length} staff attendance records & history →
          </a>
        </div>
      </div>
    </DashboardShell>
  );
}
