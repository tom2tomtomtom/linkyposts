
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { generatePosts } from "./openai.ts";
import { fetchNewsForTopic } from "./news.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      userId,
      topic,
      tone,
      pov,
      writingSample,
      industry,
      numPosts,
      includeNews,
    } = await req.json();

    // Check if topic is a URL
    let topicContent = topic;
    let additionalContext = "";

    if (topic.startsWith('http://') || topic.startsWith('https://')) {
      console.log('URL detected, fetching content...');
      try {
        const response = await fetch(topic);
        if (!response.ok) throw new Error('Failed to fetch URL');
        const html = await response.text();
        
        // Basic HTML to text conversion
        const text = html
          .replace(/<[^>]*>/g, ' ') // Remove HTML tags
          .replace(/\s+/g, ' ') // Remove extra whitespace
          .trim();
        
        // Extract a reasonable amount of content
        const maxLength = 1000;
        additionalContext = text.slice(0, maxLength);
        
        // Extract the topic from the URL
        const url = new URL(topic);
        topicContent = url.pathname
          .split('/')
          .filter(Boolean)
          .pop()
          ?.replace(/-/g, ' ') || 'article';
        
        console.log('Successfully extracted content from URL');
      } catch (error) {
        console.error('Error fetching URL:', error);
        throw new Error('Failed to fetch content from URL');
      }
    }

    // Fetch news articles if includeNews is true
    let newsArticles = [];
    if (includeNews) {
      console.log('Fetching related news articles...');
      newsArticles = await fetchNewsForTopic(topicContent);
      console.log(`Found ${newsArticles.length} related news articles`);
    }

    // Generate posts using both the URL content and any additional news
    console.log('Generating posts with OpenAI...');
    const posts = await generatePosts({
      topic: topicContent,
      tone,
      pov,
      writingSample,
      industry,
      numPosts,
      additionalContext,
      newsArticles,
    });

    console.log(`Successfully generated ${posts.length} posts`);
    
    return new Response(JSON.stringify({ posts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in generate-linkedin-post function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
