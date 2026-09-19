'use client';

import React, { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { initialEmployees, generateTodayAttendance, initialDepartments } from '@/lib/mock-data';
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
  Cake,
  Gift,
  PartyPopper,
  Sparkles,
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
  const [greetingModal, setGreetingModal] = useState<{
    isOpen: boolean;
    name: string;
    type: 'birthday' | 'anniversary';
    detail: string;
    phone?: string;
  }>({
    isOpen: false,
    name: '',
    type: 'birthday',
    detail: ''
  });
  const [greetingSuccess, setGreetingSuccess] = useState(false);

  // Key metrics
  const totalStaff = initialEmployees.length;
  const presentCount = attendanceList.filter(a => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY').length;
  const lateCount = attendanceList.filter(a => a.status === 'LATE').length;
  const absentCount = attendanceList.filter(a => a.status === 'ABSENT').length;
  const leaveCount = attendanceList.filter(a => a.status === 'ON_LEAVE').length;
  const attendanceRate = Math.round((presentCount / totalStaff) * 100);

  // Filter list for live attendance
  const filteredList = attendanceList.filter(att => {
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
      subtitle={language === 'en' 
        ? "Live real-time staff attendance, biometric sync feed, and key metrics" 
        : "प्रत्यक्ष कर्मचारी हाजिरी, बायोमेट्रिक सिङ्क तथा मुख्य तथ्याङ्कहरू"}
      onSyncTriggered={() => setAttendanceList(generateTodayAttendance())}
    >
      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Staff */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.totalEmployees}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalStaff}</h3>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">Across 7 Departments</span>
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
            <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">Punched in via ZKTeco</span>
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
            <span className="text-[11px] text-amber-600 font-medium mt-0.5 block">After 9:15 AM Grace</span>
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
            <span className="text-[11px] text-red-500 font-medium mt-0.5 block">Auto-alerted via WA</span>
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

      {/* Celebrations, Milestones & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Birthday & Anniversary Celebrations Widget */}
        <div className="lg:col-span-2 bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-purple-500/10 border border-amber-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <PartyPopper className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                  <span>🎉 Celebrations & Milestones (आजका जन्मोत्सव तथा वार्षिकोत्सव)</span>
                </h4>
                <p className="text-xs text-slate-600">
                  Daily staff recognition, work anniversaries, and automated team wishes
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 bg-amber-100/80 text-amber-800 text-[11px] font-bold rounded-full border border-amber-300">
              {getNepaliDate().formattedNp}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Today's Birthday */}
            <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
                    alt="Samikshya Gautam"
                    className="w-11 h-11 rounded-full object-cover border-2 border-amber-400"
                  />
                  <span className="absolute -bottom-1 -right-1 text-sm">🎂</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Samikshya Gautam</p>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-pink-100 text-pink-700">Today</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Sr. Full Stack Engineer</p>
                  <p className="text-[11px] text-amber-700 font-semibold mt-0.5">Birthday Today! 🎂</p>
                </div>
              </div>
              <button
                onClick={() => setGreetingModal({
                  isOpen: true,
                  name: 'Samikshya Gautam',
                  type: 'birthday',
                  detail: 'Wishing you a very Happy Birthday from all of us at Goinfi! May this year bring tremendous joy and success!',
                  phone: '+977-9841100104'
                })}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5" /> Wish
              </button>
            </div>

            {/* Today's Work Anniversary */}
            <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-purple-200 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
                    alt="Pooja Thapa"
                    className="w-11 h-11 rounded-full object-cover border-2 border-purple-400"
                  />
                  <span className="absolute -bottom-1 -right-1 text-sm">🎖️</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Pooja Thapa</p>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700">3rd Year</span>
                  </div>
                  <p className="text-[11px] text-slate-500">HR Manager</p>
                  <p className="text-[11px] text-purple-700 font-semibold mt-0.5">3 Years at Goinfi! 🌟</p>
                </div>
              </div>
              <button
                onClick={() => setGreetingModal({
                  isOpen: true,
                  name: 'Pooja Thapa',
                  type: 'anniversary',
                  detail: 'Congratulations on completing 3 wonderful years at Goinfi! Thank you for your leadership and dedication!',
                  phone: '+977-9841100102'
                })}
                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Greet
              </button>
            </div>
          </div>
        </div>

        {/* Quick Feature Shortcuts Card */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Portals & Tools</span>
            <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
              Active
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs">
            <Link
              href="/field-duty"
              className="flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-700/80 rounded-xl transition-colors border border-slate-700/60"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">Field Duty & WFH</p>
                  <p className="text-[10px] text-slate-400">Client visits & remote approvals</p>
                </div>
              </div>
              <span className="text-[11px] text-blue-400 font-semibold">Open →</span>
            </Link>

            <Link
              href="/assets"
              className="flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-700/80 rounded-xl transition-colors border border-slate-700/60"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">Asset Inventory</p>
                  <p className="text-[10px] text-slate-400">Laptops, SIMs, Vehicles handover</p>
                </div>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold">Open →</span>
            </Link>

            <Link
              href="/portal"
              className="flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-700/80 rounded-xl transition-colors border border-slate-700/60"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">Staff Self-Service</p>
                  <p className="text-[10px] text-slate-400">Employee punch & payslip portal</p>
                </div>
              </div>
              <span className="text-[11px] text-purple-400 font-semibold">Open →</span>
            </Link>
          </div>
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
                {language === 'en' ? 'Department Attendance Breakdown' : 'विभाग अनुसार हाजिरी अवस्था'}
              </h4>
            </div>
            <span className="text-xs text-slate-500 font-medium">Today's Ratio</span>
          </div>

          <div className="space-y-3">
            {initialDepartments.map((dept, i) => {
              const deptStaff = attendanceList.filter(a => a.department_name === dept.name);
              const deptPresent = deptStaff.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
              const deptTotal = deptStaff.length || 1;
              const pct = Math.round((deptPresent / deptTotal) * 100);

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
                {language === 'en' ? 'Machine Integration Status' : 'बायोमेट्रिक मेसिन अवस्था'}
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
              <span>{language === 'en' ? 'Manage Hardware Settings' : 'उपकरण सेटिङ्स मिलाउनुहोस्'}</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

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
            {language === 'en' 
              ? `View all ${attendanceList.length} staff attendance records & history →` 
              : `सबै ${attendanceList.length} जना कर्मचारीको हाजिरी इतिहास हेर्नुहोस् →`}
          </a>
        </div>
      </div>

      {/* Greeting Modal */}
      {greetingModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                  greetingModal.type === 'birthday' ? 'bg-amber-500' : 'bg-purple-600'
                }`}>
                  {greetingModal.type === 'birthday' ? <Cake className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {greetingModal.type === 'birthday' ? '🎂 Birthday Wishes' : '🎖️ Work Anniversary Greeting'}
                  </h3>
                  <p className="text-xs text-slate-500">{greetingModal.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setGreetingModal({ ...greetingModal, isOpen: false });
                  setGreetingSuccess(false);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {greetingSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                <h4 className="font-bold text-slate-900 text-base">Wishes Sent Successfully!</h4>
                <p className="text-xs text-slate-600">
                  {greetingModal.name} लाई शुभकामना सन्देश पठाइयो! 🎉
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Greeting Message (शुभकामना सन्देश)
                  </label>
                  <textarea
                    rows={4}
                    defaultValue={greetingModal.detail}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-bold">✨ Delivery Channels:</p>
                  <p>• Official Company Slack / Email Broadcast to all 32+ staff</p>
                  <p>• Personal WhatsApp greeting to {greetingModal.phone}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (greetingModal.phone) {
                        const msg = encodeURIComponent(`🎉 Dear ${greetingModal.name}, ${greetingModal.detail} Warm wishes from Goinfi Team!`);
                        window.open(`https://wa.me/${greetingModal.phone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
                      }
                      setGreetingSuccess(true);
                      setTimeout(() => {
                        setGreetingSuccess(false);
                        setGreetingModal({ ...greetingModal, isOpen: false });
                      }, 2000);
                    }}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Send via WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      setGreetingSuccess(true);
                      setTimeout(() => {
                        setGreetingSuccess(false);
                        setGreetingModal({ ...greetingModal, isOpen: false });
                      }, 2000);
                    }}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Broadcast Email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
