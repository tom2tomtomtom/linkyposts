
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define interfaces for request and response
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

interface PostSource {
  title: string;
  url: string;
}

interface GeneratedPost {
  content: string;
  topic: string;
  hashtags: string[];
  sources: PostSource[];
}

interface StyleAnalysis {
  writingStyle: string;
  toneDescription: string;
  keyCharacteristics: string[];
  recommendedTopics: string[];
}

interface GeneratePostResponse {
  posts: GeneratedPost[];
  styleAnalysis: StyleAnalysis;
  generatedContentId: string;
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
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Create a unique version group ID for this batch of posts
    const versionGroup = crypto.randomUUID();

    // Get recent news if requested
    let recentNewsPrompt = '';
    if (includeNews) {
      recentNewsPrompt = `Also incorporate references to recent trends and news in the ${industry} industry where relevant.`;
    }

    // Create system prompt
    const systemPrompt = `You are an expert LinkedIn content creator specializing in creating engaging, professional posts.
You excel at matching the user's writing style and creating content that resonates with their target audience.
You follow LinkedIn best practices and create posts that drive engagement.`;

    // Create user prompt
    let userPrompt = `Generate ${numPosts} LinkedIn posts about "${topic}" with a "${tone}" tone, written from the "${pov}" point of view.
These posts are for a professional in the ${industry} industry.

${recentNewsPrompt}

For each post:
1. Create engaging, professional content under 1,300 characters (LinkedIn's limit)
2. Include 3-5 relevant hashtags at the end
3. Suggest 1-2 possible source URLs that might be referenced (these can be hypothetical but should sound realistic)

Additionally, analyze the writing style based on the parameters provided (and writing sample if available)
and provide:
1. A brief description of the writing style
2. Tone characteristics
3. 3-5 key writing characteristics
4. 3-5 recommended topics that would work well with this style`;

    if (writingSample) {
      userPrompt += `\n\nHere's a sample of my writing style to emulate:\n\n"${writingSample}"\n\nAnalyze this writing sample and make the generated posts match this style and voice.`;
    }

    userPrompt += `\n\nFormat your response as a JSON object with:
- "posts": an array of objects, each with "content", "topic", "hashtags" (array of strings), and "sources" (array of objects with "title" and "url")
- "styleAnalysis": an object with "writingStyle", "toneDescription", "keyCharacteristics" (array), and "recommendedTopics" (array)`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const completion = await response.json();
    
    // Parse the response
    const aiResponse = JSON.parse(completion.choices[0]?.message?.content || '{"posts":[], "styleAnalysis":{}}');
    
    // Create a new generated_content record in Supabase
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
      return new Response(
        JSON.stringify({ error: 'Failed to save generated content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const generatedContentId = generatedContent.id;

    // Create LinkedIn post records in Supabase
    for (const post of aiResponse.posts) {
      // Insert the LinkedIn post
      const { data: postData, error: postError } = await supabase
        .from('linkedin_posts')
        .insert({
          user_id: userId,
          generated_content_id: generatedContentId,
          content: post.content,
          topic: post.topic || topic,
          version_group: versionGroup,
          is_current_version: true,
          hashtags: post.hashtags || []
        })
        .select('id')
        .single();

      if (postError) {
        console.error('Error creating LinkedIn post:', postError);
        continue;
      }

      // Insert sources if available
      if (post.sources && post.sources.length > 0) {
        const sourcesToInsert = post.sources.map((source: PostSource) => ({
          linkedin_post_id: postData.id,
          title: source.title,
          url: source.url,
          publication_date: new Date().toISOString().split('T')[0]
        }));

        const { error: sourcesError } = await supabase
          .from('post_sources')
          .insert(sourcesToInsert);

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
      } as GeneratePostResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
