
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize OpenAI (still needed for generating image prompts)
const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

// Initialize Supabase Admin Client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const stabilityApiKey = Deno.env.get('STABILITY_API_KEY');

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, postId, postContent, topic, customPrompt } = await req.json();

    if (!userId || !postId || !postContent) {
      throw new Error('Missing required parameters');
    }

    console.log('Generating image for post:', { postId, topic });

    // Generate image prompt if not provided
    let imagePrompt = customPrompt;
    if (!imagePrompt) {
      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating image generation prompts. Create detailed, vivid image prompts that will work well for professional LinkedIn posts.'
          },
          {
            role: 'user',
            content: `Create a detailed image prompt for a professional LinkedIn post about "${topic}". The image should be visually appealing and relevant to the post content. Post content: "${postContent.substring(0, 500)}..."`
          }
        ],
        temperature: 0.7,
      });

      imagePrompt = chatCompletion.choices[0]?.message?.content?.trim() || `Professional image related to ${topic}`;
      console.log('Generated image prompt:', imagePrompt);
    }

    // Generate image with Stability AI
    console.log('Requesting image generation from Stability AI with prompt:', imagePrompt);
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${stabilityApiKey}`,
      },
      body: JSON.stringify({
        text_prompts: [{ text: imagePrompt }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Stability AI error:', error);
      throw new Error(`Failed to generate image: ${error}`);
    }

    const responseData = await response.json();
    const base64Image = responseData.artifacts[0].base64;
    const imageUrl = `data:image/png;base64,${base64Image}`;

    console.log('Image generated successfully');

    // Save image metadata
    const { error: dbError } = await supabase
      .from('post_images')
      .insert({
        linkedin_post_id: postId,
        user_id: userId,
        image_url: imageUrl,
        prompt: imagePrompt,
        storage_path: `${userId}/${postId}_${Date.now()}.jpg`
      });

    if (dbError) {
      console.error('Error saving image metadata:', dbError);
      throw dbError;
    }

    // Update post with image URL
    const { error: updateError } = await supabase
      .from('linkedin_posts')
      .update({ image_url: imageUrl })
      .eq('id', postId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating post with image URL:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, imageUrl, prompt: imagePrompt }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in generate-post-image function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
