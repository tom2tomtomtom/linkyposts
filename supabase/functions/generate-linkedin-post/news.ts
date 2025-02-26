
interface Article {
  title: string;
  content: string;
  url: string;
}

export async function extractArticleContent(url: string): Promise<Article> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';

    // Extract article content
    // First try to find article or main content
    let content = '';
    const articleContent = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainContent = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    
    if (articleContent) {
      content = articleContent[1];
    } else if (mainContent) {
      content = mainContent[1];
    } else {
      // Fallback to body content
      const bodyContent = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyContent) {
        content = bodyContent[1];
      }
    }

    // Clean up the content
    content = content
      // Remove HTML tags
      .replace(/<[^>]*>/g, ' ')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters
      .replace(/[^\w\s.,!?-]/g, '')
      .trim();

    // Limit content length to prevent token limits
    const maxLength = 2000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...';
    }

    return {
      title,
      content,
      url
    };
  } catch (error) {
    console.error("Error extracting article content:", error);
    throw new Error(`Failed to extract content from URL: ${error.message}`);
  }
}
