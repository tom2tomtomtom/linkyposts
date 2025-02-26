
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
    const {
      userId,
      topic,
      tone = "",
      pov = "",
      writingSample = "",
      industry = "",
      numPosts = 3,
      includeNews = true,
    } = await req.json();

    console.log("Received request with params:", { userId, topic, tone, pov, numPosts, includeNews });

    let mainArticle = null;
    let relatedArticles = [];

    // Check if the topic is a URL
    const isUrl = topic.startsWith('http://') || topic.startsWith('https://');
    if (isUrl) {
      console.log("Topic is a URL, fetching article content...");
      try {
        mainArticle = await extractArticleContent(topic);
        console.log("Main article extracted:", {
          title: mainArticle.title,
          contentLength: mainArticle.content.length,
          url: mainArticle.url
        });

        if (includeNews) {
          // Search for related articles based on the main article's title
          relatedArticles = await findRelatedArticles(mainArticle.title);
          console.log(`Found ${relatedArticles.length} related articles`);
        }
      } catch (error) {
        console.error("Error processing articles:", error);
        throw new Error(`Failed to process article: ${error.message}`);
      }
    }

    const supabase = createDbClient();

    // Get user preferences
    console.log("Fetching user preferences for userId:", userId);
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log("User preferences:", preferences);

    const defaultTone = tone || preferences?.default_tone || 'professional';
    const defaultPov = pov || preferences?.default_pov || 'first person';
    const userIndustry = industry || preferences?.industry || '';

    let prompt = `Generate ${numPosts} unique LinkedIn posts`;

    if (mainArticle) {
      // When we have article content, make it the primary focus
      prompt += `\n\nMain Article Analysis:\nTitle: ${mainArticle.title}\nURL: ${mainArticle.url}\nContent: ${mainArticle.content}\n\n`;
      
      if (relatedArticles.length > 0) {
        prompt += "\nRelated Articles for Context:\n";
        relatedArticles.forEach((article, index) => {
          prompt += `\nArticle ${index + 1}:\nTitle: ${article.title}\nURL: ${article.url}\nKey Points: ${article.content.slice(0, 500)}...\n`;
        });
      }
      
      prompt += `\nUsing the main article as your primary source and the related articles for additional context:
1. Analyze the key points and insights
2. Form a unique, well-researched opinion
3. Connect ideas across the different sources
4. Challenge conventional thinking with evidence
5. Provide actionable takeaways for the readers`;
    } else {
      prompt += ` about ${topic}.`;
    }

    prompt += `\nTone: ${defaultTone}`;
    prompt += `\nPoint of View: ${defaultPov}`;
    if (userIndustry) prompt += `\nIndustry Context: ${userIndustry}`;
    if (writingSample) prompt += `\nMatch this writing style: ${writingSample}`;

    console.log("Generating posts with configuration:", {
      hasMainArticle: !!mainArticle,
      numRelatedArticles: relatedArticles.length,
      tone: defaultTone,
      pov: defaultPov,
      industry: !!userIndustry,
      hasWritingSample: !!writingSample
    });

    const posts = await generateAnalysis(prompt);
    console.log(`Successfully generated ${posts.length} posts`);

    if (!posts || !Array.isArray(posts)) {
      throw new Error("Invalid response from OpenAI");
    }

    // Save generated content
    const generatedContentId = await saveGeneratedContent(
      supabase,
      userId,
      isUrl ? mainArticle?.title || topic : topic,
      defaultTone,
      defaultPov,
      writingSample,
      { tone: defaultTone, pov: defaultPov }
    );

    // Save the posts
    await saveLinkedInPosts(supabase, userId, generatedContentId, posts);

    return new Response(
      JSON.stringify({ success: true }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-linkedin-post function:", error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
