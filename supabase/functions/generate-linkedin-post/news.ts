
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { NewsArticle } from './types.ts';

export async function fetchRelevantNews(
  supabase: ReturnType<typeof createClient>,
  topic: string,
  industry: string
): Promise<NewsArticle[]> {
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
      return [];
    }

    return newsArticles.map(article => ({
      title: article.title,
      source: article.source,
      url: article.url,
      publishedDate: article.published_date,
      snippet: article.snippet
    }));
  } catch (error) {
    console.error('Error processing news:', error);
    return [];
  }
}
