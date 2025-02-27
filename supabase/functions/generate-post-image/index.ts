
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
    const payload = await req.json();
    console.log('Received payload:', payload);

    const { postId, userId, postContent, topic, customPrompt } = payload;

    // Validate required parameters
    if (!postContent) {
      throw new Error('Post content is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!postId) {
      throw new Error('Post ID is required');
    }

    if (!stability_api_key) {
      throw new Error('Stability API key is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use custom prompt if provided, otherwise generate one based on content
    let finalPrompt = '';
    if (customPrompt?.trim()) {
      console.log('Using custom prompt:', customPrompt);
      finalPrompt = customPrompt.trim();
    } else {
      finalPrompt = generatePromptFromContent(postContent, topic);
      console.log('Generated prompt:', finalPrompt);
    }

    // Ensure the prompt is not empty
    if (!finalPrompt) {
      throw new Error('Failed to generate or receive a valid prompt');
    }

    const requestBody = {
      steps: 40,
      width: 1024,
      height: 576,
      seed: 0,
      cfg_scale: 7,
      samples: 1,
      text_prompts: [
        {
          text: finalPrompt,
          weight: 1
        }
      ],
    };

    console.log('Calling Stability API with request:', JSON.stringify(requestBody));

    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stability_api_key}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stability API error response:', errorText);
      throw new Error(`Stability API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    if (!result.artifacts?.[0]?.base64) {
      console.error('Invalid Stability API response:', result);
      throw new Error('Invalid response format from Stability API');
    }

    const base64Image = result.artifacts[0].base64;
    const imageUrl = `data:image/png;base64,${base64Image}`;
    const storage_path = `post_images/${postId}`;
    const prompt = finalPrompt;

    // Store the image data in the database
    const { error: imageError } = await supabase
      .from('post_images')
      .upsert({
        linkedin_post_id: postId,
        user_id: userId,
        image_url: imageUrl,
        custom_prompt: customPrompt?.trim(),
        prompt,
        storage_path
      })
      .single();

    if (imageError) {
      console.error('Error storing image:', imageError);
      throw imageError;
    }

    // Update the post with the image URL
    const { error: updateError } = await supabase
      .from('linkedin_posts')
      .update({
        image_url: imageUrl
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating post:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        imageUrl: imageUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
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
      }
    );
  }
});

function generatePromptFromContent(content: string, topic?: string) {
  const basePrompt = "Create a modern, professional LinkedIn-style image that's visually appealing and suitable for social media. ";
  const topicPrompt = topic ? `The image should relate to ${topic}. ` : "";
  const contentPrompt = `The image should convey the essence of this message: ${content.substring(0, 200)}...`;
  
  return (basePrompt + topicPrompt + contentPrompt).substring(0, 1000);
}
