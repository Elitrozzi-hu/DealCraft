import { createContext, type ReactNode, useCallback, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface User {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  isAdmin?: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  getMe: () => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  getMe: async () => {},
  refresh: async () => {},
  logout: async () => {},
});

async function fetchMe(): Promise<User> {
  const res = await fetch('/api/auth/me');
  if (!res.ok) throw new Error('Unauthenticated');
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user = null, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const getMe = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ['auth', 'me'] });
  }, [queryClient]);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!res.ok) throw new Error('Refresh failed');
    await queryClient.refetchQueries({ queryKey: ['auth', 'me'] });
  }, [queryClient]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    queryClient.setQueryData(['auth', 'me'], null);
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, isLoading, getMe, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
