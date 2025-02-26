
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.ts'
import { generateContent, generateImage } from './openai.ts'
import { fetchRecentNews } from './news.ts'
import { buildContentPrompt, buildImagePrompt } from './prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userId, topic, tone, pov, writingSample, industry, numPosts, includeNews } = await req.json()

    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch relevant news if requested
    const newsArticles = includeNews ? await fetchRecentNews(industry) : []

    // Generate content for each requested post
    const generatedPosts = []
    for (let i = 0; i < numPosts; i++) {
      console.log(`Generating post ${i + 1} of ${numPosts}`)
      
      const contentPrompt = buildContentPrompt({
        topic,
        tone,
        pov,
        writingSample,
        newsArticles,
      })

      const content = await generateContent(contentPrompt, "You are a professional LinkedIn content writer.")
      
      // Generate an image for the post
      const imagePrompt = buildImagePrompt(content)
      const imageUrl = await generateImage(imagePrompt)

      // Insert the post into the database
      const { data: post, error: postError } = await supabase
        .from('linkedin_posts')
        .insert({
          user_id: userId,
          content,
          topic,
          image_url: imageUrl,
          is_current_version: true,
        })
        .select()
        .single()

      if (postError) {
        throw postError
      }

      // If we have news articles, create source records
      if (newsArticles.length > 0) {
        const { error: sourcesError } = await supabase
          .from('post_sources')
          .insert(
            newsArticles.map(article => ({
              linkedin_post_id: post.id,
              title: article.title,
              url: article.url,
              publication_date: article.published_date,
            }))
          )

        if (sourcesError) {
          console.error('Error inserting sources:', sourcesError)
        }
      }

      generatedPosts.push(post)
    }

    return new Response(
      JSON.stringify({ success: true, posts: generatedPosts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in generate-linkedin-post function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
