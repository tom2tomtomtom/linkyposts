
import { supabase } from "@/integrations/supabase/client";

export async function connectLinkedIn() {
  try {
    console.log('Initiating LinkedIn OAuth...', {
      origin: window.location.origin,
      redirectUrl: `${window.location.origin}/auth/callback`
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        scopes: 'openid profile email w_member_social',
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    console.log('LinkedIn OAuth response:', { provider: data?.provider, url: data?.url });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('LinkedIn OAuth error:', error);
    throw error;
  }
}

export async function publishToLinkedIn(content: string, userId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('publish-to-linkedin', {
      body: { content, userId }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error publishing to LinkedIn:', error);
    throw error;
  }
}
