import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Loader2, Download, Upload, Search, CheckCircle, XCircle, GripVertical } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

interface NonPurchaseReason {
  _id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

// Helper to get auth headers including active role
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  const activeRole = localStorage.getItem('activeRole');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(activeRole && { 'X-Active-Role': activeRole }),
  };
};

const NonPurchaseReasonsMasterView: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [reasons, setReasons] = useState<NonPurchaseReason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<NonPurchaseReason | null>(null);
  const [formData, setFormData] = useState({ name: '', displayOrder: 0, isActive: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReasons = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/master-data/non-purchase-reasons/all`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setReasons(data.data.reasons);
      } else {
        showError('Failed to fetch non-purchase reasons');
      }
    } catch (error) {
      showError('Failed to fetch non-purchase reasons');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReasons();
  }, []);

  const handleOpenModal = (reason?: NonPurchaseReason) => {
    if (reason) {
      setEditingReason(reason);
      setFormData({ name: reason.name, displayOrder: reason.displayOrder, isActive: reason.isActive });
    } else {
      setEditingReason(null);
      const maxOrder = reasons.length > 0 ? Math.max(...reasons.map(r => r.displayOrder)) + 1 : 0;
      setFormData({ name: '', displayOrder: maxOrder, isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReason(null);
    setFormData({ name: '', displayOrder: 0, isActive: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Reason name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingReason
        ? `${API_BASE}/master-data/non-purchase-reasons/${editingReason._id}`
        : `${API_BASE}/master-data/non-purchase-reasons`;
      const method = editingReason ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        showSuccess(editingReason ? 'Reason updated successfully' : 'Reason created successfully');
        handleCloseModal();
        fetchReasons();
      } else {
        showError(data.error?.message || 'Operation failed');
      }
    } catch (error) {
      showError('Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (reason: NonPurchaseReason) => {
    try {
      const response = await fetch(`${API_BASE}/master-data/non-purchase-reasons/${reason._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !reason.isActive }),
      });

      const data = await response.json();
      if (data.success) {
        showSuccess(`Reason ${reason.isActive ? 'deactivated' : 'activated'} successfully`);
        fetchReasons();
      } else {
        showError(data.error?.message || 'Operation failed');
      }
    } catch (error) {
      showError('Operation failed');
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Name', 'Display Order', 'Status (Active/Inactive)'];
    const sampleData = [
      ['Price', '1', 'Active'],
      ['Availability', '2', 'Active'],
    ];
    const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'non_purchase_reasons_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadData = () => {
    const headers = ['Name', 'Display Order', 'Status', 'Created At'];
    const csvData = reasons.map(reason => [
      `"${reason.name}"`,
      reason.displayOrder,
      reason.isActive ? 'Active' : 'Inactive',
      new Date(reason.createdAt).toLocaleDateString(),
    ]);
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'non_purchase_reasons_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredReasons = reasons.filter(reason => {
    const matchesSearch = reason.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive || reason.isActive;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Non-Purchase Reasons</h2>
          <p className="text-sm text-slate-600 mt-1">Reasons why farmers didn't purchase products</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Download size={16} />
            Template
          </button>
          <button
            onClick={handleDownloadData}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Upload size={16} />
            Export
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Plus size={16} />
            Add Reason
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reasons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-lime-600 focus:ring-lime-500"
          />
          Show inactive
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-lime-600" />
          </div>
        ) : filteredReasons.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500">No reasons found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReasons.map((reason) => (
                  <tr key={reason._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <GripVertical size={16} className="text-slate-300" />
                        <span className="text-sm font-medium text-slate-600">{reason.displayOrder}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">{reason.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          reason.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {reason.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {reason.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(reason.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(reason)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(reason)}
                          className={`p-2 rounded-lg transition-colors ${
                            reason.isActive
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={reason.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {reason.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-xl font-black text-slate-900">
                {editingReason ? 'Edit Reason' : 'Add New Reason'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Reason Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-lime-500 focus:outline-none"
                  placeholder="e.g., Price, Availability"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-lime-500 focus:outline-none"
                  min="0"
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-lime-600 border-slate-300 rounded focus:ring-lime-500"
                  disabled={isSubmitting}
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                  Active
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                  {editingReason ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NonPurchaseReasonsMasterView;
