
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const stability_api_key = Deno.env.get('STABILITY_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { postId, userId, postContent, customPrompt, topic } = await req.json();

    if (!stability_api_key) {
      throw new Error('Missing Stability API key');
    }

    if (!postId || !userId) {
      throw new Error('Missing required parameters');
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate the prompt for the image
    const finalPrompt = customPrompt?.trim() || await generateImagePrompt(postContent, topic);
    console.log('Using prompt:', finalPrompt);

    // Call Stability API to generate the image
    const stability_response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${stability_api_key}`,
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: finalPrompt,
            weight: 1,
          },
        ],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30,
      }),
    });

    if (!stability_response.ok) {
      let error_message = 'Failed to generate image';
      try {
        const error_data = await stability_response.json();
        error_message = error_data.message || error_message;
      } catch (e) {
        console.error('Error parsing stability API error response:', e);
      }
      throw new Error(error_message);
    }

    const result = await stability_response.json();

    if (!result.artifacts?.[0]?.base64) {
      throw new Error('No image data received from Stability AI');
    }

    // Convert base64 to Uint8Array for storage
    const base64Image = result.artifacts[0].base64;
    const byteString = atob(base64Image);
    const byteNumbers = new Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteNumbers[i] = byteString.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    // Upload image to Supabase Storage
    const fileExt = 'png';
    const fileName = `${postId}_${Date.now()}.${fileExt}`;
    const filePath = `post-images/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(filePath, byteArray, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload image to storage');
    }

    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath);

    // Store the image metadata in the database
    const { error: imageError } = await supabase
      .from('post_images')
      .insert({
        linkedin_post_id: postId,
        user_id: userId,
        image_url: publicUrl,
        custom_prompt: customPrompt?.trim(),
        prompt: finalPrompt,
        storage_path: filePath
      })
      .single();

    if (imageError) {
      console.error('Database insert error:', imageError);
      throw new Error('Failed to save image metadata');
    }

    // Update the post with the new image URL
    const { error: postUpdateError } = await supabase
      .from('linkedin_posts')
      .update({ image_url: publicUrl })
      .eq('id', postId);

    if (postUpdateError) {
      console.error('Post update error:', postUpdateError);
      throw new Error('Failed to update post with image URL');
    }

    return new Response(
      JSON.stringify({
        imageUrl: publicUrl,
        message: 'Image generated and stored successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-post-image function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function generateImagePrompt(postContent: string, topic?: string): Promise<string> {
  let basePrompt = "Create a professional, modern, high-quality image suitable for LinkedIn, ";
  let topicPrompt = topic ? `related to ${topic}, ` : "";
  let contentPrompt = `that represents the following post: ${postContent}`;
  
  return (basePrompt + topicPrompt + contentPrompt).substring(0, 1000);
}
