'use client';

import React, { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { initialAssets, initialEmployees } from '@/lib/mock-data';
import { CompanyAsset, AssetCategory } from '@/lib/types';
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
  FileSpreadsheet
} from 'lucide-react';

export default function AssetsPage() {
  const { t } = useLanguage();
  const [assets, setAssets] = useState<CompanyAsset[]>(initialAssets);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssetForHandover, setSelectedAssetForHandover] = useState<CompanyAsset | null>(null);

  // New Asset Form
  const [formData, setFormData] = useState({
    name: '',
    asset_code: `GOINFI-AST-${String(assets.length + 1).padStart(3, '0')}`,
    category: 'Laptop' as AssetCategory,
    serial_number: '',
    assigned_to_id: '',
    condition: 'Brand New' as 'Brand New' | 'Good' | 'Fair' | 'Under Repair' | 'Damaged',
    purchase_cost: 0,
    notes: ''
  });

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedEmp = initialEmployees.find(x => x.id === formData.assigned_to_id);
    const newAsset: CompanyAsset = {
      id: `ast-${Date.now()}`,
      name: formData.name,
      asset_code: formData.asset_code,
      category: formData.category,
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

    setAssets([newAsset, ...assets]);
    setIsModalOpen(false);
    setFormData({
      name: '',
      asset_code: `GOINFI-AST-${String(assets.length + 2).padStart(3, '0')}`,
      category: 'Laptop',
      serial_number: '',
      assigned_to_id: '',
      condition: 'Brand New',
      purchase_cost: 0,
      notes: ''
    });
  };

  const handleReturnAsset = (assetId: string) => {
    setAssets(assets.map(a => {
      if (a.id === assetId) {
        return {
          ...a,
          assigned_to_id: undefined,
          assigned_to_name: undefined,
          assigned_to_photo: undefined,
          department_name: undefined,
          assigned_date: undefined,
          status: 'Available',
          notes: (a.notes || '') + ` (Returned on ${new Date().toISOString().split('T')[0]})`
        };
      }
      return a;
    }));
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
            <UserCheck className="w-3.5 h-3.5 text-blue-600" /> जिम्मामा (Assigned)
          </span>
        );
      case 'Available':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> स्टकमा (Available)
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Wrench className="w-3.5 h-3.5 text-amber-600" /> मर्मतमा (Under Repair)
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
      title="Asset & Equipment Management (सामान जिम्मा व्यवस्थापन)"
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
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-hidden text-slate-700 bg-white"
            >
              <option value="ALL">All Categories</option>
              <option value="Laptop">Laptops</option>
              <option value="Desktop">Desktops</option>
              <option value="Mobile / SIM">Mobile / SIMs</option>
              <option value="Vehicle">Vehicles</option>
              <option value="Office Access / Key">Keys & RFID</option>
              <option value="Equipment">Camera / Monitors</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-hidden text-slate-700 bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="Assigned">Assigned (जिम्मामा)</option>
              <option value="Available">Available (स्टकमा)</option>
              <option value="Maintenance">Maintenance (मर्मतमा)</option>
            </select>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add / Register Asset (नयाँ सामान दर्ता)</span>
          </button>
        </div>

        {/* Assets Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Asset Details</th>
                  <th className="px-5 py-3.5">Category & Serial #</th>
                  <th className="px-5 py-3.5">Assigned To (जिम्मा पाउने)</th>
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
                              Return (फिर्ता लिनुहोस्)
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
                    <p className="text-xs text-slate-500">नयाँ अफिस सामान वा ल्यापटप दर्ता गर्नुहोस्</p>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Name / Model (सामानको नाम)</label>
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category (श्रेणी)</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value as AssetCategory })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Laptop">Laptop (ल्यापटप)</option>
                      <option value="Desktop">Desktop (डेस्कटप)</option>
                      <option value="Mobile / SIM">Mobile / SIM (मोबाइल/सिम)</option>
                      <option value="Vehicle">Vehicle (बाइक/गाडी)</option>
                      <option value="Office Access / Key">Office Access / Key (चाबी/कार्ड)</option>
                      <option value="Equipment">Camera / Monitor (उपकरण)</option>
                    </select>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign to Staff (जिम्मा दिने कर्मचारी)</label>
                  <select
                    value={formData.assigned_to_id}
                    onChange={e => setFormData({ ...formData, assigned_to_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- Leave Unassigned (Keep in Storage) --</option>
                    {initialEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.designation} - {emp.department_name})
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
                    Save Asset (सुरक्षित गर्नुहोस्)
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
                  <p className="text-xs text-slate-500">कम्पनी सामान जिम्मा हस्तान्तरण फारम</p>
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
                    <span className="font-semibold">Handover Date:</span> {selectedAssetForHandover.assigned_date} ({getNepaliDate(selectedAssetForHandover.assigned_date || new Date()).formattedNp})
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
                  <Printer className="w-4 h-4" /> Print Certificate (प्रिन्ट)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
