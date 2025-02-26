
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback triggered', {
          fullUrl: window.location.href,
          search: window.location.search,
          hash: window.location.hash
        });
        
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
          providerToken: !!session?.provider_token
        });
        
        if (error) {
          console.error('Auth callback session error:', error);
          throw error;
        }
        
        if (!session) {
          console.error('No session found in callback');
          throw new Error('No session found');
        }

        // Store LinkedIn token if this is a LinkedIn login
        if (session.provider_token && session.user?.app_metadata?.provider === 'linkedin_oidc') {
          const { error: tokenError } = await supabase
            .from('linkedin_auth_tokens')
            .upsert({
              user_id: session.user.id,
              access_token: session.provider_token,
              expires_at: new Date(Date.now() + (session.expires_in || 3600) * 1000).toISOString()
            });

          if (tokenError) {
            console.error('Error storing LinkedIn token:', tokenError);
          }
        }
        
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
