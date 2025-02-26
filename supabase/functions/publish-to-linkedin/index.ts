
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { content, userId } = await req.json()
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get LinkedIn token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('linkedin_auth_tokens')
      .select('access_token, expires_at')
      .eq('user_id', userId)
      .single()

    if (tokenError || !tokenData) {
      throw new Error('LinkedIn token not found')
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) <= new Date()) {
      throw new Error('LinkedIn token expired')
    }

    console.log('Publishing to LinkedIn with token:', { userId, hasToken: !!tokenData.access_token });

    // Post to LinkedIn
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('LinkedIn API error:', errorData);
      throw new Error(`LinkedIn API error: ${JSON.stringify(errorData)}`)
    }

    const linkedinResponse = await response.json()
    console.log('LinkedIn post created:', linkedinResponse);

    return new Response(
      JSON.stringify({ success: true, postId: linkedinResponse.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in publish-to-linkedin function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
