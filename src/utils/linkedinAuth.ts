
import { supabase } from "@/integrations/supabase/client";

export async function connectLinkedIn() {
  console.log('Initiating LinkedIn OAuth...', {
    origin: window.location.origin,
    redirectUrl: `${window.location.origin}/auth/callback`
  });
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'openid profile email',
      queryParams: {
        prompt: 'consent',
        access_type: 'offline'
      }
    }
  });

  if (error) {
    console.error('LinkedIn login error:', error);
    throw error;
  }

  console.log('LinkedIn OAuth response:', data);
  return data;
}

export async function publishToLinkedIn(postContent: string, userId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('publish-to-linkedin', {
      body: { content: postContent, userId }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error publishing to LinkedIn:', error);
    throw error;
  }
}
