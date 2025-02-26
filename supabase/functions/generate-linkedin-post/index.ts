
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, topic, tone, pov, writingSample, industry, numPosts = 1, includeNews = true } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    console.log('Generating LinkedIn posts with parameters:', {
      topic,
      tone,
      pov,
      industry,
      numPosts,
      includeNews,
      hasWritingSample: !!writingSample,
    });

    const systemPrompt = `You are a professional LinkedIn content creator. Generate engaging, authentic posts that match the user's writing style and preferences. Each post should be concise, engaging, and follow LinkedIn best practices.`;

    const userPrompt = `Generate ${numPosts} LinkedIn ${numPosts > 1 ? 'posts' : 'post'} about "${topic}" with the following specifications:
    - Tone: ${tone || 'professional'}
    - Point of View: ${pov || 'first person'}
    - Industry: ${industry || 'general'}
    - Match this writing style: ${writingSample || 'professional and engaging'}
    ${includeNews ? '- Include recent industry trends or news if relevant' : ''}
    
    Format the response as a JSON array of post objects with the following structure:
    {
      "posts": [
        {
          "content": "post content here",
          "hashtags": ["relevant", "hashtags", "here"],
          "topic": "specific topic or theme"
        }
      ]
    }`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    console.log('OpenAI response received:', data);

    const generatedContent = data.choices[0].message.content;
    console.log('Generated content:', generatedContent);

    let parsedContent;
    try {
      parsedContent = JSON.parse(generatedContent);
      
      // Validate the structure
      if (!Array.isArray(parsedContent.posts)) {
        throw new Error('Generated content does not contain a posts array');
      }

      console.log('Successfully parsed content:', parsedContent);
      
      return new Response(JSON.stringify(parsedContent), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Error parsing generated content:', parseError);
      console.log('Raw content that failed to parse:', generatedContent);
      throw new Error('Failed to parse generated content: ' + parseError.message);
    }

  } catch (error) {
    console.error('Error in generate-linkedin-post function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
