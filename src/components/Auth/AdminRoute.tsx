import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { Spinner } from '@/components/ui';

import { useAuth } from '../../contexts/Auth';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }
  if (!user) {
    const returnTo = encodeURIComponent('/admin');
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }
  if (!user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
