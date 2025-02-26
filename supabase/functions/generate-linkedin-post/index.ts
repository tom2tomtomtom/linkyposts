
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GeneratePostRequest } from './types.ts';
import { fetchRelevantNews } from './news.ts';
import { createSystemPrompt, createUserPrompt } from './prompts.ts';
import { generateContent } from './openai.ts';
import { saveGeneratedContent, saveLinkedInPosts } from './database.ts';

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
    // Get environment variables
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse request body
    const { 
      userId, 
      topic, 
      tone, 
      pov, 
      writingSample, 
      industry = 'technology',
      numPosts = 3,
      includeNews = false
    } = await req.json() as GeneratePostRequest;

    // Validate required parameters
    if (!userId || !topic || !tone || !pov) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch relevant news articles if requested
    const recentNews = includeNews ? await fetchRelevantNews(supabase, topic, industry) : [];

    // Create prompts
    const systemPrompt = createSystemPrompt();
    const userPrompt = createUserPrompt(topic, tone, pov, industry, numPosts, recentNews, writingSample);

    // Generate content using OpenAI
    const aiResponse = await generateContent(openAIApiKey, systemPrompt, userPrompt);

    // Save generated content to database
    const generatedContentId = await saveGeneratedContent(
      supabase,
      userId,
      topic,
      tone,
      pov,
      writingSample,
      aiResponse
    );

    // Save LinkedIn posts
    await saveLinkedInPosts(supabase, userId, generatedContentId, aiResponse.posts);

    // Return the successful response
    return new Response(
      JSON.stringify({
        posts: aiResponse.posts,
        styleAnalysis: aiResponse.styleAnalysis,
        generatedContentId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-linkedin-post function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
