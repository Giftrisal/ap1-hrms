'use client';

import React, { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';
import { generateTodayAttendance, initialDepartments } from '@/lib/mock-data';
import { DailyAttendance } from '@/lib/types';
import { 
  Clock, 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  PlusCircle,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AttendancePage() {
  const { t, language } = useLanguage();
  const { role } = useAuth();
  const [records, setRecords] = useState<DailyAttendance[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_attendance_records');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return [];
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [editRecord, setEditRecord] = useState<DailyAttendance | null>(null);

  const saveRecordsList = (newList: DailyAttendance[]) => {
    setRecords(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_attendance_records', JSON.stringify(newList));
    }
  };

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

  // Poll /api/biometric/sync for live hardware punches from ZKTeco
  React.useEffect(() => {
    const syncBiometricPunches = async () => {
      try {
        const res = await fetch('/api/biometric/sync');
        if (!res.ok) return;
        const data = await res.json();
        if (data.recent_logs && Array.isArray(data.recent_logs) && data.recent_logs.length > 0) {
          // Load staff list for enrichment if available
          let staffList: any[] = [];
          if (typeof window !== 'undefined') {
            try {
              const savedStaff = localStorage.getItem('goinfi_staff_list');
              if (savedStaff) staffList = JSON.parse(savedStaff);
            } catch (e) {}
          }

          setRecords((prev) => {
            let updated = [...prev];
            let hasChanges = false;

            for (const log of data.recent_logs) {
              const pin = String(log.user_id || log.biometric_pin || '');
              if (!pin) continue;

              const matchedEmp = staffList.find(
                (s: any) => String(s.biometric_pin) === pin || String(s.id) === pin || String(s.id) === `emp-${pin}`
              );

              const empName = matchedEmp?.full_name || log.employee_name || `Staff ${pin}`;
              const deptName = matchedEmp?.department_name || 'AP1 Media / Operations';
              const designation = matchedEmp?.designation || 'Staff Member';
              const photo = matchedEmp?.photo_url;
              const punchDate = (log.punch_time || new Date().toISOString()).split('T')[0];

              const existingIdx = updated.findIndex(
                (r) => String(r.employee_pin) === pin && r.date === punchDate
              );

              if (existingIdx !== -1) {
                const existing = updated[existingIdx];
                const punchTime = log.punch_time;
                let newOut = existing.out_time;
                let newIn = existing.in_time;

                if (log.punch_type === 'Check-Out' || (newIn && punchTime > newIn)) {
                  newOut = punchTime;
                }
                if (!newIn || punchTime < newIn) {
                  newIn = punchTime;
                }

                // Calculate worked hours if in and out exist
                let workedHours = existing.worked_hours || 8;
                if (newIn && newOut && newIn !== newOut) {
                  const diffMs = new Date(newOut).getTime() - new Date(newIn).getTime();
                  if (diffMs > 0) {
                    workedHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
                  }
                }

                if (existing.in_time !== newIn || existing.out_time !== newOut || existing.employee_name !== empName) {
                  updated[existingIdx] = {
                    ...existing,
                    employee_name: empName,
                    department_name: deptName,
                    designation: designation,
                    employee_photo: photo || existing.employee_photo,
                    in_time: newIn,
                    out_time: newOut,
                    status: log.is_late ? 'LATE' : existing.status || 'PRESENT',
                    late_minutes: log.late_minutes || existing.late_minutes || 0,
                    worked_hours: workedHours,
                    remarks: 'ZKTeco Live Machine Punch'
                  };
                  hasChanges = true;
                }
              } else {
                // Insert new daily record from live biometric machine
                const newRec: DailyAttendance = {
                  id: `zk-${pin}-${punchDate}-${Date.now()}`,
                  employee_id: matchedEmp?.id || `emp-${pin}`,
                  employee_name: empName,
                  employee_pin: pin,
                  department_name: deptName,
                  designation: designation,
                  employee_photo: photo,
                  date: punchDate,
                  in_time: log.punch_time,
                  out_time: log.punch_type === 'Check-Out' ? log.punch_time : undefined,
                  status: log.is_late ? 'LATE' : 'PRESENT',
                  late_minutes: log.late_minutes || 0,
                  early_exit_minutes: 0,
                  overtime_minutes: 0,
                  worked_hours: 8,
                  source: 'biometric',
                  remarks: 'ZKTeco Live Machine Punch'
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
        }
      } catch (err) {
        // silent
      }
    };

    syncBiometricPunches();
    const interval = setInterval(syncBiometricPunches, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      (r.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (r.employee_pin?.includes(searchQuery) ?? false);
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;
    const updated = records.map(r => r.id === editRecord.id ? editRecord : r);
    saveRecordsList(updated);
    setEditRecord(null);
    alert('Attendance entry successfully updated!');
  };

  const exportExcel = () => {
    const data = filteredRecords.map(r => ({
      'PIN': r.employee_pin,
      'Name': r.employee_name,
      'Department': r.department_name,
      'Date': r.date,
      'Punch In': r.in_time ? new Date(r.in_time).toLocaleTimeString() : 'N/A',
      'Punch Out': r.out_time ? new Date(r.out_time).toLocaleTimeString() : 'N/A',
      'Status': r.status,
      'Late (Mins)': r.late_minutes,
      'Hours Worked': r.worked_hours,
      'Remarks': r.remarks || '-'
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, `Goinfi_Attendance_Report_${selectedDate}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.text(`GOINFI-HR: DAILY ATTENDANCE REPORT (${selectedDate})`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated by: ${role.toUpperCase()} on ${new Date().toLocaleString()}`, 14, 21);

    const body = filteredRecords.map(r => [
      r.employee_pin || '-',
      r.employee_name || '-',
      r.department_name || '-',
      r.in_time ? new Date(r.in_time).toLocaleTimeString() : 'N/A',
      r.out_time ? new Date(r.out_time).toLocaleTimeString() : 'N/A',
      r.status,
      r.late_minutes > 0 ? `+${r.late_minutes}m` : '0m',
      `${r.worked_hours} hrs`
    ]);

    autoTable(doc, {
      startY: 26,
      head: [['PIN', 'Staff Name', 'Department', 'In Time', 'Out Time', 'Status', 'Late', 'Hours']],
      body,
      styles: { fontSize: 8 }
    });

    doc.save(`Goinfi_Attendance_${selectedDate}.pdf`);
  };

  return (
    <DashboardShell
      title={t.navAttendance}
      subtitle="Daily punch logs, shift analysis, and manual adjustments"
    >
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center flex-wrap gap-3 w-full md:w-auto flex-1">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-none"
            />
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchStaffPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium text-slate-700"
          >
            <option value="ALL">{t.filterStatus}</option>
            <option value="PRESENT">{t.statusPresent}</option>
            <option value="LATE">{t.statusLate}</option>
            <option value="HALF_DAY">{t.statusHalfDay}</option>
            <option value="ABSENT">{t.statusAbsent}</option>
            <option value="ON_LEAVE">{t.statusOnLeave}</option>
          </select>
        </div>

        {/* Export Buttons & Clear All */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.exportExcel}</span>
          </button>
          <button
            onClick={exportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-red-600" />
            <span>{t.exportPdf}</span>
          </button>
          {records.length > 0 && (
            <button
              onClick={handleClearAllRecords}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
              title="Delete all attendance logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
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
                <th className="py-3 px-4 text-right">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={r.employee_photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                        alt={r.employee_name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <p className="font-semibold text-slate-900 leading-tight">{r.employee_name}</p>
                        <p className="text-[11px] text-slate-500 leading-tight">{r.designation}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                    PIN #{r.employee_pin}
                  </td>

                  <td className="py-3 px-4 font-medium text-slate-700">
                    {r.department_name}
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-800">
                    {r.in_time ? (
                      <span className="text-emerald-700 font-semibold">
                        {new Date(r.in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-slate-400">--:--</span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-800">
                    {r.out_time ? (
                      <span className="text-blue-700 font-semibold">
                        {new Date(r.out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-slate-400">--:--</span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-700">
                    {r.worked_hours > 0 ? `${r.worked_hours} hrs` : '-'}
                  </td>

                  <td className="py-3 px-4 font-medium">
                    {r.late_minutes > 0 ? (
                      <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        +{r.late_minutes} min
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">0m</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      r.status === 'PRESENT'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : r.status === 'LATE'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : r.status === 'HALF_DAY'
                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                        : r.status === 'ON_LEAVE'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {r.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    {(role === 'admin' || role === 'hr') && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditRecord(r)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="Manual Correction"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(r.id, r.employee_name || 'Staff')}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete Attendance Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-800 text-sm">
                      No Attendance Records Found
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Real-time punches will appear here automatically when employees punch on the ZKTeco biometric machine.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Attendance Adjustment Modal */}
      {editRecord && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>{t.manualCorrection}</span>
              </h3>
              <button onClick={() => setEditRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="space-y-4 mt-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Employee:</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{editRecord.employee_name} (PIN #{editRecord.employee_pin})</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attendance Status</label>
                <select
                  value={editRecord.status}
                  onChange={(e) => setEditRecord({ ...editRecord, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE">LATE</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hours Worked</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editRecord.worked_hours}
                    onChange={(e) => setEditRecord({ ...editRecord, worked_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Late (Minutes)</label>
                  <input
                    type="number"
                    value={editRecord.late_minutes}
                    onChange={(e) => setEditRecord({ ...editRecord, late_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Remarks for Adjustment</label>
                <input
                  type="text"
                  placeholder="e.g. Field assignment / Fingerprint reader misread"
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
    </DashboardShell>
  );
}
