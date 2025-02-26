
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const STABILITY_API_KEY = Deno.env.get('STABILITY_API_KEY');
const STABILITY_API_URL = 'https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image';

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, postId } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Invalid prompt provided');
    }

    if (!STABILITY_API_KEY) {
      throw new Error('Stability API key not configured');
    }

    console.log('Generating image with prompt:', prompt);

    // Make request to Stability AI API
    const response = await fetch(STABILITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${STABILITY_API_KEY}`,
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt }],
        cfg_scale: 7,
        steps: 30,
        width: 1024,
        height: 1024,
        samples: 1,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Stability AI API error:', error);
      throw new Error(`Stability AI API error: ${error.message || 'Unknown error'}`);
    }

    const result = await response.json();
    
    if (!result.artifacts?.[0]?.base64) {
      throw new Error('No image generated');
    }

    // Convert base64 to URL
    const imageUrl = `data:image/png;base64,${result.artifacts[0].base64}`;
    console.log('Successfully generated image, updating post...');

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
