import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { usersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import LanguageSelector from './LanguageSelector';

export type UserRole = 'cc_agent' | 'team_lead' | 'mis_admin' | 'core_sales_head' | 'marketing_head';

interface User {
  _id?: string;
  name: string;
  email: string;
  employeeId: string;
  role: UserRole;
  languageCapabilities: string[];
  teamLeadId?: string;
  teamLead?: {
    _id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
}

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: User | null;
  teamLeads?: Array<{ _id: string; name: string; email: string }>;
}

const CALL_CENTRE_ROLES: Array<{ value: UserRole; label: string }> = [
  { value: 'cc_agent', label: 'CC Agent' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'mis_admin', label: 'MIS Admin' },
  { value: 'core_sales_head', label: 'Core Sales Head' },
  { value: 'marketing_head', label: 'Marketing Head' },
];

const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, onSuccess, user, teamLeads = [] }) => {
  const { showError, showSuccess } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    role: 'cc_agent' as UserRole,
    languageCapabilities: [] as string[],
    teamLeadId: '',
    isActive: true,
  });

  const isEditMode = !!user;

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          name: user.name || '',
          email: user.email || '',
          password: '', // Don't pre-fill password
          employeeId: user.employeeId || '',
          role: user.role || 'cc_agent',
          languageCapabilities: user.languageCapabilities || [],
          teamLeadId: user.teamLeadId?.toString() || user.teamLead?._id || '',
          isActive: user.isActive !== undefined ? user.isActive : true,
        });
      } else {
        setFormData({
          name: '',
          email: '',
          password: '',
          employeeId: '',
          role: 'cc_agent',
          languageCapabilities: [],
          teamLeadId: '',
          isActive: true,
        });
      }
    }
  }, [isOpen, user]);

  // UX: if creating a CC Agent and there is exactly one active Team Lead, preselect it
  useEffect(() => {
    if (!isOpen) return;
    if (isEditMode) return;
    if (formData.role !== 'cc_agent') return;
    if (formData.teamLeadId) return;
    if (teamLeads.length === 1) {
      setFormData((prev) => ({ ...prev, teamLeadId: teamLeads[0]._id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEditMode, formData.role, teamLeads]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      showError('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      showError('Email is required');
      return;
    }
    if (!formData.employeeId.trim()) {
      showError('Employee ID is required');
      return;
    }
    if (!isEditMode && !formData.password.trim()) {
      showError('Password is required for new users');
      return;
    }
    if (formData.role === 'cc_agent' && formData.languageCapabilities.length === 0) {
      showError('At least one language capability is required for CC Agents');
      return;
    }
    if (formData.role === 'cc_agent' && !formData.teamLeadId) {
      showError('Team Lead is required for CC Agents (needed for task allocation)');
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        employeeId: formData.employeeId.trim(),
        role: formData.role,
        languageCapabilities: formData.languageCapabilities,
        isActive: formData.isActive,
      };

      // Only include password for new users
      if (!isEditMode) {
        submitData.password = formData.password;
      }

      // Only include teamLeadId for CC Agents
      if (formData.role === 'cc_agent') {
        submitData.teamLeadId = formData.teamLeadId;
      }

      if (isEditMode && user?._id) {
        await usersAPI.updateUser(user._id, submitData);
        showSuccess('User updated successfully');
      } else {
        await usersAPI.createUser(submitData);
        showSuccess('User created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      showError(error.message || 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const showTeamLeadField = formData.role === 'cc_agent';
  const showLanguageField = formData.role === 'cc_agent';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-2xl font-black text-slate-900">
            {isEditMode ? 'Edit User' : 'Create User'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            disabled={isSubmitting}
          >
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-700 focus:outline-none"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-700 focus:outline-none"
              required
              disabled={isSubmitting || isEditMode}
            />
            {isEditMode && (
              <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
            )}
          </div>

          {/* Employee ID */}
          <div>
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
              Employee ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-700 focus:outline-none"
              required
              disabled={isSubmitting || isEditMode}
            />
            {isEditMode && (
              <p className="text-xs text-slate-500 mt-1">Employee ID cannot be changed</p>
            )}
          </div>

          {/* Password (only for new users) */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-700 focus:outline-none"
                required
                disabled={isSubmitting}
                minLength={6}
              />
              <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => {
                const newRole = e.target.value as UserRole;
                setFormData({
                  ...formData,
                  role: newRole,
                  teamLeadId: newRole !== 'cc_agent' ? '' : formData.teamLeadId,
                  languageCapabilities: newRole !== 'cc_agent' ? [] : formData.languageCapabilities,
                });
              }}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-700 focus:outline-none bg-white"
              required
              disabled={isSubmitting || isEditMode}
            >
              {CALL_CENTRE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {isEditMode && (
              <p className="text-xs text-slate-500 mt-1">Role cannot be changed</p>
            )}
          </div>

          {/* Team Lead (only for CC Agent) */}
          {showTeamLeadField && (
            <div>
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                Team Lead <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.teamLeadId}
                onChange={(e) => setFormData({ ...formData, teamLeadId: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-green-700 focus:outline-none bg-white"
                disabled={isSubmitting}
                required
              >
                <option value="">Select Team Lead</option>
                {teamLeads.map((lead) => (
                  <option key={lead._id} value={lead._id}>
                    {lead.name} ({lead.email})
                  </option>
                ))}
              </select>
              {!teamLeads.length && (
                <p className="text-xs text-amber-700 mt-1">
                  No active Team Leads found. Create a Team Lead first.
                </p>
              )}
            </div>
          )}

          {/* Language Capabilities (only for CC Agent) */}
          {showLanguageField && (
            <LanguageSelector
              selectedLanguages={formData.languageCapabilities}
              onChange={(languages) => setFormData({ ...formData, languageCapabilities: languages })}
              required={formData.role === 'cc_agent'}
              disabled={isSubmitting}
            />
          )}

          {/* Is Active */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5 text-green-700 border-slate-300 rounded focus:ring-green-700"
              disabled={isSubmitting}
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
              Active User
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-bold text-white bg-green-700 hover:bg-green-800 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 size={18} className="animate-spin" />}
              {isEditMode ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
