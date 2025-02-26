
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Database } from '../_shared/database.types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize OpenAI (for generating image prompts)
const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

// Initialize Supabase Admin Client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

const stabilityApiKey = Deno.env.get('STABILITY_API_KEY');

async function generateImagePrompt(content: string, topic: string | null): Promise<string> {
  try {
    const prompt = `Create a simple, professional LinkedIn post image prompt about: ${topic || 'professional content'}. The post content is: ${content?.substring(0, 100)}... Keep it under 200 characters and focus on business-appropriate imagery.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
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
    return `Professional scene: ${topic || 'business meeting'}`;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!stabilityApiKey) {
      throw new Error('STABILITY_API_KEY is not configured');
    }

    const { userId, postId, postContent, topic, customPrompt } = await req.json();
    console.log('Received request:', { postId, topic, hasCustomPrompt: !!customPrompt });

    if (!userId || !postId || !postContent) {
      throw new Error('Missing required parameters');
    }

    // Generate or use custom prompt
    const imagePrompt = customPrompt || await generateImagePrompt(postContent, topic);
    console.log('Final prompt:', imagePrompt);

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
        text_prompts: [{ 
          text: imagePrompt,
          weight: 1
        }],
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
      console.error('Stability AI error response:', errorText);
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

    console.log('Successfully generated image, updating post...');

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
