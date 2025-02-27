
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Log the full URL for debugging
        console.log('Auth callback triggered', {
          fullUrl: window.location.href,
          search: window.location.search,
          hash: window.location.hash,
          hostname: window.location.hostname
        });
        
        // Get error from URL if present
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');
        
        if (errorParam) {
          console.error('Auth callback error from URL:', { error: errorParam, description: errorDescription });
          throw new Error(errorDescription || 'Authentication failed');
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Auth callback session check:', { 
          hasSession: !!session, 
          error,
          userId: session?.user?.id,
          accessToken: !!session?.access_token,
          provider: session?.user?.app_metadata?.provider,
          hostname: window.location.hostname
        });
        
        if (error) {
          console.error('Auth callback session error:', error);
          throw error;
        }
        
        if (!session) {
          console.error('No session found in callback');
          throw new Error('No session found');
        }
        
        // Close popup window if we're in one
        if (window.opener) {
          window.opener.postMessage({ type: 'LINKEDIN_AUTH_SUCCESS' }, '*');
          window.close();
        } else {
          // Log successful authentication
          console.log('Authentication successful, redirecting to dashboard');
          toast.success('Successfully signed in!');
          navigate('/dashboard');
        }
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
