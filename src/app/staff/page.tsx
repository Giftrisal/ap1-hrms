'use client';

import React, { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { useAuth } from '@/lib/auth/auth-context';
import { initialEmployees, initialDepartments } from '@/lib/mock-data';
import { Employee } from '@/lib/types';
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  Filter, 
  Edit3, 
  Trash2, 
  Fingerprint, 
  Mail, 
  Phone, 
  Calendar,
  CreditCard,
  Building,
  CheckCircle2,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function StaffPage() {
  const { t, language } = useLanguage();
  const { role } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Employee | null>(null);

  // New staff form state
  const [formData, setFormData] = useState<Partial<Employee>>({
    full_name: '',
    email: '',
    phone: '+977-98',
    biometric_pin: '',
    department_id: initialDepartments[1].id,
    designation: '',
    base_salary: 40000,
    join_date: new Date().toISOString().split('T')[0],
    role: 'employee',
    status: 'active'
  });

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.biometric_pin.includes(searchQuery);
    const matchesDept = selectedDept === 'ALL' || emp.department_name === selectedDept;
    return matchesSearch && matchesDept;
  });

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.biometric_pin) {
      alert('Please provide Full Name and Biometric PIN');
      return;
    }

    const dept = initialDepartments.find(d => d.id === formData.department_id);
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      biometric_pin: formData.biometric_pin!,
      full_name: formData.full_name!,
      email: formData.email || `${formData.full_name.toLowerCase().replace(/\s+/g, '.')}@goinfi.com`,
      phone: formData.phone || '+977-9800000000',
      photo_url: `https://images.unsplash.com/photo-${1534528741775 + employees.length}?w=150`,
      department_id: formData.department_id!,
      department_name: dept?.name || 'Software Engineering',
      shift_id: 'shift-1',
      shift_name: 'Regular Morning Shift',
      designation: formData.designation || 'Specialist',
      role: formData.role || 'employee',
      status: 'active',
      join_date: formData.join_date || new Date().toISOString().split('T')[0],
      base_salary: Number(formData.base_salary) || 40000,
      bank_name: 'NIC Asia Bank',
      bank_account_number: '10928374829101',
      pan_number: 'PAN69102910'
    };

    setEmployees([newEmp, ...employees]);
    setIsAddModalOpen(false);
    alert('New staff member added successfully with ZKTeco PIN mapping!');
  };

  const exportStaffDirectory = () => {
    const data = employees.map((e) => ({
      'Biometric PIN': e.biometric_pin,
      'Full Name': e.full_name,
      'Email': e.email,
      'Phone': e.phone,
      'Department': e.department_name,
      'Designation': e.designation,
      'Base Salary (NPR)': e.base_salary,
      'Join Date': e.join_date,
      'Role': e.role,
      'PAN': e.pan_number,
      'Bank': e.bank_name
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Staff Directory');
    XLSX.writeFile(workbook, `Goinfi_Staff_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <DashboardShell
      title={t.navStaff}
      subtitle={language === 'en' 
        ? "Manage 30+ team profiles, biometric PIN assignments, roles, and compensation" 
        : "३०+ कर्मचारीको प्रोफाइल, बायोमेट्रिक मेसिन पिन, पद तथा तलब व्यवस्थापन"}
    >
      {/* Top Action & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search & Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchStaffPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium text-slate-700"
          >
            <option value="ALL">{t.filterDepartment}</option>
            {initialDepartments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={exportStaffDirectory}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportExcel}</span>
          </button>

          {(role === 'admin' || role === 'hr') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addNewStaff}</span>
            </button>
          )}
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">{t.colStaff}</th>
                <th className="py-3 px-4">{t.colBiometricPin}</th>
                <th className="py-3 px-4">{t.colDepartment}</th>
                <th className="py-3 px-4">{t.colDesignation}</th>
                <th className="py-3 px-4">{t.colJoinDate}</th>
                <th className="py-3 px-4">{t.colBaseSalary}</th>
                <th className="py-3 px-4">{t.colRole}</th>
                <th className="py-3 px-4 text-right">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Photo & Name */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                        alt={emp.full_name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <p className="font-semibold text-slate-900 leading-tight">{emp.full_name}</p>
                        <p className="text-[11px] text-slate-500 leading-tight flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{emp.email}</span>
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Machine Pin */}
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      <Fingerprint className="w-3 h-3 text-blue-600" />
                      #{emp.biometric_pin}
                    </span>
                  </td>

                  {/* Department */}
                  <td className="py-3 px-4 font-medium text-slate-700">
                    {emp.department_name}
                  </td>

                  {/* Designation */}
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {emp.designation}
                  </td>

                  {/* Join Date */}
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {emp.join_date}
                  </td>

                  {/* Base Salary */}
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    NPR {emp.base_salary.toLocaleString('en-IN')}
                  </td>

                  {/* Role Badge */}
                  <td className="py-3 px-4">
                    <span className={`capitalize px-2 py-0.5 rounded text-[11px] font-semibold ${
                      emp.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                        : emp.role === 'hr'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {emp.role}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedStaff(emp)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
                      title="View Profile Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>{t.addNewStaff}</span>
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Sujan Shrestha"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Biometric Machine PIN *</label>
                  <input
                    type="text"
                    required
                    value={formData.biometric_pin}
                    onChange={(e) => setFormData({ ...formData, biometric_pin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                    placeholder="e.g. 133"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="sujan.s@goinfi.com"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="+977-9800000000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    {initialDepartments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="e.g. React Developer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Base Salary (NPR)</label>
                  <input
                    type="number"
                    value={formData.base_salary}
                    onChange={(e) => setFormData({ ...formData, base_salary: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Access Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="hr">HR Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Profile View Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee Profile</span>
              <button 
                onClick={() => setSelectedStaff(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center text-center">
              <img
                src={selectedStaff.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                alt={selectedStaff.full_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-blue-500 shadow-md mb-3"
              />
              <h3 className="font-bold text-slate-900 text-lg">{selectedStaff.full_name}</h3>
              <p className="text-xs text-blue-600 font-semibold">{selectedStaff.designation}</p>
              <span className="text-xs text-slate-500 mt-0.5">{selectedStaff.department_name}</span>
            </div>

            <div className="mt-5 space-y-2.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Biometric PIN</span>
                <span className="font-mono font-bold text-slate-900">#{selectedStaff.biometric_pin}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Email</span>
                <span className="font-medium text-slate-900">{selectedStaff.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Phone</span>
                <span className="font-medium text-slate-900">{selectedStaff.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Base Salary</span>
                <span className="font-bold text-slate-900">NPR {selectedStaff.base_salary.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Bank & Account</span>
                <span className="font-medium text-slate-900">{selectedStaff.bank_name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">PAN Number</span>
                <span className="font-mono font-semibold text-slate-900">{selectedStaff.pan_number || 'PAN60129381'}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedStaff(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
