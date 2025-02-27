
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { linkedInPostId, generateImage, imagePrompt } = await req.json()

    // Get the post content from the database
    const { data: post, error: postError } = await supabaseClient
      .from('linkedin_posts')
      .select('*')
      .eq('id', linkedInPostId)
      .single()

    if (postError) {
      throw new Error('Post not found')
    }

    // Get the user's LinkedIn credentials
    const { data: credentials, error: credentialsError } = await supabaseClient
      .from('linkedin_auth_tokens')
      .select('*')
      .eq('user_id', post.user_id)
      .single()

    if (credentialsError || !credentials?.access_token) {
      throw new Error('LinkedIn credentials not found. Please reconnect your LinkedIn account.')
    }

    // First validate the access token
    const validateResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
      },
    });

    if (!validateResponse.ok) {
      console.error('Token validation failed:', await validateResponse.text());
      
      // Clean up invalid token
      await supabaseClient
        .from('linkedin_auth_tokens')
        .delete()
        .eq('user_id', post.user_id);
        
      throw new Error('Your LinkedIn connection has expired. Please reconnect your account.');
    }

    // If we have an image to handle
    let imageUrl = post.image_url
    if (generateImage && !imageUrl && imagePrompt) {
      // Call image generation function
      const imageResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-post-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: imagePrompt })
        }
      )

      if (!imageResponse.ok) {
        console.error('Failed to generate image:', await imageResponse.text())
        // Continue without image if generation fails
      } else {
        const imageData = await imageResponse.json()
        imageUrl = imageData.url
      }
    }

    // Prepare LinkedIn share content
    const shareContent: any = {
      author: `urn:li:person:${credentials.linkedin_user_id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: post.content
          },
          shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    }

    // If we have an image, register it with LinkedIn
    if (imageUrl) {
      try {
        const registerImageResponse = await fetch(
          'https://api.linkedin.com/v2/assets?action=registerUpload',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${credentials.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              registerUploadRequest: {
                recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                owner: `urn:li:person:${credentials.linkedin_user_id}`,
                serviceRelationships: [
                  {
                    relationshipType: 'OWNER',
                    identifier: 'urn:li:userGeneratedContent'
                  }
                ]
              }
            })
          }
        )

        if (!registerImageResponse.ok) {
          const errorText = await registerImageResponse.text()
          console.error('Failed to register image with LinkedIn:', errorText)
          throw new Error('Failed to register image with LinkedIn')
        }

        const { value: { uploadMechanism, asset } } = await registerImageResponse.json()

        // Upload the image to LinkedIn
        const imageBuffer = await fetch(imageUrl).then(res => res.arrayBuffer())
        const uploadResponse = await fetch(
          uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${credentials.access_token}`,
            },
            body: imageBuffer
          }
        )

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          console.error('Failed to upload image to LinkedIn:', errorText)
          throw new Error('Failed to upload image to LinkedIn')
        }

        // Add the image to the share content
        shareContent.specificContent['com.linkedin.ugc.ShareContent'].media = [{
          status: 'READY',
          description: {
            text: 'Generated image for LinkedIn post'
          },
          media: asset,
          title: {
            text: 'Post image'
          }
        }]
      } catch (error) {
        console.error('Error handling image:', error)
        // Continue without image if there's an error
      }
    }

    // Create the LinkedIn post
    const shareResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(shareContent)
    })

    if (!shareResponse.ok) {
      const errorText = await shareResponse.text()
      console.error('LinkedIn API error:', errorText)
      
      if (shareResponse.status === 401) {
        // Clean up invalid token
        await supabaseClient
          .from('linkedin_auth_tokens')
          .delete()
          .eq('user_id', post.user_id);
          
        throw new Error('Your LinkedIn connection has expired. Please reconnect your account.')
      }
      
      throw new Error('Failed to publish to LinkedIn')
    }

    const shareData = await shareResponse.json()

    // Update post in database
    const { error: updateError } = await supabaseClient
      .from('linkedin_posts')
      .update({
        linkedin_post_id: shareData.id,
        published_at: new Date().toISOString(),
        image_url: imageUrl
      })
      .eq('id', linkedInPostId)

    if (updateError) {
      console.error('Failed to update post:', updateError)
    }

    // Construct LinkedIn post URL
    const postUrl = `https://www.linkedin.com/feed/update/${shareData.id}`

    return new Response(
      JSON.stringify({ 
        success: true, 
        postId: shareData.id,
        postUrl
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error publishing to LinkedIn:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
