import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Loader2, Download, Upload, Search, CheckCircle, XCircle, Globe, Check } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

interface StateLanguageMapping {
  _id: string;
  state: string;
  primaryLanguage: string;
  secondaryLanguages: string[];
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

const AVAILABLE_LANGUAGES = [
  'Hindi',
  'Telugu',
  'Marathi',
  'Kannada',
  'Tamil',
  'Bengali',
  'Oriya',
  'English',
  'Malayalam',
];

const StateLanguageMappingView: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [mappings, setMappings] = useState<StateLanguageMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<StateLanguageMapping | null>(null);
  const [formData, setFormData] = useState({ 
    state: '', 
    primaryLanguage: 'Hindi',
    secondaryLanguages: [] as string[],
    isActive: true 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMappings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/master-data/state-languages/all`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setMappings(data.data.mappings);
      } else {
        showError('Failed to fetch state-language mappings');
      }
    } catch (error) {
      showError('Failed to fetch state-language mappings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const handleOpenModal = (mapping?: StateLanguageMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      setFormData({ 
        state: mapping.state, 
        primaryLanguage: mapping.primaryLanguage,
        secondaryLanguages: mapping.secondaryLanguages || [],
        isActive: mapping.isActive 
      });
    } else {
      setEditingMapping(null);
      setFormData({ 
        state: '', 
        primaryLanguage: 'Hindi',
        secondaryLanguages: [],
        isActive: true 
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMapping(null);
    setFormData({ state: '', primaryLanguage: 'Hindi', secondaryLanguages: [], isActive: true });
  };

  const handleToggleSecondaryLanguage = (lang: string) => {
    if (lang === formData.primaryLanguage) return; // Can't add primary as secondary
    
    setFormData(prev => ({
      ...prev,
      secondaryLanguages: prev.secondaryLanguages.includes(lang)
        ? prev.secondaryLanguages.filter(l => l !== lang)
        : [...prev.secondaryLanguages, lang]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.state.trim()) {
      showError('State name is required');
      return;
    }
    if (!formData.primaryLanguage) {
      showError('Primary language is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingMapping
        ? `${API_BASE}/api/master-data/state-languages/${editingMapping._id}`
        : `${API_BASE}/api/master-data/state-languages`;
      const method = editingMapping ? 'PUT' : 'POST';

      // Remove primary language from secondary if present
      const cleanedSecondary = formData.secondaryLanguages.filter(l => l !== formData.primaryLanguage);

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          secondaryLanguages: cleanedSecondary,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showSuccess(editingMapping ? 'Mapping updated successfully' : 'Mapping created successfully');
        handleCloseModal();
        fetchMappings();
      } else {
        showError(data.error?.message || 'Operation failed');
      }
    } catch (error) {
      showError('Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (mapping: StateLanguageMapping) => {
    try {
      const response = await fetch(`${API_BASE}/api/master-data/state-languages/${mapping._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !mapping.isActive }),
      });

      const data = await response.json();
      if (data.success) {
        showSuccess(`Mapping ${mapping.isActive ? 'deactivated' : 'activated'} successfully`);
        fetchMappings();
      } else {
        showError(data.error?.message || 'Operation failed');
      }
    } catch (error) {
      showError('Operation failed');
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['State', 'Primary Language', 'Secondary Languages (comma-separated)', 'Status (Active/Inactive)'];
    const sampleData = [
      ['Uttar Pradesh', 'Hindi', '', 'Active'],
      ['Andhra Pradesh', 'Telugu', 'Hindi,English', 'Active'],
      ['Maharashtra', 'Marathi', 'Hindi', 'Active'],
    ];
    const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'state_language_mapping_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadData = () => {
    const headers = ['State', 'Primary Language', 'Secondary Languages', 'Status', 'Created At'];
    const csvData = mappings.map(m => [
      `"${m.state}"`,
      m.primaryLanguage,
      `"${(m.secondaryLanguages || []).join(', ')}"`,
      m.isActive ? 'Active' : 'Inactive',
      new Date(m.createdAt).toLocaleDateString(),
    ]);
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'state_language_mapping_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredMappings = mappings.filter(m => {
    const matchesSearch = m.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.primaryLanguage.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive || m.isActive;
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
          <h2 className="text-2xl font-black text-slate-900">State-Language Mapping</h2>
          <p className="text-sm text-slate-600 mt-1">Map states to their primary and secondary languages</p>
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
            Add Mapping
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by state or language..."
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
        ) : filteredMappings.length === 0 ? (
          <div className="text-center py-20">
            <Globe size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No state-language mappings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">State</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Primary Language</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Secondary Languages</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMappings.map((mapping) => (
                  <tr key={mapping._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">{mapping.state}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        <Globe size={14} />
                        {mapping.primaryLanguage}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {mapping.secondaryLanguages && mapping.secondaryLanguages.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {mapping.secondaryLanguages.map((lang) => (
                            <span
                              key={lang}
                              className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          mapping.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {mapping.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {mapping.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(mapping)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(mapping)}
                          className={`p-2 rounded-lg transition-colors ${
                            mapping.isActive
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={mapping.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {mapping.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
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
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-xl font-black text-slate-900">
                {editingMapping ? 'Edit State-Language Mapping' : 'Add New Mapping'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                  State Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-lime-500 focus:outline-none"
                  placeholder="e.g., Uttar Pradesh, Maharashtra"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Primary Language <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.primaryLanguage}
                  onChange={(e) => {
                    const newPrimary = e.target.value;
                    setFormData({ 
                      ...formData, 
                      primaryLanguage: newPrimary,
                      // Remove from secondary if it was there
                      secondaryLanguages: formData.secondaryLanguages.filter(l => l !== newPrimary)
                    });
                  }}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-lime-500 focus:outline-none bg-white"
                  disabled={isSubmitting}
                >
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Secondary Languages
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_LANGUAGES.filter(l => l !== formData.primaryLanguage).map((lang) => {
                    const isSelected = formData.secondaryLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => handleToggleSecondaryLanguage(lang)}
                        disabled={isSubmitting}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                          isSelected
                            ? 'border-lime-500 bg-lime-50 text-lime-900'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <span>{lang}</span>
                        {isSelected && <Check size={14} className="text-lime-600" />}
                      </button>
                    );
                  })}
                </div>
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
                  {editingMapping ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StateLanguageMappingView;
