import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import Login from './Login';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f1f5f1]">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-green-700" size={32} />
          <p className="text-sm text-slate-600 font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login page
  if (!isAuthenticated || !user) {
    return <Login />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f1f5f1]">
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-800 mb-2">Access Denied</h1>
          <p className="text-sm text-slate-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

