
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { extractArticleContent } from "./news.ts";
import { createDbClient, saveGeneratedContent, saveLinkedInPosts } from "./database.ts";
import { generateAnalysis } from "./openai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
      numPosts = 3,
      includeNews = true,
    } = await req.json();

    console.log("Received request with params:", { userId, topic, tone, pov, numPosts, includeNews });

    let articleContent = "";
    let articleTitle = "";
    let articleUrl = "";

    // Check if the topic is a URL
    const isUrl = topic.startsWith('http://') || topic.startsWith('https://');
    if (isUrl) {
      console.log("Topic is a URL, fetching article content...");
      try {
        const article = await extractArticleContent(topic);
        articleContent = article.content || "";
        articleTitle = article.title || "";
        articleUrl = topic;
        console.log("Article extraction results:", {
          hasContent: !!articleContent,
          contentLength: articleContent.length,
          title: articleTitle,
          url: articleUrl
        });
      } catch (error) {
        console.error("Error extracting article content:", error);
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
    const industry = preferences?.industry || '';

    let prompt = `Generate ${numPosts} unique LinkedIn posts`;

    if (articleContent) {
      // When we have article content, make it the primary focus
      prompt += `\n\nBased primarily on this article:\nTitle: ${articleTitle}\nURL: ${articleUrl}\nContent: ${articleContent}\n\n`;
      prompt += `Create engaging LinkedIn posts that discuss the key points and insights from this article. `;
      prompt += `Add your professional perspective and make it relevant to the industry.`;
    } else {
      // If no article, use the topic as before
      prompt += ` about ${topic}.`;
    }

    prompt += `\nTone: ${defaultTone}`;
    prompt += `\nPoint of View: ${defaultPov}`;
    if (industry) prompt += `\nIndustry Context: ${industry}`;
    if (writingSample) prompt += `\nMatch this writing style: ${writingSample}`;

    console.log("Generating posts with configuration:", {
      hasArticleContent: !!articleContent,
      articleContentPreview: articleContent.slice(0, 200) + "...",
      tone: defaultTone,
      pov: defaultPov,
      industry: !!industry,
      hasWritingSample: !!writingSample
    });

    const posts = await generateAnalysis(prompt);

    // Check if we got valid posts back
    if (!posts || !Array.isArray(posts)) {
      throw new Error("Invalid response from OpenAI");
    }

    console.log(`Successfully generated ${posts.length} posts`);
    console.log("Sample post preview:", posts[0]?.slice(0, 200));

    // Save generated content first
    const generatedContentId = await saveGeneratedContent(
      supabase,
      userId,
      isUrl ? articleTitle : topic,
      defaultTone,
      defaultPov,
      writingSample,
      { tone: defaultTone, pov: defaultPov }
    );

    // Save the posts with reference to generated content
    await saveLinkedInPosts(supabase, userId, generatedContentId, posts);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in generate-linkedin-post function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
