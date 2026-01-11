import React, { useState, useEffect } from 'react';
import { Plus, Filter, Search, Users as UsersIcon, Info } from 'lucide-react';
import { usersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import UserList from './UserList';
import UserForm, { UserRole } from './UserForm';

interface User {
  _id: string;
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
  createdAt?: string;
}

const UserManagementView: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [view, setView] = useState<'users' | 'matrix'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [teamLeads, setTeamLeads] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [filters, setFilters] = useState({
    role: '' as UserRole | '',
    isActive: undefined as boolean | undefined,
    search: '',
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUserId(user._id || user.id);
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  }, []);

  const fetchUsers = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response: any = await usersAPI.getUsers({
        role: filters.role || undefined,
        isActive: filters.isActive,
        page,
        limit: pagination.limit,
      });

      if (response.success && response.data) {
        let filteredUsers = response.data.users || [];

        // Apply search filter
        if (filters.search.trim()) {
          const searchLower = filters.search.toLowerCase();
          filteredUsers = filteredUsers.filter(
            (user: User) =>
              user.name.toLowerCase().includes(searchLower) ||
              user.email.toLowerCase().includes(searchLower) ||
              user.employeeId.toLowerCase().includes(searchLower)
          );
        }

        setUsers(filteredUsers);
        setPagination({
          page: response.data.pagination?.page || page,
          limit: response.data.pagination?.limit || pagination.limit,
          total: response.data.pagination?.total || filteredUsers.length,
          pages: response.data.pagination?.pages || 1,
        });
      }
    } catch (error: any) {
      showError(error.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamLeads = async () => {
    try {
      const response: any = await usersAPI.getUsers({
        role: 'team_lead',
        isActive: true,
      });

      if (response.success && response.data) {
        setTeamLeads(
          (response.data.users || []).map((user: User) => ({
            _id: user._id,
            name: user.name,
            email: user.email,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch team leads:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters.role, filters.isActive]);

  useEffect(() => {
    fetchTeamLeads();
  }, []);

  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowUserForm(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to deactivate ${user.name}?`)) {
      return;
    }

    try {
      await usersAPI.deleteUser(user._id);
      showSuccess('User deactivated successfully');
      fetchUsers();
      fetchTeamLeads();
    } catch (error: any) {
      showError(error.message || 'Failed to deactivate user');
    }
  };

  const handleFormSuccess = () => {
    fetchUsers();
    fetchTeamLeads();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: e.target.value });
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.search.trim() || !filters.search) {
        fetchUsers(1);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters.search]);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-bold mb-1">User Management - Call Centre Employees Only</p>
          <p className="text-blue-700">
            Field Sales employees (FDA, TM, RM, ZM, BU Head, RDM) and hierarchy information are
            managed via the Activity API and used for reporting purposes.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Call Centre Users</h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage Call Centre employees and their language capabilities
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setView('users')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                view === 'users'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setView('matrix')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
                view === 'matrix'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid3x3 size={16} />
              Language Matrix
            </button>
          </div>
          {view === 'users' && (
            <button
              onClick={handleCreateUser}
              className="flex items-center gap-2 px-6 py-3 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 transition-colors"
            >
              <Plus size={20} />
              Create User
            </button>
          )}
        </div>
      </div>

      {/* Content based on view */}
      {view === 'users' ? (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or employee ID..."
                  value={filters.search}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-green-700 focus:outline-none"
                />
              </div>

              {/* Role Filter */}
              <div>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value as UserRole | '' })}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-green-700 focus:outline-none bg-white"
                >
                  <option value="">All Roles</option>
                  <option value="cc_agent">CC Agent</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="mis_admin">MIS Admin</option>
                  <option value="core_sales_head">Core Sales Head</option>
                  <option value="marketing_head">Marketing Head</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filters.isActive === undefined ? '' : filters.isActive ? 'true' : 'false'}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      isActive: e.target.value === '' ? undefined : e.target.value === 'true',
                    })
                  }
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-green-700 focus:outline-none bg-white"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* User List */}
          <UserList
            users={users}
            isLoading={isLoading}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            currentUserId={currentUserId}
          />

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-sm text-slate-600">
                Showing {users.length} of {pagination.total} users
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchUsers(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm font-medium text-slate-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => fetchUsers(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <AgentLanguageMatrix />
      )}

      {/* User Form Modal */}
      <UserForm
        isOpen={showUserForm}
        onClose={() => setShowUserForm(false)}
        onSuccess={handleFormSuccess}
        user={selectedUser}
        teamLeads={teamLeads}
      />
    </div>
  );
};

export default UserManagementView;
