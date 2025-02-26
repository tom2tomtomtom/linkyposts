
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// NewsAPI configuration
const NEWS_API_KEY = Deno.env.get('NEWS_API_KEY')!
const NEWS_API_BASE_URL = 'https://newsapi.org/v2/everything'

interface NewsArticle {
  title: string
  url: string
  source: {
    name: string
  }
  publishedAt: string
  description: string
  content: string
}

async function fetchNewsForIndustry(industry: string): Promise<void> {
  const query = encodeURIComponent(`${industry} AND (business OR professional OR industry)`)
  const response = await fetch(
    `${NEWS_API_BASE_URL}?q=${query}&language=en&sortBy=publishedAt&pageSize=10`,
    {
      headers: {
        'X-Api-Key': NEWS_API_KEY,
      },
    }
  )

  if (!response.ok) {
    console.error(`Error fetching news for ${industry}:`, response.statusText)
    return
  }

  const data = await response.json()
  
  for (const article of data.articles) {
    try {
      // Insert article into the database, ignoring duplicates (based on URL)
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
        console.error(`Error inserting article:`, error)
      }
    } catch (error) {
      console.error(`Error processing article:`, error)
    }
  }
}

Deno.serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Fetch active industries
    const { data: industries, error: industriesError } = await supabase
      .from('tracked_industries')
      .select('name')
      .eq('active', true)

    if (industriesError) {
      throw industriesError
    }

    // Fetch news for each active industry
    const fetchPromises = industries.map(industry => fetchNewsForIndustry(industry.name))
    await Promise.all(fetchPromises)

    return new Response(JSON.stringify({
      message: 'News articles fetched and stored successfully'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Error in news fetch:', error)
    return new Response(JSON.stringify({
      error: 'Failed to fetch news articles'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
