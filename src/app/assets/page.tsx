'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { initialAssets, initialEmployees } from '@/lib/mock-data';
import { CompanyAsset, AssetCategory, Employee } from '@/lib/types';
import { useLanguage } from '@/lib/i18n/context';
import { getNepaliDate } from '@/lib/nepali-date';
import { 
  Laptop, 
  Smartphone, 
  Key, 
  Car, 
  Package, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  Wrench, 
  UserCheck, 
  Printer,
  FileSpreadsheet,
  Camera,
  HardDrive,
  Cpu,
  Trash2
} from 'lucide-react';

export default function AssetsPage() {
  const { t } = useLanguage();
  const defaultCategories = [
    'Camera',
    'Memory Card',
    'SSD / HDD',
    'Laptop',
    'Desktop',
    'Mobile / SIM',
    'Vehicle',
    'Office Access / Key',
    'Equipment'
  ];

  const [categories, setCategories] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_asset_categories');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return Array.from(new Set([...defaultCategories, ...parsed]));
          }
        } catch (e) {}
      }
    }
    return defaultCategories;
  });

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // Load full staff directory
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goinfi_staff_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const isOldBulk = Array.isArray(parsed) && (
            parsed.length > 200 ||
            parsed.some((e: any) => (typeof e.id === 'string' && e.id.startsWith('ap1-')) || e.full_name === 'Yeshoda')
          );
          if (isOldBulk) {
            localStorage.removeItem('goinfi_staff_list');
            return [];
          }
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return [];
  });

  const [assigningAsset, setAssigningAsset] = useState<CompanyAsset | null>(null);
  const [assignStaffId, setAssignStaffId] = useState('');

  const [assets, setAssets] = useState<CompanyAsset[]>(() => {
    if (typeof window !== 'undefined') {
      const isCleared = localStorage.getItem('goinfi_assets_cleared_v2');
      if (!isCleared) {
        localStorage.removeItem('goinfi_assets_list');
        localStorage.setItem('goinfi_assets_cleared_v2', 'true');
        return [];
      }
      const saved = localStorage.getItem('goinfi_assets_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    }
    return [];
  });

  const saveAssetsList = (newList: CompanyAsset[]) => {
    setAssets(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('goinfi_assets_list', JSON.stringify(newList));
    }
  };

  const handleClearAllAssets = () => {
    if (confirm('Are you sure you want to delete ALL assets from inventory?')) {
      saveAssetsList([]);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssetForHandover, setSelectedAssetForHandover] = useState<CompanyAsset | null>(null);

  // New Asset Form
  const [formData, setFormData] = useState({
    name: '',
    asset_code: `GOINFI-AST-${String(assets.length + 1).padStart(3, '0')}`,
    category: 'Camera' as AssetCategory,
    serial_number: '',
    assigned_to_id: '',
    condition: 'Brand New' as 'Brand New' | 'Good' | 'Fair' | 'Under Repair' | 'Damaged',
    purchase_cost: 0,
    notes: ''
  });

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = (isCustomCategory ? customCategoryInput.trim() : formData.category) || 'Equipment';
    const assignedEmp = employees.find(x => x.id === formData.assigned_to_id);
    const newAsset: CompanyAsset = {
      id: `ast-${Date.now()}`,
      name: formData.name,
      asset_code: formData.asset_code,
      category: finalCategory,
      serial_number: formData.serial_number,
      assigned_to_id: assignedEmp?.id,
      assigned_to_name: assignedEmp?.full_name,
      assigned_to_photo: assignedEmp?.photo_url,
      department_name: assignedEmp?.department_name,
      assigned_date: assignedEmp ? new Date().toISOString().split('T')[0] : undefined,
      condition: formData.condition,
      status: assignedEmp ? 'Assigned' : 'Available',
      purchase_cost: formData.purchase_cost,
      purchase_date: new Date().toISOString().split('T')[0],
      notes: formData.notes
    };

    const updated = [newAsset, ...assets];
    saveAssetsList(updated);

    if (!categories.includes(finalCategory)) {
      const updatedCats = [...categories, finalCategory];
      setCategories(updatedCats);
      if (typeof window !== 'undefined') {
        localStorage.setItem('goinfi_asset_categories', JSON.stringify(updatedCats));
      }
    }

    setIsModalOpen(false);
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setFormData({
      name: '',
      asset_code: `GOINFI-AST-${String(updated.length + 1).padStart(3, '0')}`,
      category: 'Camera',
      serial_number: '',
      assigned_to_id: '',
      condition: 'Brand New',
      purchase_cost: 0,
      notes: ''
    });
  };

  const handleDeleteAsset = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
      const updated = assets.filter(a => a.id !== id);
      saveAssetsList(updated);
    }
  };

  const handleReturnAsset = (assetId: string) => {
    const updated = assets.map(a => {
      if (a.id === assetId) {
        return {
          ...a,
          assigned_to_id: undefined,
          assigned_to_name: undefined,
          assigned_to_photo: undefined,
          department_name: undefined,
          assigned_date: undefined,
          status: 'Available' as const,
          notes: (a.notes || '') + ` (Returned on ${new Date().toISOString().split('T')[0]})`
        };
      }
      return a;
    });
    saveAssetsList(updated);
  };

  const handleAssignAssetToStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningAsset || !assignStaffId) return;
    const emp = employees.find(x => x.id === assignStaffId);
    if (!emp) return;

    const updated = assets.map(a => {
      if (a.id === assigningAsset.id) {
        return {
          ...a,
          assigned_to_id: emp.id,
          assigned_to_name: emp.full_name,
          assigned_to_photo: emp.photo_url,
          department_name: emp.department_name,
          assigned_date: new Date().toISOString().split('T')[0],
          status: 'Assigned' as const,
          notes: (a.notes || '') + ` (Assigned to ${emp.full_name} on ${new Date().toISOString().split('T')[0]})`
        };
      }
      return a;
    });

    saveAssetsList(updated);
    setAssigningAsset(null);
    setAssignStaffId('');
  };

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.asset_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.assigned_to_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (a.serial_number?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCat = filterCategory === 'ALL' || a.category === filterCategory;
    const matchesStat = filterStatus === 'ALL' || a.status === filterStatus;
    return matchesSearch && matchesCat && matchesStat;
  });

  const getCategoryIcon = (cat: AssetCategory) => {
    switch (cat) {
      case 'Camera':
        return <Camera className="w-4 h-4 text-rose-600" />;
      case 'Memory Card':
        return <Cpu className="w-4 h-4 text-emerald-600" />;
      case 'SSD / HDD':
      case 'SSD/HDD':
        return <HardDrive className="w-4 h-4 text-indigo-600" />;
      case 'Laptop':
      case 'Desktop':
        return <Laptop className="w-4 h-4 text-blue-600" />;
      case 'Mobile / SIM':
        return <Smartphone className="w-4 h-4 text-emerald-600" />;
      case 'Office Access / Key':
        return <Key className="w-4 h-4 text-amber-600" />;
      case 'Vehicle':
        return <Car className="w-4 h-4 text-purple-600" />;
      default:
        return <Package className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Assigned
          </span>
        );
      case 'Available':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Available
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Wrench className="w-3.5 h-3.5 text-amber-600" /> Under Repair
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <DashboardShell
      title="Asset & Equipment Management"
      subtitle="Track corporate laptops, SIM cards, vehicles, keys, and equipment assigned to staff"
    >
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Assets</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{assets.length}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Hardware & equipment items</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned to Staff</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">
                {assets.filter(a => a.status === 'Assigned').length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Currently with team members</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Available in Storage</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {assets.filter(a => a.status === 'Available').length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Ready for new joining staff</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Inventory Value</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                Rs. {assets.reduce((sum, a) => sum + (a.purchase_cost || 0), 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Insured corporate inventory</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Laptop className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Toolbar & Filter */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search asset, code, serial, staff..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-hidden text-slate-700 bg-white font-medium"
            >
              <option value="ALL">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-hidden text-slate-700 bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="Assigned">Assigned</option>
              <option value="Available">Available</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {assets.length > 0 && (
              <button
                onClick={handleClearAllAssets}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                title="Clear all inventory items"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add / Register Asset</span>
            </button>
          </div>
        </div>

        {/* Assets Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Asset Details</th>
                  <th className="px-5 py-3.5">Category & Serial #</th>
                  <th className="px-5 py-3.5">Assigned To</th>
                  <th className="px-5 py-3.5">Condition</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{asset.name}</span>
                        </div>
                        <p className="text-[11px] font-mono text-blue-600 font-semibold mt-0.5">
                          {asset.asset_code}
                        </p>
                        {asset.notes && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{asset.notes}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          {getCategoryIcon(asset.category)}
                          <span>{asset.category}</span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500">
                          SN: {asset.serial_number || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {asset.assigned_to_name ? (
                        <div className="flex items-center gap-2.5">
                          <img
                            src={asset.assigned_to_photo || "https://images.unsplash.com/photo-1534528741775?w=150"}
                            alt={asset.assigned_to_name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <p className="font-semibold text-slate-900 text-xs leading-tight">
                              {asset.assigned_to_name}
                            </p>
                            <p className="text-[11px] text-slate-500">{asset.department_name}</p>
                            <p className="text-[10px] text-blue-600 mt-0.5">
                              Since: {asset.assigned_date}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned (In IT Store)</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        asset.condition === 'Brand New' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        asset.condition === 'Good' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {asset.condition}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(asset.status)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {asset.status === 'Available' && (
                          <button
                            onClick={() => {
                              setAssigningAsset(asset);
                              setAssignStaffId('');
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Assign
                          </button>
                        )}
                        {asset.status === 'Assigned' && (
                          <>
                            <button
                              onClick={() => setSelectedAssetForHandover(asset)}
                              title="Print Handover Form"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReturnAsset(asset.id)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Return
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteAsset(asset.id, asset.name)}
                          title="Delete from inventory"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAssets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-base font-bold text-slate-800">No Assets Found</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        No company assets registered yet. Click "+ Add / Register Asset" to record new inventory.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add New Asset */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Register New Company Asset</h3>
                    <p className="text-xs text-slate-500">Record new office equipment, hardware, or laptop</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateAsset} className="space-y-3.5">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Name / Model</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MacBook Air M3 15-inch / NTC Postpaid SIM"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Code</label>
                    <input
                      type="text"
                      required
                      value={formData.asset_code}
                      onChange={e => setFormData({ ...formData, asset_code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Category *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(!isCustomCategory);
                          if (!isCustomCategory) {
                            setCustomCategoryInput('');
                          }
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        {isCustomCategory ? '✕ Choose Predefined' : '+ Custom Category'}
                      </button>
                    </div>

                    {!isCustomCategory ? (
                      <select
                        value={formData.category}
                        onChange={e => {
                          if (e.target.value === '__CUSTOM__') {
                            setIsCustomCategory(true);
                            setCustomCategoryInput('');
                          } else {
                            setFormData({ ...formData, category: e.target.value });
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                      >
                        <option value="Camera">📷 Camera (Broadcast Cam / DSLR)</option>
                        <option value="Memory Card">💾 Memory Card (SD / CFexpress)</option>
                        <option value="SSD / HDD">💽 SSD / External Storage / HDD</option>
                        <option value="Laptop">💻 Laptop</option>
                        <option value="Desktop">🖥️ Desktop Workstation</option>
                        <option value="Mobile / SIM">📱 Mobile / Official SIM</option>
                        <option value="Vehicle">🚗 Vehicle (Bike / Car)</option>
                        <option value="Office Access / Key">🔑 Office Access / RFID Card</option>
                        <option value="Equipment">🎙️ Production Equipment</option>
                        {categories.filter(c => !['Camera','Memory Card','SSD / HDD','Laptop','Desktop','Mobile / SIM','Vehicle','Office Access / Key','Equipment'].includes(c)).map(c => (
                          <option key={c} value={c}>✨ {c}</option>
                        ))}
                        <option value="__CUSTOM__">➕ + Custom Category...</option>
                      </select>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Drone, Wireless Mic, Monitor..."
                          value={customCategoryInput}
                          onChange={e => {
                            setCustomCategoryInput(e.target.value);
                            setFormData({ ...formData, category: e.target.value });
                          }}
                          className="w-full px-3 py-2 border border-blue-400 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-blue-50/50 font-medium text-slate-800"
                        />
                        <span className="text-[10px] text-blue-600 block font-medium">
                          Enter custom category name
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Serial Number (SN)</label>
                    <input
                      type="text"
                      placeholder="e.g. C02G9901X"
                      value={formData.serial_number}
                      onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Cost (NPR)</label>
                    <input
                      type="number"
                      placeholder="e.g. 150000"
                      value={formData.purchase_cost || ''}
                      onChange={e => setFormData({ ...formData, purchase_cost: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Assign to Staff */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Assign to Staff</label>
                    <span className="text-[10px] text-slate-500 font-medium">{employees.length} Staff Members Available</span>
                  </div>
                  <select
                    value={formData.assigned_to_id}
                    onChange={e => setFormData({ ...formData, assigned_to_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                  >
                    <option value="">-- Leave Unassigned (Keep in Storage) --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} {emp.biometric_pin ? `(PIN #${emp.biometric_pin})` : ''} - {emp.designation} ({emp.department_name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Included Accessories</label>
                  <input
                    type="text"
                    placeholder="e.g. Charger, backpack, HDMI cable included"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
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
                    Save Asset
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Print Asset Handover Form */}
        {selectedAssetForHandover && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Official Asset Handover Certificate</h3>
                  <p className="text-xs text-slate-500">Corporate asset transfer voucher</p>
                </div>
                <button
                  onClick={() => setSelectedAssetForHandover(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div id="handover-voucher" className="p-4 border-2 border-slate-800 rounded-xl space-y-3 bg-slate-50/50">
                <div className="text-center border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-900 text-base">GOINFI HR SOLUTIONS PVT. LTD.</h4>
                  <p className="text-xs text-slate-500">Asset Handover & Responsibility Agreement</p>
                </div>

                <div className="text-xs space-y-2 text-slate-700">
                  <p>
                    <span className="font-semibold">Asset Code:</span> {selectedAssetForHandover.asset_code}
                  </p>
                  <p>
                    <span className="font-semibold">Asset Item:</span> {selectedAssetForHandover.name}
                  </p>
                  <p>
                    <span className="font-semibold">Serial Number:</span> {selectedAssetForHandover.serial_number || 'N/A'}
                  </p>
                  <p>
                    <span className="font-semibold">Assigned Employee:</span> {selectedAssetForHandover.assigned_to_name}
                  </p>
                  <p>
                    <span className="font-semibold">Department:</span> {selectedAssetForHandover.department_name}
                  </p>
                  <p>
                    <span className="font-semibold">Handover Date:</span> {selectedAssetForHandover.assigned_date} ({getNepaliDate(selectedAssetForHandover.assigned_date || new Date()).formattedEn})
                  </p>
                </div>

                <div className="pt-6 grid grid-cols-2 gap-4 text-center text-xs">
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-semibold text-slate-900">{selectedAssetForHandover.assigned_to_name}</p>
                    <p className="text-[10px] text-slate-500">Employee Signature</p>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-semibold text-slate-900">IT & HR Administration</p>
                    <p className="text-[10px] text-slate-500">Authorized Signature</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedAssetForHandover(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Certificate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Quick Assign Asset to Staff */}
        {assigningAsset && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Assign Asset to Staff</h3>
                    <p className="text-xs text-slate-500">Assign company inventory to an active employee</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAssigningAsset(null);
                    setAssignStaffId('');
                  }}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAssignAssetToStaff} className="space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Asset:</span>
                    <span className="font-bold text-slate-900">{assigningAsset.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Asset Code:</span>
                    <span className="font-mono text-blue-600">{assigningAsset.asset_code}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Category:</span>
                    <span className="text-slate-800">{assigningAsset.category}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Staff Member *
                  </label>
                  <select
                    required
                    value={assignStaffId}
                    onChange={e => setAssignStaffId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                  >
                    <option value="">-- Select Staff Member ({employees.length} Staff Available) --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} {emp.biometric_pin ? `(PIN #${emp.biometric_pin})` : ''} - {emp.designation} ({emp.department_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setAssigningAsset(null);
                      setAssignStaffId('');
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!assignStaffId}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Confirm Assignment
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
