import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  redirectTo?: string;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  redirectTo,
  children
}) => {
  const { currentUser, role, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8 bg-[#faf8f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-[#701a28] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-stone-600">Verifying security session...</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !currentUser) {
    const fallbackRedirect = redirectTo || (
      allowedRoles?.includes('admin') ? '/admin/login' :
      allowedRoles?.includes('priest') ? '/priest/login' :
      '/login'
    );
    return <Navigate to={fallbackRedirect} state={{ from: location }} replace />;
  }

  // Role gatekeeping check
  if (allowedRoles && allowedRoles.length > 0) {
    const currentRole = role || currentUser.role;
    const hasRole = currentRole && allowedRoles.includes(currentRole);

    if (!hasRole) {
      // If user lacks admin permissions
      if (allowedRoles.includes('admin')) {
        return (
          <Navigate
            to="/admin/login"
            state={{ from: location, unauthorized: true, reason: 'Super Admin privileges required.' }}
            replace
          />
        );
      }
      // If user lacks priest permissions
      if (allowedRoles.includes('priest')) {
        return (
          <Navigate
            to="/priest/login"
            state={{ from: location, unauthorized: true, reason: 'Acharya portal access required.' }}
            replace
          />
        );
      }
      // General role mismatch
      return <Navigate to="/home" state={{ from: location, unauthorized: true }} replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};
