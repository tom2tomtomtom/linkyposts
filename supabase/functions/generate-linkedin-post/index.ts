
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedDate: string;
  snippet: string | null;
}

interface GeneratePostRequest {
  userId: string;
  topic: string;
  tone: string;
  pov: string;
  writingSample?: string;
  industry?: string;
  numPosts?: number;
  includeNews?: boolean;
}

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

    // Fetch relevant news articles
    let recentNews: NewsArticle[] = [];
    if (includeNews) {
      try {
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: newsArticles, error: newsError } = await supabase
          .from('news_articles')
          .select('*')
          .or(`title.ilike.%${topic}%,content.ilike.%${topic}%`)
          .eq('industry', industry)
          .gte('published_date', twoWeeksAgo)
          .order('published_date', { ascending: false })
          .limit(8);

        if (newsError) {
          console.error('Error fetching news:', newsError);
        } else if (newsArticles) {
          recentNews = newsArticles.map(article => ({
            title: article.title,
            source: article.source,
            url: article.url,
            publishedDate: article.published_date,
            snippet: article.snippet
          }));
        }
      } catch (error) {
        console.error('Error processing news:', error);
      }
    }

    // Create enhanced system prompt for provocative hooks
    const systemPrompt = `You are an expert LinkedIn content creator specializing in creating engaging, professional posts.
You excel at crafting PROVOCATIVE HOOKS that grab attention in the first sentence, specifically using 
current news and trends to create intellectual tension or curiosity.

Today's date is ${new Date().toDateString()}.

For every post you create:
1. Always start with a provocative hook based on recent news
2. Use specific facts, statistics, or developments from the news - be concrete, not generic
3. Create a sense of urgency, surprise, or contradiction to grab attention
4. Transition smoothly from the hook to your main point
5. End with a thought-provoking question or call to action

Examples of provocative hooks:
- "While 87% of executives are investing in AI, a shocking new report reveals most are wasting their money."
- "As remote work policies get slashed across tech, LinkedIn's latest data shows a surprising counter-trend."
- "The strategy Tesla just abandoned is the exact one that helped Microsoft secure its $2.8 trillion valuation."`;

    // Create enhanced user prompt for news-focused posts
    let userPrompt = `Generate ${numPosts} LinkedIn posts about "${topic}" with a "${tone}" tone, written from the "${pov}" point of view.
These posts are for a professional in the ${industry} industry.

CRITICAL REQUIREMENT: EACH post MUST begin with a provocative hook based on a SPECIFIC piece of recent news or data.
The hook should create intellectual tension, surprise, or curiosity. Never start with a generic statement.`;
    
    // Add recent news context
    if (recentNews.length > 0) {
      userPrompt += `\n\nHere are specific recent news items to reference in your posts (use at least one specific detail from these in EACH post):`;
      
      recentNews.forEach((article, index) => {
        userPrompt += `\n${index + 1}. "${article.title}" from ${article.source} (${new Date(article.publishedDate).toDateString()})
        Key points: ${article.snippet || 'No snippet available'}
        URL: ${article.url}`;
      });
      
      userPrompt += `\n\nFOR EACH POST:
      1. Start with a provocative hook directly referencing a specific news item or statistic
      2. Include the publication date of the news (e.g., "According to yesterday's report..." or "In new data released last week...")
      3. Create a sense of urgency or surprise in the opening line
      4. Connect the news to a valuable insight for your audience
      5. Always cite your sources with a link`;
    } else {
      userPrompt += `\n\nSince specific news sources aren't available, create compelling hooks based on:
      - Recent industry trends in ${industry}
      - Contrarian viewpoints on commonly held beliefs about ${topic}
      - Surprising statistics or facts (be specific with numbers)
      - Provocative "what if" scenarios that challenge conventional thinking
      
      FOR EACH POST:
      1. Start with a specific, concrete statement that sounds like breaking news
      2. Include specific numbers, percentages, or dates to add credibility
      3. Create a sense of urgency or surprise in the opening line
      4. Make it sound extremely current (e.g., "New data released this week shows...")`;
    }

    if (writingSample) {
      userPrompt += `\n\nHere's a sample of my writing style to emulate:\n\n"${writingSample}"\n\nMatch this style AFTER you've created the provocative hook.`;
    }

    userPrompt += `\n\nFormat your response as a JSON object with:
    - "posts": an array of objects, each with:
        - "content": the post text starting with a provocative hook
        - "topic": the specific aspect of the main topic this post addresses
        - "hook": the opening provocative statement (for reference)
        - "newsReference": the specific news item referenced
        - "hashtags": array of strings
        - "sources": array of objects with "title" and "url"
    - "styleAnalysis": an object with "writingStyle", "toneDescription", "keyCharacteristics" (array), and "recommendedTopics" (array)`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    const completion = await response.json();
    
    // Parse the response
    const aiResponse = JSON.parse(completion.choices[0]?.message?.content || '{"posts":[], "styleAnalysis":{}}');

    // Create a new generated_content record
    const { data: generatedContent, error: contentError } = await supabase
      .from('generated_content')
      .insert({
        user_id: userId,
        topic,
        tone,
        pov,
        writing_sample: writingSample,
        style_analysis: aiResponse.styleAnalysis,
        status: 'draft'
      })
      .select('id')
      .single();

    if (contentError) {
      console.error('Error creating generated content:', contentError);
      throw new Error('Failed to save generated content');
    }

    const generatedContentId = generatedContent.id;
    const versionGroup = crypto.randomUUID();

    // Create LinkedIn post records
    for (const post of aiResponse.posts) {
      const { error: postError } = await supabase
        .from('linkedin_posts')
        .insert({
          user_id: userId,
          generated_content_id: generatedContentId,
          content: post.content,
          topic: post.topic || topic,
          version_group: versionGroup,
          is_current_version: true,
          hashtags: post.hashtags || []
        });

      if (postError) {
        console.error('Error creating LinkedIn post:', postError);
        continue;
      }

      // Insert sources if available
      if (post.sources && post.sources.length > 0) {
        const { error: sourcesError } = await supabase
          .from('post_sources')
          .insert(
            post.sources.map((source: { title: string; url: string }) => ({
              linkedin_post_id: post.id,
              title: source.title,
              url: source.url,
              publication_date: new Date().toISOString().split('T')[0]
            }))
          );

        if (sourcesError) {
          console.error('Error creating post sources:', sourcesError);
        }
      }
    }

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
