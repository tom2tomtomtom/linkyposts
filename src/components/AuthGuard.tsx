
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth/login', { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return user ? <>{children}</> : null;
}
