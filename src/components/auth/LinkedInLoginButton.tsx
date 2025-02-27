
import { Button } from "@/components/ui/button";
import { connectLinkedIn, disconnectLinkedIn } from "@/utils/linkedinAuth";
import { LinkedinIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function LinkedInLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth state changes from the popup window
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('LinkedIn auth state changed:', { event, session });
      
      if (event === 'SIGNED_IN' && session) {
        const provider = session.user?.app_metadata?.provider;
        if (provider === 'linkedin_oidc') {
          toast.success('Successfully connected with LinkedIn!');
          navigate('/dashboard');
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      } else if (event === 'SIGNED_OUT') {
        // Only navigate to home if we actually have a user signing out
        if (user) {
          navigate('/');
        }
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [navigate, user]);

  const handleLinkedInLogin = async () => {
    try {
      setIsLoading(true);
      await connectLinkedIn();
    } catch (error: any) {
      console.error('LinkedIn login error:', error);
      toast.error(error.message || 'Failed to connect with LinkedIn');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full flex items-center justify-center gap-2 border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white"
      onClick={handleLinkedInLogin}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <LinkedinIcon className="h-5 w-5" />
      )}
      Sign in with LinkedIn
    </Button>
  );
}

