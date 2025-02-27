
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const stability_api_key = Deno.env.get('STABILITY_API_KEY');
const supabase_url = Deno.env.get('SUPABASE_URL');
const supabase_service_role = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId, userId, postContent, topic, customPrompt } = await req.json();

    // Validate required parameters
    if (!postContent) {
      throw new Error('postContent is required');
    }

    if (!userId) {
      throw new Error('userId is required');
    }

    if (!postId) {
      throw new Error('postId is required');
    }

    if (!stability_api_key) {
      throw new Error('STABILITY_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(
      supabase_url!,
      supabase_service_role!
    );

    // Use custom prompt if provided, otherwise generate one based on content
    const prompt = customPrompt?.trim() || generatePromptFromContent(postContent, topic);

    console.log('Using prompt:', prompt);
    
    // Prepare request body for Stability API
    const requestBody = {
      steps: 40,
      width: 1024,
      height: 576,
      seed: 0,
      cfg_scale: 7,
      samples: 1,
      text_prompts: [
        {
          text: prompt,
          weight: 1
        }
      ],
    };

    console.log('Stability API request body:', JSON.stringify(requestBody));

    // Call Stability API
    const response = await fetch(
      "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stability_api_key}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Log the response status and any error message
    console.log('Stability API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stability API error response:', errorText);
      throw new Error(`Stability API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.artifacts?.[0]?.base64) {
      console.error('Unexpected Stability API response format:', result);
      throw new Error('Invalid response format from Stability API');
    }

    const base64Image = result.artifacts[0].base64;
    
    // Store image in post_images table
    const { data: imageData, error: imageError } = await supabase
      .from('post_images')
      .insert({
        linkedin_post_id: postId,
        user_id: userId,
        prompt: prompt,
        custom_prompt: customPrompt || null,
        image_url: `data:image/png;base64,${base64Image}`,
        storage_path: `posts/${postId}/image.png`
      })
      .select()
      .single();

    if (imageError) {
      console.error('Error storing image data:', imageError);
      throw imageError;
    }

    // Update the linkedin_posts table with the image URL
    const { error: updateError } = await supabase
      .from('linkedin_posts')
      .update({ 
        image_url: imageData.image_url,
        custom_prompt: customPrompt || null
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating post with image URL:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: imageData.image_url,
        prompt: prompt
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in generate-post-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

function generatePromptFromContent(content: string, topic?: string): string {
  const basePrompt = "Create a professional LinkedIn post image that is modern, clean, and business-appropriate. ";
  const topicPrompt = topic ? `The image should relate to ${topic}. ` : "";
  const contentPrompt = `The image should convey the essence of this message: ${content.substring(0, 200)}...`;
  
  const fullPrompt = basePrompt + topicPrompt + contentPrompt;
  // Ensure the prompt isn't too long for the API
  return fullPrompt.substring(0, 1000);
}
