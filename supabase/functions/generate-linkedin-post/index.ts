
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { extractArticleContent, findRelatedArticles } from "./news.ts";
import { createDbClient, saveGeneratedContent, saveLinkedInPosts } from "./database.ts";
import { generateAnalysis } from "./openai.ts";

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
    // Validate request body
    const body = await req.json().catch(() => null);
    console.log("Received request body:", body);

    if (!body || !body.userId || !body.topic) {
      console.error("Missing required parameters:", { body });
      throw new Error('Missing required parameters: userId and topic are required');
    }

    const { 
      userId, 
      topic, 
      tone = "", 
      pov = "", 
      writingSample = "", 
      industry = "", 
      numPosts = 3, 
      includeNews = true 
    } = body;

    console.log("Processing request with params:", {
      userId,
      topic,
      tone,
      pov,
      writingSample: writingSample ? "provided" : "not provided",
      industry,
      numPosts,
      includeNews
    });

    let mainArticle = null;
    let relatedArticles = [];

    // Check if the topic is a URL
    const isUrl = topic.startsWith('http://') || topic.startsWith('https://');
    if (isUrl) {
      console.log("Topic is a URL, attempting to extract content...");
      try {
        mainArticle = await extractArticleContent(topic);
        if (!mainArticle) {
          console.error("Failed to extract article content from URL:", topic);
          throw new Error('Failed to extract article content');
        }
        console.log("Successfully extracted article content:", {
          title: mainArticle.title,
          contentLength: mainArticle.content.length,
          url: mainArticle.url
        });

        if (includeNews) {
          console.log("Fetching related articles...");
          relatedArticles = await findRelatedArticles(mainArticle.title);
          console.log(`Found ${relatedArticles.length} related articles`);
        }
      } catch (error) {
        console.error("Error processing article URL:", error);
        throw new Error(`Failed to process article: ${error.message}`);
      }
    }

    // Initialize Supabase client
    console.log("Initializing Supabase client...");
    const supabase = createDbClient();

    // Get user preferences
    console.log("Fetching user preferences for userId:", userId);
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (preferencesError) {
      console.error("Error fetching user preferences:", preferencesError);
      throw preferencesError;
    }

    console.log("User preferences:", preferences);

    const defaultTone = tone || preferences?.default_tone || 'professional';
    const defaultPov = pov || preferences?.default_pov || 'first person';
    const userIndustry = industry || preferences?.industry || '';

    console.log("Starting content generation with settings:", {
      defaultTone,
      defaultPov,
      userIndustry,
      hasMainArticle: !!mainArticle,
      numRelatedArticles: relatedArticles.length
    });

    // Generate posts using OpenAI
    const posts = await generateAnalysis(topic, {
      mainArticle,
      relatedArticles,
      tone: defaultTone,
      pov: defaultPov,
      industry: userIndustry,
      writingSample
    });

    console.log(`Successfully generated ${posts.length} posts`);

    // Save generated content
    console.log("Saving generated content...");
    const generatedContentId = await saveGeneratedContent(
      supabase,
      userId,
      isUrl ? mainArticle?.title || topic : topic,
      defaultTone,
      defaultPov,
      writingSample,
      { tone: defaultTone, pov: defaultPov }
    );

    console.log("Content saved with ID:", generatedContentId);

    // Save the posts
    console.log("Saving generated posts...");
    await saveLinkedInPosts(supabase, userId, generatedContentId, posts);

    console.log("Successfully completed post generation process");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error in generate-linkedin-post function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
