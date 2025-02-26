
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { OpenAI } from 'https://deno.land/x/openai@v4.28.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userId, postId, postContent, topic, customPrompt } = await req.json()

    if (!userId || !postId || !postContent) {
      throw new Error('Missing required parameters')
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Generate prompt if not provided
    let imagePrompt = customPrompt
    if (!imagePrompt) {
      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating DALL-E prompts. Create detailed, vivid image prompts that will work well for professional LinkedIn posts.'
          },
          {
            role: 'user',
            content: `Create a DALL-E prompt for a professional LinkedIn post about "${topic}". The image should be visually appealing and relevant to the post content. Post content: "${postContent.substring(0, 500)}..."`
          }
        ],
        temperature: 0.7,
      })

      imagePrompt = chatCompletion.choices[0]?.message?.content?.trim() || `Professional image related to ${topic}`
      console.log("Generated image prompt:", imagePrompt)
    }

    // Generate image with DALL-E
    const image = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
    })

    const imageUrl = image.data[0]?.url
    if (!imageUrl) {
      throw new Error('Failed to generate image')
    }

    // Update post with image URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Save image metadata
    const { error: dbError } = await supabase
      .from('post_images')
      .insert({
        linkedin_post_id: postId,
        user_id: userId,
        image_url: imageUrl,
        prompt: imagePrompt,
        storage_path: `${userId}/${postId}_${Date.now()}.jpg`
      })

    if (dbError) {
      throw dbError
    }

    // Update post with image URL
    const { error: updateError } = await supabase
      .from('linkedin_posts')
      .update({ image_url: imageUrl })
      .eq('id', postId)
      .eq('user_id', userId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true, imageUrl, prompt: imagePrompt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

