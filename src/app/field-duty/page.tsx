'use client';

import React, { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { initialFieldDutyRequests, initialEmployees } from '@/lib/mock-data';
import { FieldDutyRequest, FieldDutyType } from '@/lib/types';
import { useLanguage } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';
import { getNepaliDate } from '@/lib/nepali-date';
import { 
  MapPin, 
  Home, 
  Briefcase, 
  Plane, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  Calendar,
  Building,
  Building2,
  UserCheck
} from 'lucide-react';

export default function FieldDutyPage() {
  const { t } = useLanguage();
  const { role, currentUser } = useAuth();
  const [requests, setRequests] = useState<FieldDutyRequest[]>(initialFieldDutyRequests);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Request Form State
  const [formData, setFormData] = useState({
    employee_id: currentUser?.id || 'emp-104',
    type: 'FIELD_VISIT' as FieldDutyType,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    location: '',
    purpose: ''
  });

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = initialEmployees.find(x => x.id === formData.employee_id) || initialEmployees[0];
    const newReq: FieldDutyRequest = {
      id: `fdr-${Date.now()}`,
      employee_id: emp.id,
      employee_name: emp.full_name,
      employee_photo: emp.photo_url,
      department_name: emp.department_name,
      type: formData.type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      location: formData.location,
      purpose: formData.purpose,
      status: 'pending', // Always pending until Administrator explicitly approves
      applied_at: new Date().toISOString(),
      remarks: 'Submitted for Administrator Approval'
    };

    setRequests([newReq, ...requests]);
    setIsModalOpen(false);
    setFormData({
      employee_id: currentUser?.id || 'emp-104',
      type: 'FIELD_VISIT',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      location: '',
      purpose: ''
    });
  };

  const handleUpdateStatus = (id: string, newStatus: 'approved' | 'rejected') => {
    setRequests(requests.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: newStatus,
          approved_by: currentUser?.full_name || 'Admin / HR',
          remarks: newStatus === 'approved' ? 'Approved for attendance credit' : 'Rejected by Management'
        };
      }
      return r;
    }));
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = (r.employee_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          r.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || r.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeBadge = (type: FieldDutyType) => {
    switch (type) {
      case 'FIELD_VISIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <MapPin className="w-3 h-3 text-blue-600" /> Field Visit
          </span>
        );
      case 'WORK_FROM_HOME':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Home className="w-3 h-3 text-purple-600" /> Work From Home
          </span>
        );
      case 'CLIENT_MEETING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Briefcase className="w-3 h-3 text-emerald-600" /> Client Meeting
          </span>
        );
      case 'OFFICIAL_TOUR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Plane className="w-3 h-3 text-amber-600" /> Official Tour
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Approval
          </span>
        );
    }
  };

  return (
    <DashboardShell
      title="Field Duty & Work From Home"
      subtitle="Track on-site client visits, remote days, and grant automatic biometric attendance credits"
    >
      <div className="space-y-6">
        {/* Top Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Requests</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{requests.length}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Total official applications</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Approved Today</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {requests.filter(r => r.status === 'approved').length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Attendance credited</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Approvals</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {requests.filter(r => r.status === 'pending').length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Requires manager action</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">WFH / Remote</p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">
                {requests.filter(r => r.type === 'WORK_FROM_HOME').length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Working from home</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Home className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Action & Filter Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Duty Types</option>
              <option value="FIELD_VISIT">Field Visits Only</option>
              <option value="CLIENT_MEETING">Client Meetings Only</option>
              <option value="WORK_FROM_HOME">Work From Home (WFH)</option>
              <option value="OFFICIAL_TOUR">Official Tours</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Apply Field Duty / WFH</span>
          </button>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-5 py-3.5">Type & Location</th>
                  <th className="px-5 py-3.5">Dates (BS / AD)</th>
                  <th className="px-5 py-3.5">Purpose</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={req.employee_photo || "https://images.unsplash.com/photo-1534528741775?w=150"}
                          alt={req.employee_name || 'Staff'}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">{req.employee_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{req.department_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div>{getTypeBadge(req.type)}</div>
                        <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {req.location}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs space-y-0.5">
                        <p className="font-semibold text-slate-800">
                          {req.start_date === req.end_date ? req.start_date : `${req.start_date} to ${req.end_date}`}
                        </p>
                        <p className="text-[11px] text-blue-600 font-medium">
                          {getNepaliDate(req.start_date).formattedNp}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">{req.purpose}</p>
                      {req.remarks && (
                        <p className="text-[11px] text-emerald-700 italic mt-1">Note: {req.remarks}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {req.status === 'pending' ? (
                        role === 'employee' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-medium">
                            <Clock className="w-3 h-3" /> Admin Review Pending
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'approved')}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(req.id, 'rejected')}
                              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">
                          {req.approved_by ? `Approved by ${req.approved_by}` : 'Closed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: New Field Duty Request */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">New Field Duty / WFH Request</h3>
                    <p className="text-xs text-slate-500">Apply for field visit, client meeting, or work from home</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-3.5">
                {/* Staff Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Employee</label>
                  <select
                    value={formData.employee_id}
                    onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {initialEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.designation} - {emp.department_name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duty Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duty Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as FieldDutyType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="FIELD_VISIT">Field Visit (Client Site / Survey)</option>
                    <option value="CLIENT_MEETING">Client Meeting / Presentation</option>
                    <option value="WORK_FROM_HOME">Work From Home (WFH)</option>
                    <option value="OFFICIAL_TOUR">Official Tour (Outstation / Event)</option>
                  </select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Client Site</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nabil Bank Head Office, Teendhara / Home"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Purpose</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Client API Integration testing, software rollout or server deployment"
                    value={formData.purpose}
                    onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Submit Request
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
