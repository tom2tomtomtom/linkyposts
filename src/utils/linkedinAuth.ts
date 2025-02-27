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
    if (!userId) {
      throw new Error('User ID is required to refresh token');
    }

    // First, verify if we have LinkedIn tokens for this user
    const { data: linkedInTokens, error: fetchError } = await supabase
      .from('linkedin_auth_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !linkedInTokens) {
      console.log('No LinkedIn tokens found, initiating new connection');
      throw new Error('No LinkedIn connection found');
    }

    // Get the current session to check if we need to refresh
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      throw new Error('Authentication session not found');
    }

    // Check if the session needs refresh
    const provider = session.user?.app_metadata?.provider;
    if (provider !== 'linkedin_oidc') {
      throw new Error('User is not authenticated with LinkedIn');
    }

    // Return true if we have valid tokens
    return true;
  } catch (error) {
    console.error('Error refreshing LinkedIn token:', error);
    throw error;
  }
}

export async function disconnectLinkedIn(userId: string) {
  if (!userId) return;
  
  try {
    // Remove LinkedIn tokens
    const { error } = await supabase
      .from('linkedin_auth_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    
    // Sign out from Supabase/LinkedIn
    await supabase.auth.signOut();
    
    return true;
  } catch (error) {
    console.error('Error disconnecting LinkedIn:', error);
    throw error;
  }
}

export async function publishToLinkedIn(postContent: string, userId: string) {
  try {
    // Verify LinkedIn connection before attempting to publish
    const isValid = await refreshLinkedInToken(userId);
    
    if (!isValid) {
      throw new Error('LinkedIn connection invalid or expired');
    }
    
    const { data, error } = await supabase.functions.invoke('linkedin-publish', {
      body: { 
        content: postContent, 
        userId 
      }
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error publishing to LinkedIn:', error);
    
    // Check if the error is related to token revocation
    if (error.message?.includes('REVOKED_ACCESS_TOKEN') || 
        error.message?.includes('expired') || 
        error.message?.includes('No LinkedIn connection')) {
      throw new Error('Your LinkedIn connection has expired. Please reconnect your account');
    }
    
    throw error;
  }
}
