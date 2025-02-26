
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get error from URL if present
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');
        
        if (errorParam) {
          console.error('Auth callback error from URL:', { error: errorParam, description: errorDescription });
          throw new Error(errorDescription || 'Authentication failed');
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Auth callback session check:', { session: !!session, error });
        
        if (error) {
          console.error('Auth callback session error:', error);
          throw error;
        }
        
        if (!session) {
          console.error('No session found in callback');
          throw new Error('No session found');
        }
        
        // Log successful authentication
        console.log('Authentication successful, redirecting to dashboard');
        toast.success('Successfully signed in!');
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Auth callback error:', error);
        toast.error(error.message || 'Authentication failed');
        navigate('/auth/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A66C2] mx-auto mb-4"></div>
        <p className="text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  );
}

