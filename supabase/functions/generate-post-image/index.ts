
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
const stabilityApiKey = Deno.env.get('STABILITY_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function generateImagePrompt(topic: string | null, postContent: string): Promise<string> {
  try {
    console.log('Generating image prompt for:', { topic, postContent: postContent.substring(0, 100) });
    
    const prompt = `Create a simple, professional LinkedIn post image prompt about: ${topic || 'professional content'}. The post content is: ${postContent?.substring(0, 100)}... Keep it under 200 characters and focus on business-appropriate imagery.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
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

async function uploadImageToStorage(base64Image: string, filePath: string): Promise<string> {
  try {
    // Convert base64 to Uint8Array
    const base64Data = base64Image.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create storage bucket if it doesn't exist
    const { data: bucketData, error: bucketError } = await supabase
      .storage
      .createBucket('post-images', { public: true });

    if (bucketError && !bucketError.message.includes('already exists')) {
      throw bucketError;
    }

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('post-images')
      .upload(filePath, bytes, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: publicUrlData } = await supabase
      .storage
      .from('post-images')
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image');
    }

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading to storage:', error);
    throw new Error(`Failed to upload image to storage: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { postId, topic, userId, postContent } = await req.json();
    console.log('Received request with:', { postId, topic, userId, postContent: postContent?.substring(0, 100) });

    if (!postId || !userId) {
      throw new Error('postId and userId are required');
    }

    if (!postContent) {
      throw new Error('postContent is required');
    }

    // Generate image prompt
    const imagePrompt = await generateImagePrompt(topic, postContent);
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
    const storagePath = `${postId}.png`;
    
    // Upload image to storage and get public URL
    console.log('Uploading image to storage...');
    const imageUrl = await uploadImageToStorage(
      `data:image/png;base64,${base64Image}`, 
      storagePath
    );

    console.log('Image uploaded successfully, saving to database...');

    // Save to post_images table
    const { error: insertError } = await supabase
      .from('post_images')
      .insert({
        linkedin_post_id: postId,
        image_url: imageUrl,
        prompt: imagePrompt,
        user_id: userId,
        storage_path: `post-images/${storagePath}`
      });

    if (insertError) {
      console.error('Error saving to post_images:', insertError);
      throw new Error(`Failed to save to post_images: ${insertError.message}`);
    }

    // Update linkedin_posts table
    const { error: updateError } = await supabase
      .from('linkedin_posts')
      .update({ image_url: imageUrl })
      .eq('id', postId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating linkedin_posts:', updateError);
      console.log('Warning: Failed to update linkedin_posts but image was saved');
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
