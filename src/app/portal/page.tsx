'use client';

import React, { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { initialEmployees, generateTodayAttendance, initialAssets, initialFieldDutyRequests } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth/auth-context';
import { useLanguage } from '@/lib/i18n/context';
import { getNepaliDate } from '@/lib/nepali-date';
import { 
  User, 
  Clock, 
  CalendarDays, 
  CircleDollarSign, 
  Package, 
  MapPin, 
  QrCode, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Calendar,
  Phone,
  Mail,
  Building,
  Award
} from 'lucide-react';
import { generatePayslipPdf } from '@/lib/pdf/payslip-generator';

export default function StaffPortalPage() {
  const { t } = useLanguage();
  const { currentUser, role } = useAuth();
  const [selectedEmpId, setSelectedEmpId] = useState<string>(currentUser?.id || 'emp-104');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitted, setLeaveSubmitted] = useState(false);

  // Field Duty Modal State
  const [isFdModalOpen, setIsFdModalOpen] = useState(false);
  const [fdSubmitted, setFdSubmitted] = useState(false);
  const [fdType, setFdType] = useState<'FIELD_VISIT' | 'WORK_FROM_HOME' | 'CLIENT_MEETING' | 'OFFICIAL_TOUR'>('FIELD_VISIT');
  const [fdLocation, setFdLocation] = useState('');
  const [fdPurpose, setFdPurpose] = useState('');
  const [fdDate, setFdDate] = useState(new Date().toISOString().split('T')[0]);
  const [myFieldDuties, setMyFieldDuties] = useState(initialFieldDutyRequests);

  const selectedEmployee = initialEmployees.find(e => e.id === selectedEmpId) || initialEmployees[3];
  const mockAttendance = generateTodayAttendance();
  const todayAttendance = mockAttendance.find(a => a.employee_id === selectedEmployee.id);
  const employeeAssets = initialAssets.filter(a => a.assigned_to_id === selectedEmployee.id);
  const employeeFieldDuties = myFieldDuties.filter(f => f.employee_id === selectedEmployee.id);

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveSubmitted(true);
    setTimeout(() => {
      setLeaveSubmitted(false);
      setIsLeaveModalOpen(false);
      setLeaveReason('');
    }, 2000);
  };

  const handleApplyFieldDuty = (e: React.FormEvent) => {
    e.preventDefault();
    const newFd = {
      id: `fdr-${Date.now()}`,
      employee_id: selectedEmployee.id,
      employee_name: selectedEmployee.full_name,
      employee_photo: selectedEmployee.photo_url,
      department_name: selectedEmployee.department_name,
      type: fdType,
      start_date: fdDate,
      end_date: fdDate,
      location: fdLocation,
      purpose: fdPurpose,
      status: 'pending' as const, // Must be approved by admin!
      applied_at: new Date().toISOString(),
      remarks: 'Pending Administrator Approval'
    };
    setMyFieldDuties([newFd, ...myFieldDuties]);
    setFdSubmitted(true);
    setTimeout(() => {
      setFdSubmitted(false);
      setIsFdModalOpen(false);
      setFdLocation('');
      setFdPurpose('');
    }, 2000);
  };

  const handleDownloadPayslip = () => {
    generatePayslipPdf({
      id: `pay-${selectedEmployee.id}-2026-09`,
      employee_id: selectedEmployee.id,
      employee_name: selectedEmployee.full_name,
      employee_designation: selectedEmployee.designation,
      department_name: selectedEmployee.department_name,
      pan_number: selectedEmployee.pan_number,
      bank_name: selectedEmployee.bank_name,
      bank_account_number: selectedEmployee.bank_account_number,
      year: 2026,
      month: 9,
      base_salary: selectedEmployee.base_salary,
      working_days: 26,
      present_days: 24,
      absent_days: 1,
      late_days: 1,
      paid_leave_days: 1,
      unpaid_leave_days: 0,
      overtime_hours: 4,
      overtime_pay: 1500,
      allowances: 3000,
      late_deduction: 0,
      absent_deduction: Math.round(selectedEmployee.base_salary / 26),
      unpaid_leave_deduction: 0,
      advance_deduction: 0,
      tax_deduction: Math.round(selectedEmployee.base_salary * 0.01),
      net_salary: selectedEmployee.base_salary + 3000 + 1500 - Math.round(selectedEmployee.base_salary / 26) - Math.round(selectedEmployee.base_salary * 0.01),
      status: 'paid'
    });
  };

  return (
    <DashboardShell
      title="Staff Self-Service Portal (कर्मचारी पोर्टल)"
      subtitle="View your daily biometric punch status, apply for leave, download payslips, and check assigned assets"
    >
      <div className="space-y-6">
        {/* Profile Selector Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={selectedEmployee.photo_url || "https://images.unsplash.com/photo-1534528741775?w=150"}
              alt={selectedEmployee.full_name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-400 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{selectedEmployee.full_name}</h3>
                <span className="px-2 py-0.5 bg-blue-500/30 border border-blue-400/40 rounded-md text-[11px] font-semibold text-blue-200">
                  PIN #{selectedEmployee.biometric_pin}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                {selectedEmployee.designation} • {selectedEmployee.department_name}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                <span>Joined: {selectedEmployee.join_date}</span>
                <span>•</span>
                <span>{getNepaliDate(selectedEmployee.join_date).formattedNp}</span>
              </p>
            </div>
          </div>

          {/* Employee Switching Dropdown (for quick testing/demo) */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700 w-full md:w-auto">
            <User className="w-4 h-4 text-blue-400" />
            <select
              value={selectedEmpId}
              onChange={e => setSelectedEmpId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-hidden font-medium cursor-pointer"
            >
              {initialEmployees.map(e => (
                <option key={e.id} value={e.id} className="bg-slate-900 text-white">
                  {e.full_name} ({e.designation})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Quick Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Punch */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Punch Status</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-bold ${
                todayAttendance?.status === 'PRESENT' ? 'text-emerald-600' :
                todayAttendance?.status === 'LATE' ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {todayAttendance?.status || 'PRESENT'}
              </span>
              <span className="text-xs text-slate-500">
                (In: {todayAttendance?.in_time ? new Date(todayAttendance.in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:12 AM'})
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              ZKTeco Machine ID #{selectedEmployee.biometric_pin}
            </p>
          </div>

          {/* Leave Balance */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Leave Balance (बिदा)</span>
              <CalendarDays className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">14</span>
              <span className="text-xs text-slate-500">Days Available</span>
            </div>
            <p className="text-[11px] text-purple-600 font-medium mt-2">
              Casual: 5d • Sick: 6d • Annual: 3d
            </p>
          </div>

          {/* My Monthly Salary */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Monthly Base Salary</span>
              <CircleDollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-emerald-600">
                Rs. {selectedEmployee.base_salary.toLocaleString('en-IN')}
              </span>
            </div>
            <button
              onClick={handleDownloadPayslip}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold mt-2 flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3 h-3" /> Download Latest Payslip (PDF)
            </button>
          </div>

          {/* Assigned Assets */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Assigned Company Assets</span>
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{employeeAssets.length}</span>
              <span className="text-xs text-slate-500">Items Assigned</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 truncate">
              {employeeAssets.map(a => a.name).join(', ') || 'None assigned yet'}
            </p>
          </div>
        </div>

        {/* Action Blocks: Quick Leave Application & Assigned Assets Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Leave Request & Balance Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-slate-900">Leave Requests & Balance (बिदाको विवरण)</h4>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                + Apply Leave (निवेदन)
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-center">
                <p className="text-xs text-blue-700 font-semibold">Casual Leave (आकस्मिक)</p>
                <p className="text-lg font-bold text-blue-900 mt-1">5 / 6</p>
                <p className="text-[10px] text-blue-600">Remaining</p>
              </div>
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg text-center">
                <p className="text-xs text-purple-700 font-semibold">Sick Leave (बिरामी)</p>
                <p className="text-lg font-bold text-purple-900 mt-1">6 / 6</p>
                <p className="text-[10px] text-purple-600">Remaining</p>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-center">
                <p className="text-xs text-emerald-700 font-semibold">Annual Leave (पर्व)</p>
                <p className="text-lg font-bold text-emerald-900 mt-1">3 / 6</p>
                <p className="text-[10px] text-emerald-600">Remaining</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-lg p-3 bg-slate-50 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Recent Leave History:</p>
              <div className="flex items-center justify-between text-[11px] py-1">
                <span>Festival Leave (Ghai Jatra)</span>
                <span className="text-emerald-600 font-semibold">Approved (1 Day)</span>
              </div>
              <div className="flex items-center justify-between text-[11px] py-1 border-t border-slate-200">
                <span>Casual Leave (Personal Work)</span>
                <span className="text-emerald-600 font-semibold">Approved (2 Days)</span>
              </div>
            </div>
          </div>

          {/* Assigned Assets & Equipment */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900">My Assigned Assets (जिम्मा पाएका सामानहरू)</h4>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {employeeAssets.length} Active Items
              </span>
            </div>

            {employeeAssets.length > 0 ? (
              <div className="space-y-3">
                {employeeAssets.map(asset => (
                  <div key={asset.id} className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm">{asset.name}</span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full border border-blue-200">
                          {asset.category}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500">
                        Code: {asset.asset_code} • SN: {asset.serial_number || 'N/A'}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-medium">
                        Handed over: {asset.assigned_date} (Condition: {asset.condition})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">
                कुनै सामान जिम्मा दिइएको छैन (No hardware assets currently assigned)
              </div>
            )}

            {/* Field Duty Submissions */}
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-800">My Field Duty & Remote Requests:</p>
                <button
                  onClick={() => setIsFdModalOpen(true)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <MapPin className="w-3 h-3" /> + Apply Duty / WFH
                </button>
              </div>
              {employeeFieldDuties.length > 0 ? (
                <div className="space-y-2">
                  {employeeFieldDuties.map(fd => (
                    <div key={fd.id} className="p-2.5 bg-blue-50/50 border border-blue-200/60 rounded-lg text-xs flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-blue-900">{fd.purpose}</span>
                        <p className="text-[11px] text-slate-600">{fd.location} ({fd.start_date})</p>
                        {fd.status === 'pending' && (
                          <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                            ⏳ Awaiting Administrator Approval
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        fd.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        fd.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {fd.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No field duty or remote requests submitted</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal: Quick Apply Leave */}
        {isLeaveModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Apply For Leave (बिदाको निवेदन)</h3>
                </div>
                <button
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              {leaveSubmitted ? (
                <div className="p-6 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                  <h4 className="font-bold text-slate-900">Leave Application Submitted!</h4>
                  <p className="text-xs text-slate-500">निवेदन एचआर तथा म्यानेजर समक्ष पेश भयो।</p>
                </div>
              ) : (
                <form onSubmit={handleApplyLeave} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Type (बिदाको प्रकार)</label>
                    <select
                      value={leaveType}
                      onChange={e => setLeaveType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Casual Leave">Casual Leave (आकस्मिक बिदा - 5 बाँकी)</option>
                      <option value="Sick Leave">Sick Leave (बिरामी बिदा - 6 बाँकी)</option>
                      <option value="Annual Leave">Annual Leave (वार्षिक बिदा - 3 बाँकी)</option>
                      <option value="Unpaid Leave">Unpaid Leave (बेखर्ची बिदा)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Days (दिन)</label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      required
                      value={leaveDays}
                      onChange={e => setLeaveDays(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reason (कारण)</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="बिदा बस्नुको मुख्य कारण लेख्नुहोस्..."
                      value={leaveReason}
                      onChange={e => setLeaveReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsLeaveModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-xs"
                    >
                      Submit Leave (पेश गर्नुहोस्)
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal: Quick Apply Field Duty / WFH */}
        {isFdModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Apply Field Duty / WFH</h3>
                </div>
                <button
                  onClick={() => setIsFdModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              {fdSubmitted ? (
                <div className="p-6 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                  <h4 className="font-bold text-slate-900">Request Submitted to Admin!</h4>
                  <p className="text-xs text-slate-600">
                    प्रशासक (Admin) ले स्वीकृत (Approve) गरेपछि हाजिरी स्वतः मान्य हुनेछ।
                  </p>
                </div>
              ) : (
                <form onSubmit={handleApplyFieldDuty} className="space-y-3.5">
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                    ℹ️ <strong>नोट:</strong> यो निवेदन व्यवस्थापक (Admin) समक्ष पेश हुन्छ। Admin ले Approve गरेपछि मात्र हाजिरीमा जोडिन्छ।
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Duty Type (प्रकार)</label>
                    <select
                      value={fdType}
                      onChange={e => setFdType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="FIELD_VISIT">Field Visit (फिल्ड भ्रमण / सर्भे)</option>
                      <option value="CLIENT_MEETING">Client Meeting (ग्राहक भेटघाट)</option>
                      <option value="WORK_FROM_HOME">Work From Home (घरबाट काम - WFH)</option>
                      <option value="OFFICIAL_TOUR">Official Tour (उपत्यकाबाहिर भ्रमण)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date (मिति)</label>
                    <input
                      type="date"
                      required
                      value={fdDate}
                      onChange={e => setFdDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Client Site (स्थान)</label>
                    <input
                      type="text"
                      required
                      placeholder="जस्तै: Nabil Bank Head Office, Teendhara / Home"
                      value={fdLocation}
                      onChange={e => setFdLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose / Work Detail (कामको विवरण)</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="फिल्ड वा घरबाट गर्ने मुख्य कामको विवरण लेख्नुहोस्..."
                      value={fdPurpose}
                      onChange={e => setFdPurpose(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsFdModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-xs"
                    >
                      Submit to Admin (Admin लाई पठाउनुहोस्)
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
