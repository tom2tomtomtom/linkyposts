
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Database } from '../_shared/database.types.ts';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
const stabilityApiKey = Deno.env.get('STABILITY_API_KEY');

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

async function generateImagePrompt(topic: string | null, postContent: string): Promise<string> {
  try {
    console.log('Generating image prompt for:', { topic, postContent: postContent.substring(0, 100) });
    
    const prompt = `Create a simple, professional LinkedIn post image prompt about: ${topic || 'professional content'}. The post content is: ${postContent?.substring(0, 100)}... Keep it under 200 characters and focus on business-appropriate imagery.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'Create simple, clear image prompts for professional LinkedIn posts. Focus on business-appropriate imagery.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.5,
    });

    const imagePrompt = completion.choices[0]?.message?.content?.trim() || 
      `Professional business visualization: ${topic || 'business meeting'}`;
    
    console.log('Generated image prompt:', imagePrompt);
    return imagePrompt;
  } catch (error) {
    console.error('Error generating image prompt:', error);
    throw new Error(`Failed to generate image prompt: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!stabilityApiKey) {
      throw new Error('STABILITY_API_KEY is not configured');
    }

    // Parse request body
    const { postId, topic, userId } = await req.json();
    console.log('Received request with:', { postId, topic, userId });

    if (!postId) {
      throw new Error('postId is required');
    }

    if (!userId) {
      throw new Error('userId is required');
    }

    // Fetch post content
    const { data: post, error: postError } = await supabase
      .from('linkedin_posts')
      .select('content')
      .eq('id', postId)
      .eq('user_id', userId)
      .single();

    if (postError) {
      console.error('Error fetching post:', postError);
      throw new Error(`Failed to fetch post content: ${postError.message}`);
    }

    if (!post?.content) {
      throw new Error('Post content not found');
    }

    // Generate image prompt
    const imagePrompt = await generateImagePrompt(topic, post.content);
    console.log('Using image prompt:', imagePrompt);

    // Request image generation from Stability AI
    console.log('Requesting image generation from Stability AI...');
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${stabilityApiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [{ text: imagePrompt, weight: 1 }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30,
        style_preset: "photographic"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stability AI error:', { status: response.status, body: errorText });
      throw new Error(`Stability AI error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('Received response from Stability AI');

    if (!responseData.artifacts?.[0]?.base64) {
      console.error('Invalid response format from Stability AI:', responseData);
      throw new Error('Invalid response format from Stability AI');
    }

    const base64Image = responseData.artifacts[0].base64;
    const imageUrl = `data:image/png;base64,${base64Image}`;

    console.log('Saving image to post_images table...');

    // Save to post_images table
    const { error: insertError } = await supabase
      .from('post_images')
      .upsert({
        linkedin_post_id: postId,
        image_url: imageUrl,
        prompt: imagePrompt,
        user_id: userId,
        storage_path: `post-images/${postId}.png`
      });

    if (insertError) {
      console.error('Error saving image:', insertError);
      throw new Error(`Failed to save image to database: ${insertError.message}`);
    }

    console.log('Successfully completed image generation process');
    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl,
        prompt: imagePrompt 
      }),
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
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
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
