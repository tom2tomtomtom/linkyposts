
import { Button } from "@/components/ui/button";
import { connectLinkedIn } from "@/utils/linkedinAuth";
import { LinkedinIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function LinkedInLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth state changes from the popup window
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('LinkedIn auth state changed:', { event, session });
        toast.success('Successfully connected with LinkedIn!');
        navigate('/dashboard');
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [navigate]);

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
