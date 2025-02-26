
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { Configuration, OpenAIApi } from "openai";
import { createSystemPrompt, createUserPrompt } from "./prompts.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, tone, pov, industry, numPosts = 1, recentNews = [] } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    console.log('Generating LinkedIn post with parameters:', {
      topic,
      tone,
      pov,
      industry,
      numPosts,
      hasRecentNews: recentNews.length > 0
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: new Headers({
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: createSystemPrompt() },
          { role: 'user', content: createUserPrompt(topic, tone, pov, industry, numPosts, recentNews) }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Successfully generated content:', generatedContent.substring(0, 100) + '...');

    try {
      const parsedContent = JSON.parse(generatedContent);
      return new Response(JSON.stringify(parsedContent), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Error parsing generated content:', parseError);
      console.log('Raw content:', generatedContent);
      throw new Error('Failed to parse generated content');
    }

  } catch (error) {
    console.error('Error in generate-linkedin-post function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
