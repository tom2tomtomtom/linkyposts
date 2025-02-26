
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
    console.log('Starting generate-linkedin-post function')
    
    const { userId, topic, tone, pov, writingSample, industry, numPosts, includeNews, generateImage: shouldGenerateImage } = await req.json()
    
    console.log('Request parameters:', {
      userId,
      topic,
      tone,
      pov,
      industry,
      numPosts,
      includeNews,
      shouldGenerateImage,
      hasWritingSample: !!writingSample
    })

    if (!userId || !topic) {
      console.error('Missing required parameters');
      throw new Error('Missing required parameters');
    }

    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch relevant news if requested
    let newsArticles = []
    if (includeNews) {
      console.log('Fetching news articles...')
      try {
        newsArticles = await fetchRecentNews(industry)
        console.log(`Fetched ${newsArticles.length} news articles`)
      } catch (error) {
        console.error('Error fetching news:', error)
      }
    }

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

      try {
        const content = await generateContent(contentPrompt, "You are a professional LinkedIn content writer.")
        console.log(`Content generated for post ${i + 1}`)

        let imageUrl = null
        if (shouldGenerateImage) {
          console.log('Generating image...')
          try {
            const imagePrompt = buildImagePrompt(content)
            imageUrl = await generateImage(imagePrompt)
            console.log('Image generated successfully:', !!imageUrl)
          } catch (error) {
            console.error('Error generating image:', error)
          }
        }

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
          console.error('Error inserting post:', postError)
          throw postError
        }

        console.log('Post inserted successfully:', post.id)

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
          } else {
            console.log('Sources inserted successfully')
          }
        }

        generatedPosts.push(post)
      } catch (error) {
        console.error(`Error generating post ${i + 1}:`, error)
        throw error
      }
    }

    console.log('Function completed successfully')
    return new Response(
      JSON.stringify({ success: true, posts: generatedPosts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Function failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

