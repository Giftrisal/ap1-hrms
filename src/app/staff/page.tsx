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
  X,
  Save,
  LayoutGrid,
  Table as TableIcon,
  Send,
  Sparkles,
  QrCode,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function StaffPage() {
  const { t, language } = useLanguage();
  const { role } = useAuth();
  
  // Load employees from localStorage if previously edited
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_staff_list');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return initialEmployees;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Employee | null>(null);
  const [idCardStaff, setIdCardStaff] = useState<Employee | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [broadcastEmail, setBroadcastEmail] = useState(true);
  const [staffBio, setStaffBio] = useState('');
  const [broadcastResult, setBroadcastResult] = useState<any>(null);

  const saveEmployeesList = (newList: Employee[]) => {
    setEmployees(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_staff_list', JSON.stringify(newList));
    }
  };

  const handleImportAp1Backup = async () => {
    try {
      const res = await fetch('/ap1_staff_list.json');
      if (!res.ok) throw new Error('Could not fetch AP1 staff file');
      const data: Employee[] = await res.json();
      saveEmployeesList(data);
      showNotice(
        language === 'en'
          ? `✅ Successfully loaded all ${data.length} AP1 employees from biometric backup!`
          : `✅ बायोमेट्रिक मेसिनबाट सबै ${data.length} AP1 कर्मचारीहरू सफलतापूर्वक लोड गरियो!`
      );
    } catch (err) {
      alert('Error loading staff: ' + err);
    }
  };

  // Form data for adding new employee
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
    status: 'active',
    bank_name: 'NIC Asia Bank',
    bank_account_number: '10928374829101',
    pan_number: 'PAN69102910'
  });

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.biometric_pin.includes(searchQuery);
    const matchesDept = selectedDept === 'ALL' || emp.department_name === selectedDept;
    return matchesSearch && matchesDept;
  });

  const handleCreateStaff = async (e: React.FormEvent) => {
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
      bank_name: formData.bank_name || 'NIC Asia Bank',
      bank_account_number: formData.bank_account_number || '10928374829101',
      pan_number: formData.pan_number || 'PAN69102910'
    };

    saveEmployeesList([newEmp, ...employees]);
    setIsAddModalOpen(false);

    // Auto-broadcast welcome introduction email if enabled!
    if (broadcastEmail) {
      try {
        const res = await fetch('/api/staff/welcome-broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: newEmp.full_name,
            designation: newEmp.designation,
            department_name: newEmp.department_name,
            email: newEmp.email,
            phone: newEmp.phone,
            photo_url: newEmp.photo_url,
            join_date: newEmp.join_date,
            bio: staffBio
          })
        });
        const data = await res.json();
        setBroadcastResult(data);
        showNotice(`🎉 ${newEmp.full_name} added & Welcome Email sent to all 32 team members!`);
      } catch (err) {
        showNotice('Staff added. (Email notification queued)');
      }
    } else {
      showNotice(language === 'en' ? 'New staff member added successfully!' : 'नयाँ कर्मचारी सफलतापूर्वक थपियो!');
    }
  };

  const handleBroadcastWelcome = async (emp: Employee) => {
    try {
      const res = await fetch('/api/staff/welcome-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: emp.full_name,
          designation: emp.designation,
          department_name: emp.department_name,
          email: emp.email,
          phone: emp.phone,
          photo_url: emp.photo_url,
          join_date: emp.join_date,
          bio: `Excited to have ${emp.full_name} leading as ${emp.designation} at Goinfi Technologies!`
        })
      });
      const data = await res.json();
      setBroadcastResult(data);
      showNotice(`🎉 Welcome Announcement sent to all staff for ${emp.full_name}!`);
    } catch (e) {
      alert('Failed to send broadcast');
    }
  };

  const handleUpdateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    const dept = initialDepartments.find(d => d.id === editingStaff.department_id);
    const updated = {
      ...editingStaff,
      department_name: dept?.name || editingStaff.department_name,
      base_salary: Number(editingStaff.base_salary)
    };

    const updatedList = employees.map(emp => emp.id === updated.id ? updated : emp);
    saveEmployeesList(updatedList);
    setEditingStaff(null);
    showNotice(language === 'en' ? 'Employee details & salary updated successfully!' : 'कर्मचारी विवरण र तलब सुरक्षित भयो!');
  };

  const handleDeleteStaff = (id: string, name: string) => {
    if (confirm(language === 'en' ? `Are you sure you want to remove ${name}?` : `के तपाईं साँच्चै ${name} लाई हटाउन चाहनुहुन्छ?`)) {
      const updatedList = employees.filter(e => e.id !== id);
      saveEmployeesList(updatedList);
      setEditingStaff(null);
      showNotice(language === 'en' ? `${name} has been removed.` : `${name} हटाइयो।`);
    }
  };

  const showNotice = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 5000);
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
      'Bank': e.bank_name,
      'Account Number': e.bank_account_number
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
        ? "Manage, edit salaries, biometric PINs, and automated welcome broadcasts" 
        : "कर्मचारी विवरण, तलब सम्पादन, बायोमेट्रिक मेसिन पिन, तथा नयाँ कर्मचारी स्वागत इमेल प्रणाली"}
    >
      {/* Toast Notice */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Broadcast Result Banner (When welcome email is triggered) */}
      {broadcastResult && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">{broadcastResult.subject}</p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Sent to {broadcastResult.recipientCount} staff emails. WhatsApp announcement ready.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setBroadcastResult(null)}
            className="px-3 py-1 bg-white border border-blue-200 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 cursor-pointer self-start sm:self-auto"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Action & Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchStaffPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium text-slate-700"
          >
            <option value="ALL">{t.filterDepartment}</option>
            {initialDepartments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* View Toggle + Add Button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* View Switcher: Cards vs Table */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <button
            onClick={exportStaffDirectory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          {/* Import 263 AP1 Staff Button */}
          <button
            onClick={handleImportAp1Backup}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            title="Load all 263 AP1 staff extracted from biometric backup"
          >
            <Fingerprint className="w-4 h-4 text-white" />
            <span>{language === 'en' ? '⚡ Load 263 AP1 Staff' : '⚡ २६३ AP1 कर्मचारी लोड'}</span>
          </button>

          {/* Big Add Staff Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>{language === 'en' ? '+ Add New Staff' : '+ नयाँ कर्मचारी थप्नुहोस्'}</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CARD VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((emp) => (
            <div 
              key={emp.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: PIN & Role */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                    <Fingerprint className="w-3 h-3 text-blue-600" />
                    PIN #{emp.biometric_pin}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {emp.role}
                  </span>
                </div>

                {/* Avatar & Name */}
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={emp.photo_url || "https://images.unsplash.com/photo-1534528741775?w=150"}
                    alt={emp.full_name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{emp.full_name}</h4>
                    <p className="text-xs text-blue-600 font-semibold">{emp.designation}</p>
                    <p className="text-[11px] text-slate-500">{emp.department_name}</p>
                  </div>
                </div>

                {/* Salary Highlight Box */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Monthly Salary:</span>
                    <span className="font-bold text-slate-900 text-sm text-emerald-700">
                      NPR {emp.base_salary.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500">
                    <span>Email:</span>
                    <span className="truncate max-w-[140px] text-slate-700">{emp.email}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2.5 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingStaff({ ...emp })}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-white" />
                    <span>{language === 'en' ? 'Edit Details' : 'सम्पादन'}</span>
                  </button>
                  <button
                    onClick={() => setIdCardStaff(emp)}
                    className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer"
                    title="Generate Digital ID Card"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(emp.id, emp.full_name)}
                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer"
                    title="Delete Staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Broadcast Welcome Button */}
                <button
                  onClick={() => handleBroadcastWelcome(emp)}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 hover:text-blue-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Send welcome intro email to all 32 staff"
                >
                  <Send className="w-3 h-3 text-blue-600" />
                  <span>{language === 'en' ? 'Send Intro Email to All Staff' : 'सबैलाई स्वागत इमेल पठाउनुहोस्'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Machine PIN</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Base Salary</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={emp.photo_url || "https://images.unsplash.com/photo-1534528741775?w=150"}
                          alt={emp.full_name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{emp.full_name}</p>
                          <p className="text-[11px] text-slate-500 leading-tight">{emp.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      PIN #{emp.biometric_pin}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-700">
                      {emp.department_name}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {emp.designation}
                    </td>

                    <td className="py-3 px-4 font-bold text-emerald-700 text-sm">
                      NPR {emp.base_salary.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingStaff({ ...emp })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-white" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setIdCardStaff(emp)}
                          className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 cursor-pointer"
                          title="View ID Card"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT STAFF & SALARY MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <span>
                  {language === 'en' ? `Edit Staff: ${editingStaff.full_name}` : `कर्मचारी सम्पादन: ${editingStaff.full_name}`}
                </span>
              </h3>
              <button 
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name (पूरा नाम) *</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.full_name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Biometric Machine PIN (मेसिन आइडी) *</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.biometric_pin}
                    onChange={(e) => setEditingStaff({ ...editingStaff, biometric_pin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Salary Highlight Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div>
                  <label className="block font-bold text-blue-900 mb-1">Monthly Base Salary (मासिक तलब रु.) *</label>
                  <input
                    type="number"
                    required
                    value={editingStaff.base_salary}
                    onChange={(e) => setEditingStaff({ ...editingStaff, base_salary: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-white border border-blue-400 rounded-lg font-bold text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  <span className="text-[10px] text-blue-700 mt-1 block font-medium">Used for monthly payslips & OT calculation</span>
                </div>
                <div>
                  <label className="block font-bold text-blue-900 mb-1">Designation / Position (पद) *</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.designation}
                    onChange={(e) => setEditingStaff({ ...editingStaff, designation: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-blue-400 rounded-lg font-semibold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  <span className="text-[10px] text-blue-700 mt-1 block font-medium">E.g. Lead Engineer, HR Manager</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department (विभाग)</label>
                  <select
                    value={editingStaff.department_id}
                    onChange={(e) => setEditingStaff({ ...editingStaff, department_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium"
                  >
                    {initialDepartments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">System Access Role</label>
                  <select
                    value={editingStaff.role}
                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium"
                  >
                    <option value="employee">Employee / Staff</option>
                    <option value="hr">HR Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingStaff.email}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingStaff.phone}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* ACTION BUTTONS (DELETE & SAVE) */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteStaff(editingStaff.id, editingStaff.full_name)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>{language === 'en' ? 'Delete Staff' : 'कर्मचारी हटाउनुहोस्'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-white" />
                    <span>{t.save}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW STAFF MODAL WITH AUTOMATED WELCOME EMAIL CHECKBOX */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>{language === 'en' ? 'Add New Employee' : 'नयाँ कर्मचारी थप्नुहोस्'}</span>
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name (पूरा नाम) *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold"
                    placeholder="e.g. Sujan Shrestha"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Biometric Machine PIN (मेसिन आइडी) *</label>
                  <input
                    type="text"
                    required
                    value={formData.biometric_pin}
                    onChange={(e) => setFormData({ ...formData, biometric_pin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono font-bold"
                    placeholder="e.g. 133"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    placeholder="sujan.s@goinfi.com"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium"
                  >
                    {initialDepartments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation / Role</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    placeholder="e.g. Full Stack Developer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Base Salary (NPR रु.)</label>
                  <input
                    type="number"
                    value={formData.base_salary}
                    onChange={(e) => setFormData({ ...formData, base_salary: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Access Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium"
                  >
                    <option value="employee">Employee</option>
                    <option value="hr">HR Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              {/* Short Bio Field */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Short Introduction / Bio (छोटो परिचय)</label>
                <textarea
                  rows={2}
                  value={staffBio}
                  onChange={(e) => setStaffBio(e.target.value)}
                  placeholder="e.g. Sujan brings 3+ years of React experience and loves building high-performance web systems!"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              {/* AUTOMATED WELCOME BROADCAST CHECKBOX */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-blue-950">
                  <input
                    type="checkbox"
                    checked={broadcastEmail}
                    onChange={(e) => setBroadcastEmail(e.target.checked)}
                    className="rounded text-blue-600 w-4 h-4"
                  />
                  <span>🎉 Broadcast Welcome Email to All Staff (सबै कर्मचारीलाई इमेल पठाउने)</span>
                </label>
                <p className="text-[11px] text-blue-700 pl-6.5">
                  Automatically introduces {formData.full_name || 'this new staff member'} to all 32 team members' emails with photo and designation.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>{t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIGITAL ID CARD PREVIEW & PRINT MODAL */}
      {idCardStaff && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Official Staff ID Badge</span>
              <button onClick={() => setIdCardStaff(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable ID Card */}
            <div className="w-full bg-slate-900 text-white rounded-2xl overflow-hidden shadow-xl border border-slate-800 text-center relative p-5">
              {/* Lanyard punch hole simulation */}
              <div className="w-12 h-2 bg-slate-800 rounded-full mx-auto mb-4 border border-slate-700"></div>

              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm tracking-tight text-white">GOINFI TECHNOLOGIES</h3>
              </div>

              <img
                src={idCardStaff.photo_url || "https://images.unsplash.com/photo-1534528741775?w=150"}
                alt={idCardStaff.full_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-blue-500 mx-auto shadow-md mb-3"
              />

              <h4 className="font-bold text-base text-white">{idCardStaff.full_name}</h4>
              <p className="text-xs font-semibold text-blue-400 mt-0.5">{idCardStaff.designation}</p>
              <span className="text-[11px] text-slate-400">{idCardStaff.department_name}</span>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-left text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Biometric PIN</span>
                  <span className="font-mono font-bold text-white">#{idCardStaff.biometric_pin}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Join Date</span>
                  <span className="text-white font-medium">{idCardStaff.join_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">PAN</span>
                  <span className="font-mono text-white text-[10px]">{idCardStaff.pan_number || 'PAN60129381'}</span>
                </div>
              </div>

              <div className="mt-3 pt-2 bg-slate-950/60 rounded-xl p-2 flex items-center justify-center gap-2 text-[10px] text-slate-400">
                <QrCode className="w-4 h-4 text-blue-400" />
                <span>Verified Biometric Profile</span>
              </div>
            </div>

            {/* Print Button */}
            <div className="w-full mt-4 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print ID Badge</span>
              </button>
              <button
                onClick={() => setIdCardStaff(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
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
