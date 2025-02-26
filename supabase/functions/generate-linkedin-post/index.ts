
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractArticle } from "npm:@extractus/article-extractor";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("Starting generate-linkedin-post function");

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log the full request for debugging
    console.log("Request method:", req.method);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));

    const payload = await req.json();
    console.log("Request payload:", payload);

    const { userId, topic, tone = "", pov = "", writingSample = "", industry = "", numPosts = 3, includeNews = true } = payload;

    if (!userId || !topic) {
      throw new Error('Missing required parameters: userId and topic are required');
    }

    // Initialize variables for content generation
    let mainContent = topic;
    let context = "";

    // Handle URL input
    const isUrl = topic.startsWith('http://') || topic.startsWith('https://');
    if (isUrl) {
      try {
        console.log("Attempting to extract content from URL:", topic);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const article = await extractArticle(topic);
        clearTimeout(timeout);
        
        if (!article) {
          throw new Error('Failed to extract article content');
        }

        mainContent = article.title || topic;
        context = article.content || "";
        console.log("Successfully extracted article content:", {
          title: mainContent,
          contentLength: context.length
        });
      } catch (error) {
        console.error("Error extracting article:", error);
        throw new Error('Failed to extract article content. Please try a different URL or enter your topic directly.');
      }
    }

    // Prepare prompt for OpenAI
    const systemPrompt = `You are an expert LinkedIn content strategist who creates engaging, professional posts.
Key requirements for EACH post:
- Minimum 300 words
- Clear structure: hook, main points, conclusion
- Professional yet conversational tone
- 2-3 relevant hashtags
- Strategic use of emojis (2-3 per post)
- End with a thought-provoking question
- Focus on insights and professional value

Writing style preferences:
${tone ? `- Tone: ${tone}` : ""}
${pov ? `- Point of view: ${pov}` : ""}
${industry ? `- Industry context: ${industry}` : ""}
${writingSample ? `- Match this writing style: ${writingSample}` : ""}`;

    const userPrompt = context 
      ? `Generate ${numPosts} unique LinkedIn posts based on this article: "${mainContent}"

Article content:
${context}

Make each post unique, focusing on different aspects or insights from the article.`
      : `Generate ${numPosts} engaging LinkedIn posts about: ${mainContent}

Make each post unique, offering different perspectives or insights about the topic.`;

    console.log("Preparing to send request to OpenAI");
    
    // Generate content using OpenAI with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      console.log("Sending request to OpenAI");
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!openAIResponse.ok) {
        const error = await openAIResponse.text();
        console.error("OpenAI API error:", error);
        throw new Error(`OpenAI API error: ${error}`);
      }

      const openAIData = await openAIResponse.json();
      const generatedContent = openAIData.choices[0]?.message?.content;

      if (!generatedContent) {
        throw new Error('No content generated from OpenAI');
      }

      console.log("Successfully received response from OpenAI");

      // Split and validate posts
      const posts = generatedContent
        .split(/\n{2,}/)
        .filter(post => {
          const wordCount = post.trim().split(/\s+/).length;
          const hasHashtags = /#[\w-]+/.test(post);
          const hasEmoji = /[\p{Emoji}]/u.test(post);
          const hasQuestion = /\?/.test(post);
          
          return wordCount >= 300 && hasHashtags && hasEmoji && hasQuestion;
        })
        .map(post => post.trim());

      if (posts.length === 0) {
        console.error("Generated content failed validation:", generatedContent);
        throw new Error('Generated content did not meet quality standards');
      }

      console.log(`Successfully generated and validated ${posts.length} posts`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          posts 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  } catch (error) {
    console.error("Error in generate-linkedin-post function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

