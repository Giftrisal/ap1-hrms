'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';
import { initialHolidays, initialEmployees } from '@/lib/mock-data';
import { LeaveRequest, PublicHoliday, Employee } from '@/lib/types';
import { 
  CalendarDays, 
  Plus, 
  Check, 
  X, 
  Clock, 
  Calendar, 
  Sparkles, 
  AlertCircle,
  FileText,
  Trash2,
  UserCheck,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function LeavesPage() {
  const { t, language } = useLanguage();
  const { role, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'requests' | 'holidays'>('requests');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isAddHolidayModalOpen, setIsAddHolidayModalOpen] = useState(false);

  // Dynamic full staff list
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window !== 'undefined') {
      const resetDone = localStorage.getItem('goinfi_clean_reset_2026_v2');
      if (!resetDone) return [];
      const saved = localStorage.getItem('goinfi_staff_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((p: any) => String(p.biometric_pin) !== '999' && !p.is_master_admin && p.id !== 'emp-master');
          }
        } catch (e) {}
      }
    }
    return [];
  });

  // Leave Requests state (Clean & Persisted)
  const [requests, setRequests] = useState<LeaveRequest[]>(() => {
    if (typeof window !== 'undefined') {
      const isCleared = localStorage.getItem('goinfi_leaves_cleared_v2');
      if (!isCleared) {
        localStorage.removeItem('goinfi_leave_requests');
        localStorage.setItem('goinfi_leaves_cleared_v2', 'true');
        return [];
      }
      const saved = localStorage.getItem('goinfi_leave_requests');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    }
    return [];
  });

  const saveRequests = (newList: LeaveRequest[]) => {
    setRequests(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_leave_requests', JSON.stringify(newList));
    }
  };

  // Holidays state (Clean & Persisted)
  const [holidays, setHolidays] = useState<PublicHoliday[]>(() => {
    if (typeof window !== 'undefined') {
      const isCleared = localStorage.getItem('goinfi_holidays_cleared_v2');
      if (!isCleared) {
        localStorage.removeItem('goinfi_holidays_list');
        localStorage.setItem('goinfi_holidays_cleared_v2', 'true');
        return [];
      }
      const saved = localStorage.getItem('goinfi_holidays_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    }
    return [];
  });

  const saveHolidays = (newList: PublicHoliday[]) => {
    setHolidays(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_holidays_list', JSON.stringify(newList));
    }
  };

  // New Leave Form
  const [newLeave, setNewLeave] = useState({
    employee_id: '',
    leave_type_name: 'Casual Leave',
    start_date: '',
    end_date: '',
    reason: ''
  });

  // New Holiday Form
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    name_np: '',
    holiday_date: '',
    nepali_date: ''
  });

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeave.start_date || !newLeave.end_date || !newLeave.reason) {
      alert('Please fill in all required fields');
      return;
    }

    const selectedEmp = employees.find(emp => emp.id === newLeave.employee_id) || employees[0];
    const empName = selectedEmp ? selectedEmp.full_name : (currentUser?.full_name || 'Staff Member');
    const empId = selectedEmp ? selectedEmp.id : (currentUser?.id || `emp-${Date.now()}`);

    // calculate total days
    const start = new Date(newLeave.start_date);
    const end = new Date(newLeave.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const item: LeaveRequest = {
      id: `lr-${Date.now()}`,
      employee_id: empId,
      employee_name: empName,
      leave_type_id: 'lt-user',
      leave_type_name: newLeave.leave_type_name,
      start_date: newLeave.start_date,
      end_date: newLeave.end_date,
      total_days: isNaN(diffDays) ? 1 : diffDays,
      reason: newLeave.reason,
      status: 'pending',
      applied_at: new Date().toISOString().split('T')[0]
    };

    saveRequests([item, ...requests]);
    setIsApplyModalOpen(false);
    setNewLeave({
      employee_id: '',
      leave_type_name: 'Casual Leave',
      start_date: '',
      end_date: '',
      reason: ''
    });
    alert('Leave application submitted successfully!');
  };

  const handleApprove = (id: string) => {
    saveRequests(requests.map(r => r.id === id ? { ...r, status: 'approved', approved_by: currentUser?.full_name || 'HR Admin' } : r));
  };

  const handleReject = (id: string) => {
    saveRequests(requests.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
  };

  const handleDeleteRequest = (id: string) => {
    if (confirm('Are you sure you want to remove this leave application?')) {
      saveRequests(requests.filter(r => r.id !== id));
    }
  };

  const handleCreateHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.holiday_date) {
      alert('Please provide holiday name and date');
      return;
    }

    const item: PublicHoliday = {
      id: `hol-${Date.now()}`,
      name: newHoliday.name,
      name_np: newHoliday.name_np || newHoliday.name,
      holiday_date: newHoliday.holiday_date,
      nepali_date: newHoliday.nepali_date || newHoliday.holiday_date,
      is_gazetted: true
    };

    saveHolidays([item, ...holidays]);
    setIsAddHolidayModalOpen(false);
    setNewHoliday({
      name: '',
      name_np: '',
      holiday_date: '',
      nepali_date: ''
    });
  };

  const handleDeleteHoliday = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from holidays?`)) {
      saveHolidays(holidays.filter(h => h.id !== id));
    }
  };

  return (
    <DashboardShell
      title={t.navLeaves}
      subtitle="Staff leave requests, approval workflow, remaining balances, and official Nepal calendar"
    >
      {/* Leave Balance Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Casual Leave</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-slate-900">12</h3>
            <span className="text-xs text-slate-400">/ 12 days left</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sick Leave</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-slate-900">12</h3>
            <span className="text-xs text-slate-400">/ 12 days left</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Annual / Festival</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-slate-900">14</h3>
            <span className="text-xs text-slate-400">/ 14 days left</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unpaid (LWP)</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-slate-900">0</h3>
            <span className="text-xs text-slate-400">Deducted from salary</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: '0%' }}></div>
          </div>
        </div>
      </div>

      {/* Tabs & Action Buttons */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'requests' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.leaveHistory} ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'holidays' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.nepalHolidays} ({holidays.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'holidays' ? (
            <button
              onClick={() => setIsAddHolidayModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Holiday</span>
            </button>
          ) : (
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.applyLeave}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Leave Requests Table */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">{t.colStaff}</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">{t.colStatus}</th>
                  <th className="py-3 px-4 text-right">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-semibold text-slate-900 block">{req.employee_name}</span>
                        <span className="text-[11px] text-slate-500">{req.department_name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {req.leave_type_name}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {req.start_date} to {req.end_date}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {req.days_count || req.total_days} Days
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={req.reason}>
                      {req.reason}
                    </td>

                    <td className="py-3 px-4">
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                      {req.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="p-1 rounded hover:bg-emerald-50 text-emerald-600 transition-colors cursor-pointer"
                              title="Approve Leave"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="p-1 rounded hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                              title="Reject Leave"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete Request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {requests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-slate-500">
                      <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-base font-bold text-slate-800">No Leave Requests</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        No leave applications registered yet. Click "+ Apply Leave" to request time off.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Nepal Public Holidays Calendar */}
      {activeTab === 'holidays' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {holidays.map((holiday) => (
            <div 
              key={holiday.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors relative group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Public Holiday
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500 font-semibold">{holiday.holiday_date}</span>
                  <button
                    onClick={() => handleDeleteHoliday(holiday.id, holiday.name)}
                    className="text-slate-300 hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete Holiday"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h4 className="font-bold text-slate-900 text-base">{holiday.name}</h4>
              <p className="text-xs font-semibold text-blue-600 mt-0.5">{holiday.name_np}</p>
              {holiday.nepali_date && (
                <p className="text-xs text-slate-500 font-mono mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                  Bikram Sambat: {holiday.nepali_date}
                </p>
              )}
            </div>
          ))}

          {holidays.length === 0 && (
            <div className="col-span-full bg-white p-16 rounded-2xl border border-slate-200 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-800">No Holidays Listed</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No public holidays registered yet. Click "+ Add Holiday" to add official calendar holidays.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <span>{t.applyLeave}</span>
              </h3>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Employee *</label>
                <select
                  value={newLeave.employee_id}
                  onChange={(e) => setNewLeave({ ...newLeave, employee_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                >
                  <option value="">-- Select Employee ({employees.length} Staff Available) --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.biometric_pin ? `(PIN #${emp.biometric_pin})` : ''} - {emp.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type</label>
                <select
                  value={newLeave.leave_type_name}
                  onChange={(e) => setNewLeave({ ...newLeave, leave_type_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                >
                  <option value="Casual Leave">Casual Leave (Paid)</option>
                  <option value="Sick Leave">Sick Leave (Paid)</option>
                  <option value="Annual / Festival Leave">Annual / Festival Leave (Paid)</option>
                  <option value="Unpaid Leave (LWP)">Unpaid Leave (LWP - Salary Deducted)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newLeave.start_date}
                    onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newLeave.end_date}
                    onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Leave</label>
                <textarea
                  required
                  rows={3}
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  placeholder="State reason for leave..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {isAddHolidayModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Add Official Holiday</span>
              </h3>
              <button onClick={() => setIsAddHolidayModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHoliday} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Holiday Name (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dashain Festival / Constitution Day"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Holiday Local / Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. Vijaya Dashami / National Day"
                  value={newHoliday.name_np}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name_np: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date (AD) *</label>
                  <input
                    type="date"
                    required
                    value={newHoliday.holiday_date}
                    onChange={(e) => setNewHoliday({ ...newHoliday, holiday_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nepali Date (BS)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2083 Ashwin 03"
                    value={newHoliday.nepali_date}
                    onChange={(e) => setNewHoliday({ ...newHoliday, nepali_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddHolidayModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
