
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
      scopes: 'openid profile email w_member_social', // Added w_member_social scope for posting
      queryParams: {
        prompt: 'consent',
        access_type: 'offline',
        response_type: 'code',
      },
      skipBrowserRedirect: true
    }
  });

  if (error) {
    console.error('LinkedIn login error:', error);
    throw error;
  }

  if (data?.url) {
    // Open the authorization URL in a popup window
    const width = 600;
    const height = 600;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;
    
    window.open(
      data.url,
      'LinkedIn Login',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
    );
  }
  
  console.log('LinkedIn OAuth response:', data);
  return data;
}

export async function refreshLinkedInToken(userId: string) {
  try {
    const { data: existingToken, error: fetchError } = await supabase
      .from('linkedin_auth_tokens')
      .select('refresh_token')
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingToken?.refresh_token) {
      throw new Error('No refresh token found');
    }

    // The token refresh will be handled by Supabase automatically
    // This is just to check if we have a valid refresh token
    return true;
  } catch (error) {
    console.error('Error refreshing LinkedIn token:', error);
    throw error;
  }
}

export async function publishToLinkedIn(postContent: string, userId: string) {
  try {
    // Try to refresh the token first
    await refreshLinkedInToken(userId);
    
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
