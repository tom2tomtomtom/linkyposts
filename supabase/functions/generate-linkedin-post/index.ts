
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { extractArticleContent } from "./news.ts";
import { createClient } from "./database.ts";
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

    console.log("Received request:", { userId, topic, tone, pov, numPosts, includeNews });

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
        console.log("Successfully extracted article:", {
          title: articleTitle,
          contentLength: articleContent.length,
        });
      } catch (error) {
        console.error("Error extracting article content:", error);
      }
    }

    const supabase = createClient();

    // Get user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

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

    console.log("Generating posts with prompt structure:", {
      hasArticleContent: !!articleContent,
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

    // Store posts in the database
    for (const postContent of posts) {
      const { error: insertError } = await supabase
        .from('linkedin_posts')
        .insert({
          content: postContent,
          user_id: userId,
          topic: isUrl ? articleTitle : topic,
          is_current_version: true,
        });

      if (insertError) {
        console.error("Error inserting post:", insertError);
      }
    }

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
