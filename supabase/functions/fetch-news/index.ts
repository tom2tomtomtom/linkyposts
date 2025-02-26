
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const newsApiKey = Deno.env.get('NEWS_API_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const NEWS_API_BASE_URL = 'https://newsapi.org/v2/everything'

async function fetchNewsForIndustry(industry: string): Promise<void> {
  console.log(`Fetching news for industry: ${industry}`)
  
  try {
    const query = encodeURIComponent(`${industry} AND (business OR professional OR industry OR market OR innovation)`)
    const today = new Date()
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const response = await fetch(
      `${NEWS_API_BASE_URL}?q=${query}&language=en&sortBy=publishedAt&pageSize=10&from=${lastWeek.toISOString()}`,
      {
        headers: {
          'X-Api-Key': newsApiKey,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`Found ${data.articles?.length || 0} articles for ${industry}`)
    
    for (const article of data.articles || []) {
      try {
        const { error } = await supabase.from('news_articles').upsert({
          industry,
          title: article.title,
          source: article.source.name,
          url: article.url,
          published_date: article.publishedAt,
          snippet: article.description,
          content: article.content,
        }, {
          onConflict: 'url'
        })

        if (error) {
          console.error(`Error inserting article for ${industry}:`, error)
        }
      } catch (error) {
        console.error(`Error processing article for ${industry}:`, error)
      }
    }
  } catch (error) {
    console.error(`Error fetching news for ${industry}:`, error)
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders
    })
  }

  try {
    console.log('Starting news fetch operation')
    
    // Fetch active industries
    const { data: industries, error: industriesError } = await supabase
      .from('tracked_industries')
      .select('name')
      .eq('active', true)

    if (industriesError) {
      throw industriesError
    }

    console.log(`Found ${industries?.length || 0} active industries to process`)

    // Fetch news for each active industry
    const fetchPromises = industries.map(industry => fetchNewsForIndustry(industry.name))
    await Promise.all(fetchPromises)

    return new Response(JSON.stringify({
      success: true,
      message: 'News articles fetched and stored successfully',
      industries_processed: industries.length
    }), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  } catch (error) {
    console.error('Error in news fetch operation:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch news articles: ' + error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }
})
