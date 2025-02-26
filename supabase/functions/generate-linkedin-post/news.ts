
import cheerio from "cheerio";

interface Article {
  title: string;
  content: string;
  url: string;
  publishedDate?: string;
}

export async function extractArticleContent(url: string): Promise<Article | null> {
  console.log("Attempting to extract content from URL:", url);
  try {
    const response = await fetch(url);
    const html = await response.text();
    console.log("Successfully fetched HTML content");

    const $ = cheerio.load(html);
    console.log("Cheerio loaded successfully");

    // Extract title
    let title = $('meta[property="og:title"]').attr('content') || 
                $('meta[name="twitter:title"]').attr('content') || 
                $('title').text();

    // Extract main content
    let content = '';
    
    // Try different content selectors
    const possibleContentSelectors = [
      'article',
      '.article-content',
      '.post-content',
      'main',
      '[role="main"]',
      '.content',
      '#content'
    ];

    for (const selector of possibleContentSelectors) {
      const element = $(selector);
      if (element.length) {
        content = element.text().trim();
        break;
      }
    }

    // If no content found, try paragraphs
    if (!content) {
      content = $('p').map((_, el) => $(el).text().trim()).get().join('\n\n');
    }

    // Clean up content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    console.log("Successfully extracted content:", {
      titleLength: title?.length,
      contentLength: content?.length
    });

    return {
      title: title || 'Untitled Article',
      content: content || 'No content found',
      url: url
    };
  } catch (error) {
    console.error("Error extracting content:", error);
    throw new Error(`Failed to extract content: ${error.message}`);
  }
}

export async function findRelatedArticles(topic: string): Promise<Article[]> {
  console.log("Finding related articles for topic:", topic);
  
  const newsApiKey = Deno.env.get('NEWS_API_KEY');
  if (!newsApiKey) {
    console.log("No NEWS_API_KEY found, skipping related articles");
    return [];
  }

  try {
    const encodedTopic = encodeURIComponent(topic);
    const url = `https://newsapi.org/v2/everything?q=${encodedTopic}&language=en&sortBy=relevancy&pageSize=3`;
    
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': newsApiKey
      }
    });

    const data = await response.json();
    console.log("News API response:", {
      status: data.status,
      totalResults: data.totalResults
    });

    if (data.status === 'ok' && data.articles) {
      return data.articles.map((article: any) => ({
        title: article.title,
        content: article.description || article.content || '',
        url: article.url,
        publishedDate: article.publishedAt
      }));
    }

    return [];
  } catch (error) {
    console.error("Error fetching related articles:", error);
    return [];
  }
}
