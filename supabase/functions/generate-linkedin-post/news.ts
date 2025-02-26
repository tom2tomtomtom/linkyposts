
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { NewsArticle } from './types.ts';

export const fetchNewsForTopic = async (
  topic: string,
  industry?: string
): Promise<NewsArticle[]> => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    
    // Build the query
    let query = supabaseClient
      .from('news_articles')
      .select('*')
      .gte('published_date', twoWeeksAgo)
      .order('published_date', { ascending: false });

    // Add topic filter
    if (topic) {
      query = query.or(`title.ilike.%${topic}%,content.ilike.%${topic}%`);
    }

    // Add industry filter if provided
    if (industry) {
      query = query.eq('industry', industry);
    }

    const { data: newsArticles, error: newsError } = await query.limit(8);

    if (newsError) {
      console.error('Error fetching news:', newsError);
      return [];
    }

    console.log(`Found ${newsArticles?.length || 0} news articles for topic: ${topic}`);

    return (newsArticles || []).map(article => ({
      title: article.title,
      source: article.source,
      url: article.url,
      publishedDate: article.published_date,
      snippet: article.snippet || ''
    }));
  } catch (error) {
    console.error('Error processing news:', error);
    return [];
  }
};
