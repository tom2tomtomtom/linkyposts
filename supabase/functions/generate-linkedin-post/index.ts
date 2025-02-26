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

interface Source {
  title: string;
  url: string;
  publication_date: string;
}

interface GeneratedPost {
  content: string;
  topic: string;
  hook: string;
  facts: Array<{
    fact: string;
    source: string;
    date: string;
  }>;
  hashtags: string[];
  sources: Source[];
}

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
    const response = await generateContent(userPrompt);
    const { posts, styleAnalysis } = response;

    // Save each post with its sources
    const savedPosts = await Promise.all(posts.map(async (post: GeneratedPost) => {
      // Insert the post
      const { data: savedPost, error: postError } = await supabase
        .from('linkedin_posts')
        .insert({
          user_id: userId,
          content: post.content,
          topic: post.topic,
          hashtags: post.hashtags,
          version_group: generateUUID(),
          is_current_version: true,
        })
        .select()
        .single();

      if (postError) throw postError;

      // Insert the sources
      if (post.sources && post.sources.length > 0) {
        const { error: sourcesError } = await supabase
          .from('post_sources')
          .insert(
            post.sources.map(source => ({
              linkedin_post_id: savedPost.id,
              title: source.title,
              url: source.url,
              publication_date: source.publication_date,
            }))
          );

        if (sourcesError) throw sourcesError;
      }

      return savedPost;
    }));

    // Return the successful response
    return new Response(
      JSON.stringify({ success: true, posts: savedPosts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-linkedin-post function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
