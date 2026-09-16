'use client';

import React, { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';
import { initialHolidays, initialEmployees } from '@/lib/mock-data';
import { LeaveRequest } from '@/lib/types';
import { 
  CalendarDays, 
  Plus, 
  Check, 
  X, 
  Clock, 
  Calendar, 
  Sparkles, 
  AlertCircle,
  FileText
} from 'lucide-react';

export default function LeavesPage() {
  const { t, language } = useLanguage();
  const { role, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'requests' | 'holidays'>('requests');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const [requests, setRequests] = useState<LeaveRequest[]>([
    {
      id: 'lr-1',
      employee_id: 'emp-105',
      employee_name: 'Rohan Karki',
      leave_type_id: 'lt-casual',
      leave_type_name: 'Casual Leave',
      start_date: '2026-09-20',
      end_date: '2026-09-21',
      total_days: 2,
      reason: 'Attending family wedding ceremony in Pokhara',
      status: 'pending',
      applied_at: '2026-09-15'
    },
    {
      id: 'lr-2',
      employee_id: 'emp-108',
      employee_name: 'Sneha Adhikari',
      leave_type_id: 'lt-sick',
      leave_type_name: 'Sick Leave',
      start_date: '2026-09-16',
      end_date: '2026-09-16',
      total_days: 1,
      reason: 'Viral flu and doctor checkup',
      status: 'approved',
      approved_by: 'Pooja Thapa',
      applied_at: '2026-09-16'
    },
    {
      id: 'lr-3',
      employee_id: 'emp-114',
      employee_name: 'Ritu Bhattarai',
      leave_type_id: 'lt-casual',
      leave_type_name: 'Casual Leave',
      start_date: '2026-09-10',
      end_date: '2026-09-11',
      total_days: 2,
      reason: 'Personal errands',
      status: 'approved',
      approved_by: 'Pooja Thapa',
      applied_at: '2026-09-08'
    }
  ]);

  const [newLeave, setNewLeave] = useState({
    leave_type_name: 'Casual Leave',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeave.start_date || !newLeave.end_date || !newLeave.reason) {
      alert('Please fill in all fields');
      return;
    }

    const item: LeaveRequest = {
      id: `lr-${Date.now()}`,
      employee_id: currentUser?.id || 'emp-101',
      employee_name: currentUser?.full_name || 'Staff Member',
      leave_type_id: 'lt-user',
      leave_type_name: newLeave.leave_type_name,
      start_date: newLeave.start_date,
      end_date: newLeave.end_date,
      total_days: 1,
      reason: newLeave.reason,
      status: 'pending',
      applied_at: new Date().toISOString().split('T')[0]
    };

    setRequests([item, ...requests]);
    setIsApplyModalOpen(false);
    alert('Leave application submitted to HR for approval!');
  };

  const handleApprove = (id: string) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: 'approved', approved_by: currentUser?.full_name } : r));
  };

  const handleReject = (id: string) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
  };

  return (
    <DashboardShell
      title={t.navLeaves}
      subtitle={language === 'en' 
        ? "Staff leave requests, approval workflow, remaining balances, and official Nepal calendar" 
        : "कर्मचारी बिदा आवेदन, स्वीकृति प्रक्रिया, बाँकी बिदा तथा नेपाल सरकारका सार्वजनिक बिदाहरू"}
    >
      {/* Leave Balance Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Casual Leave</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-slate-900">9</h3>
            <span className="text-xs text-slate-400">/ 12 days left</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sick Leave</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-slate-900">11</h3>
            <span className="text-xs text-slate-400">/ 12 days left</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '91%' }}></div>
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

      {/* Tabs & Apply Button */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'requests' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.leaveHistory} ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'holidays' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.nepalHolidays} ({initialHolidays.length})
          </button>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.applyLeave}</span>
        </button>
      </div>

      {/* Tab 1: Leave Requests Table */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">{t.colStaff}</th>
                  <th className="py-3 px-4">{t.colLeaveType}</th>
                  <th className="py-3 px-4">{t.colDates}</th>
                  <th className="py-3 px-4">{t.colTotalDays}</th>
                  <th className="py-3 px-4">{t.colReason}</th>
                  <th className="py-3 px-4">{t.colStatus}</th>
                  <th className="py-3 px-4 text-right">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {req.employee_name}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {req.leave_type_name}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700">
                      {req.start_date} to {req.end_date}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {req.total_days} Day(s)
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {req.reason}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : req.status === 'rejected'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {req.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {req.status === 'pending' && (role === 'admin' || role === 'hr') ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="p-1 text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200"
                            title="Approve Leave"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="p-1 text-red-700 hover:bg-red-50 rounded border border-red-200"
                            title="Reject Leave"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {req.approved_by ? `By ${req.approved_by}` : 'Closed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Nepal Public Holidays Calendar */}
      {activeTab === 'holidays' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialHolidays.map((holiday) => (
            <div 
              key={holiday.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Gazetted Holiday
                </span>
                <span className="font-mono text-xs text-slate-500 font-semibold">{holiday.holiday_date}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-base">{holiday.name}</h4>
              <p className="text-xs font-semibold text-blue-600 mt-0.5">{holiday.name_np}</p>
              <p className="text-xs text-slate-500 font-mono mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                Bikram Sambat: {holiday.nepali_date}
              </p>
            </div>
          ))}
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
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type</label>
                <select
                  value={newLeave.leave_type_name}
                  onChange={(e) => setNewLeave({ ...newLeave, leave_type_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="Casual Leave">Casual Leave (Paid)</option>
                  <option value="Sick Leave">Sick Leave (Paid)</option>
                  <option value="Annual / Festival Leave">Annual / Festival Leave (Paid)</option>
                  <option value="Unpaid Leave (LWP)">Unpaid Leave (Salary Deducted)</option>
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newLeave.end_date}
                    onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
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
                  placeholder="Explain why you are requesting leave..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
