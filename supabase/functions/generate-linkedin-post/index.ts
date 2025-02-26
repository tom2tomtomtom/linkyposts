
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { generateContent } from "./openai.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    console.log("Starting request processing");

    const { userId, topic, tone, pov, writingSample, industry, numPosts, includeNews } = await req.json();
    console.log("Received parameters:", { userId, topic, tone, pov, industry, numPosts, includeNews });

    // Validate required parameters
    if (!userId || !topic) {
      console.error("Missing required parameters");
      return new Response(
        JSON.stringify({
          error: "Missing required parameters",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Fetch relevant news if requested
    let newsArticles = [];
    if (includeNews) {
      console.log("Fetching relevant news articles");
      try {
        const escapedTopic = topic.replace(/[%_]/g, '\\$&'); // Escape special characters for ILIKE
        const { data: articles, error: newsError } = await supabase
          .from('news_articles')
          .select('*')
          .or(`title.ilike.%${escapedTopic}%,content.ilike.%${escapedTopic}%`)
          .eq('industry', industry)
          .order('published_date', { ascending: false })
          .limit(5);

        if (newsError) throw newsError;
        newsArticles = articles || [];
        console.log(`Found ${newsArticles.length} relevant news articles`);
      } catch (error) {
        console.error("Error fetching news:", error);
        // Continue without news articles if there's an error
      }
    }

    // Create the system prompt
    const systemPrompt = `You are a professional LinkedIn content creator who specializes in creating engaging, informative posts. 
    Write ${numPosts} unique LinkedIn posts about ${topic} with a ${tone} tone using ${pov} point of view.
    Each post should:
    - Be between 800-1200 characters
    - Include 3-5 relevant hashtags
    - Have a strong hook in the first line
    - Include a call to action
    - Be formatted with clear paragraphs
    - Match the writing style from the sample if provided`;

    // Create the user prompt including news articles if available
    let userPrompt = `Write ${numPosts} LinkedIn posts about ${topic}. Industry: ${industry}.`;
    if (writingSample) {
      userPrompt += `\n\nMatch this writing style: "${writingSample}"`;
    }
    if (newsArticles.length > 0) {
      userPrompt += "\n\nIncorporate insights from these recent news articles:";
      newsArticles.forEach((article, index) => {
        userPrompt += `\n${index + 1}. "${article.title}" - ${article.snippet || ''}`;
      });
    }

    console.log("Generating content with OpenAI");
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const content = await generateContent(openAIApiKey, systemPrompt, userPrompt);
    console.log("Content generated successfully");

    // Save posts to the database
    const savedPosts = [];
    for (const post of content.posts) {
      try {
        const { data, error } = await supabase
          .from('linkedin_posts')
          .insert({
            user_id: userId,
            content: post.content,
            topic: post.topic,
            hashtags: post.hashtags,
            version_group: crypto.randomUUID(),
            is_current_version: true,
          })
          .select()
          .single();

        if (error) throw error;
        savedPosts.push(data);

        // Save post sources if available
        if (post.sources && post.sources.length > 0) {
          const { error: sourcesError } = await supabase
            .from('post_sources')
            .insert(
              post.sources.map(source => ({
                linkedin_post_id: data.id,
                title: source.title,
                url: source.url,
                publication_date: source.publication_date
              }))
            );
          if (sourcesError) {
            console.error("Error saving sources:", sourcesError);
          }
        }
      } catch (error) {
        console.error("Error saving post:", error);
        throw error;
      }
    }

    console.log("All posts saved successfully");
    return new Response(
      JSON.stringify({ 
        success: true, 
        posts: savedPosts
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in generate-linkedin-post function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
