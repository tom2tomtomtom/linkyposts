
import { supabase } from "@/integrations/supabase/client";

export async function connectLinkedIn() {
  console.log('Initiating LinkedIn OAuth...', {
    origin: window.location.origin,
    redirectUrl: `${window.location.origin}/auth/callback`
  });
  
  try {
    // First check if user already has a valid token
    const { data: existingToken } = await supabase
      .from('linkedin_auth_tokens')
      .select('*')
      .maybeSingle();

    if (existingToken && new Date(existingToken.expires_at) > new Date()) {
      console.log('Found valid LinkedIn token, no need to reconnect');
      return { url: null, token: existingToken };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'openid profile email w_member_social r_basicprofile r_liteprofile',
        queryParams: {
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
  } catch (error) {
    console.error('Error in connectLinkedIn:', error);
    throw error;
  }
}

export async function refreshLinkedInToken(userId: string) {
  try {
    // First try to get existing token
    const { data: existingToken, error: tokenError } = await supabase
      .from('linkedin_auth_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (tokenError) throw tokenError;

    // If token exists and is still valid, return it
    if (existingToken && new Date(existingToken.expires_at) > new Date()) {
      return existingToken;
    }

    // Otherwise, refresh the session
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) throw refreshError;
    if (!session) throw new Error('No session found after refresh');

    // Get the LinkedIn member ID if not already stored
    let linkedinUserId = existingToken?.linkedin_user_id;
    if (!linkedinUserId) {
      try {
        const response = await fetch('https://api.linkedin.com/v2/me', {
          headers: {
            'Authorization': `Bearer ${session.provider_token}`,
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch LinkedIn profile');
        const profile = await response.json();
        linkedinUserId = profile.id;
      } catch (error) {
        console.error('Error fetching LinkedIn profile:', error);
        throw error;
      }
    }

    // After successful refresh, update the token in our database
    const newToken = {
      user_id: userId,
      access_token: session.provider_token,
      linkedin_user_id: linkedinUserId,
      expires_at: new Date(Date.now() + (session.expires_in || 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('linkedin_auth_tokens')
      .upsert(newToken);

    if (updateError) throw updateError;
    
    return newToken;
  } catch (error) {
    console.error('Error refreshing LinkedIn token:', error);
    throw error;
  }
}

export async function publishToLinkedIn(postContent: string, userId: string) {
  try {
    // First try to get or refresh token
    const token = await refreshLinkedInToken(userId);
    if (!token?.access_token) {
      throw new Error('No valid LinkedIn token found');
    }

    // Now make the actual publish request using the edge function
    const { data, error } = await supabase.functions.invoke('publish-to-linkedin', {
      body: { 
        content: postContent, 
        userId,
        linkedinUserId: token.linkedin_user_id 
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error publishing to LinkedIn:', error);
    throw error;
  }
}

