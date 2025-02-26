
// @deno-types="https://deno.land/x/cheerio@1.0.7/types/cheerio.d.ts"
import * as cheerio from "cheerio";

interface Article {
  title: string;
  content: string;
  url: string;
  publishedDate?: string;
  author?: string;
}

export async function extractArticleContent(url: string): Promise<Article> {
  console.log("Extracting content from URL:", url);
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    let title = $('meta[property="og:title"]').attr('content') || 
                $('meta[name="twitter:title"]').attr('content') || 
                $('title').text() || '';

    // Extract published date
    const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
                         $('meta[name="pubdate"]').attr('content');

    // Extract author
    const author = $('meta[name="author"]').attr('content') ||
                  $('.author').first().text() ||
                  $('[rel="author"]').first().text();

    // Remove unwanted elements
    $('script, style, nav, header, footer, iframe, .ad, .advertisement, .social-share').remove();

    // Extract main content
    let content = '';
    const article = $('article').first();
    if (article.length) {
      content = article.text();
    } else {
      // Try different content selectors
      const mainContent = $('main').first();
      if (mainContent.length) {
        content = mainContent.text();
      } else {
        // Fallback to looking for article-like content
        const paragraphs = $('p').map((_, el) => $(el).text()).get();
        content = paragraphs.join('\n\n');
      }
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    console.log("Successfully extracted content:", {
      titleLength: title.length,
      contentLength: content.length,
      hasPublishedDate: !!publishedDate,
      hasAuthor: !!author
    });

    return {
      title,
      content,
      url,
      publishedDate,
      author
    };
  } catch (error) {
    console.error("Error extracting article content:", error);
    throw new Error(`Failed to extract content from URL: ${error.message}`);
  }
}

export async function findRelatedArticles(topic: string): Promise<Article[]> {
  const newsApiKey = Deno.env.get('NEWS_API_KEY');
  if (!newsApiKey) {
    console.log("No NEWS_API_KEY found, skipping related articles search");
    return [];
  }

  try {
    console.log("Searching for related articles about:", topic);
    
    const encodedTopic = encodeURIComponent(topic);
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodedTopic}&sortBy=relevancy&pageSize=3&language=en`,
      {
        headers: {
          'X-Api-Key': newsApiKey
        }
      }
    );

    const data = await response.json();
    
    if (!data.articles) {
      console.log("No related articles found");
      return [];
    }

    console.log(`Found ${data.articles.length} related articles`);

    const articles: Article[] = await Promise.all(
      data.articles.map(async (article: any) => {
        try {
          // Extract content from each related article
          const fullArticle = await extractArticleContent(article.url);
          return fullArticle;
        } catch (error) {
          console.error("Error extracting related article content:", error);
          // Return basic article info if full content extraction fails
          return {
            title: article.title,
            content: article.description || "",
            url: article.url,
            publishedDate: article.publishedAt,
            author: article.author
          };
        }
      })
    );

    return articles;
  } catch (error) {
    console.error("Error finding related articles:", error);
    return [];
  }
}
