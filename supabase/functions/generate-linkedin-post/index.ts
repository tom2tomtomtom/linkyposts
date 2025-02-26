
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') || '',
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
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

    console.log("Generating content with OpenAI");
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Write ${numPosts} LinkedIn posts about ${topic}. Industry: ${industry}. Writing sample for style matching: ${writingSample || 'N/A'}` }
      ],
      temperature: 0.7,
    });

    console.log("OpenAI response received");

    if (!completion.choices[0]?.message?.content) {
      console.error("No content generated from OpenAI");
      throw new Error("Failed to generate content");
    }

    const content = completion.choices[0].message.content;
    console.log("Content generated successfully");

    // Split the content into individual posts
    const posts = content.split(/Post \d+:/).filter(Boolean);
    console.log(`Split response into ${posts.length} posts`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log("Supabase client initialized");

    // Save each post
    const savedPosts = [];
    for (const postContent of posts) {
      try {
        // Extract hashtags from content
        const hashtagRegex = /#[\w]+/g;
        const hashtags = postContent.match(hashtagRegex) || [];
        
        // Clean up the content
        const cleanContent = postContent.trim();

        console.log("Saving post to database");
        const { data, error } = await supabase
          .from('linkedin_posts')
          .insert({
            user_id: userId,
            content: cleanContent,
            topic,
            hashtags,
            version_group: crypto.randomUUID(),
            is_current_version: true,
          })
          .select()
          .single();

        if (error) {
          console.error("Error saving post:", error);
          throw error;
        }

        savedPosts.push(data);
        console.log("Post saved successfully");
      } catch (error) {
        console.error("Error processing post:", error);
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

