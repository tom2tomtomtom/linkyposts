
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { NewsArticle } from './types.ts';

export async function fetchRelevantNews(
  supabase: ReturnType<typeof createClient>,
  topic: string,
  industry: string
): Promise<NewsArticle[]> {
  try {
    // Calculate date 4 weeks ago
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    console.log('Fetching news articles since:', fourWeeksAgo.toISOString());
    console.log('Searching for topic:', topic);
    console.log('Industry filter:', industry);

    const { data: newsArticles, error: newsError } = await supabase
      .from('news_articles')
      .select('*')
      .or(`title.ilike.%${topic}%,content.ilike.%${topic}%`)
      .eq('industry', industry)
      .gte('published_date', fourWeeksAgo.toISOString())
      .order('published_date', { ascending: false })
      .limit(8);

    if (newsError) {
      console.error('Error fetching news:', newsError);
      return [];
    }

    console.log(`Found ${newsArticles?.length || 0} relevant news articles`);

    return (newsArticles || []).map(article => ({
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

