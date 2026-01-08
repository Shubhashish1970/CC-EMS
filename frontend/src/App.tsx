import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AgentWorkspace from './components/AgentWorkspace';
import TaskList from './components/TaskList';
import AdminDashboardContainer from './components/AdminDashboard/AdminDashboardContainer';

// Component that routes based on user role
const AppContent: React.FC = () => {
  const { user } = useAuth();

  // CC Agents see Agent Workspace
  if (user?.role === 'cc_agent') {
    return <AgentWorkspace />;
  }

  // MIS Admin sees Admin Dashboard
  if (user?.role === 'mis_admin') {
    return <AdminDashboardContainer />;
  }

  // Team Leads see Task Management
  if (user?.role === 'team_lead') {
    return <TaskList />;
  }

  // Other roles (Sales Head, Marketing Head) - for now show Task List
  return <TaskList />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <ProtectedRoute>
          <AppContent />
        </ProtectedRoute>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
