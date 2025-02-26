
import { supabase } from "@/integrations/supabase/client";

export async function connectLinkedIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: {
      scopes: 'profile email w_member_social',
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (error) {
    console.error('LinkedIn login error:', error);
    throw error;
  }

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
