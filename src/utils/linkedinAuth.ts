
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
      scopes: 'openid profile email w_member_social',
      queryParams: {
        prompt: 'consent',
        access_type: 'offline'
      },
      skipBrowserRedirect: true
    }
  });

  if (error) {
    console.error('LinkedIn login error:', error);
    throw error;
  }

  if (data?.url) {
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
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) throw refreshError;
    if (!session) throw new Error('No session found after refresh');

    // After successful refresh, update the token in our database
    const { error: updateError } = await supabase
      .from('linkedin_auth_tokens')
      .update({ 
        access_token: session.provider_token,
        expires_at: new Date(Date.now() + (session.expires_in || 3600) * 1000).toISOString()
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;
    
    return session.provider_token;
  } catch (error) {
    console.error('Error refreshing LinkedIn token:', error);
    throw error;
  }
}

export async function publishToLinkedIn(postContent: string, userId: string) {
  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from('linkedin_auth_tokens')
      .select('access_token, expires_at')
      .eq('user_id', userId)
      .single();

    if (tokenError) throw tokenError;

    // Check if token exists and is expired
    if (!tokenData?.access_token || (tokenData.expires_at && new Date(tokenData.expires_at) <= new Date())) {
      // Try to refresh the token
      await refreshLinkedInToken(userId);
    }

    // Now make the actual publish request
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
