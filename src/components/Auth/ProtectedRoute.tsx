import { type ReactNode } from 'react';

import { Spinner } from '@/components/ui';

import { useAuth } from '../../contexts/Auth';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }
  if (!user) {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?returnTo=${returnTo}`;
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
