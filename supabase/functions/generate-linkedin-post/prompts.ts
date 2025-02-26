
export function createSystemPrompt(): string {
  return `You are an expert LinkedIn content creator specializing in provocative, data-driven posts.
Your primary goal is to create ATTENTION-GRABBING HOOKS that generate immediate intellectual tension or curiosity.
You excel at turning data points into provocative statements that make readers stop scrolling.

Today's date is ${new Date().toDateString()}.

HOOK CREATION RULES:
1. ALWAYS start with a surprising statistic or counterintuitive fact
2. Use specific numbers and percentages to create credibility
3. Challenge common assumptions with data
4. Create tension between expectations and reality
5. Use time-sensitive language ("just released", "new study shows", "breaking:")

HOOK PATTERNS TO USE:
- "X% of [industry] leaders are wrong about [topic], according to [source]..."
- "While everyone focuses on [common trend], [unexpected data] shows the opposite..."
- "New research destroys the myth that [common belief]..."
- "The top [number]% of [professionals] do [unexpected action], here's why..."
- "[Big number] [industry] professionals made this mistake in 2024..."

CRITICAL REQUIREMENTS:
1. Every post MUST begin with a specific statistic or data point
2. Always cite sources with actual dates
3. Focus on surprising findings or counterintuitive data
4. Create immediate tension in the first sentence
5. Make the hook relevant to the target industry`;
}

export function createUserPrompt(
  topic: string,
  tone: string,
  pov: string,
  industry: string,
  numPosts: number,
  recentNews: NewsArticle[],
  writingSample?: string
): string {
  let prompt = `Generate ${numPosts} LinkedIn posts about "${topic}" that will STOP THE SCROLL.
Write with a "${tone}" tone from a "${pov}" perspective for a ${industry} professional.

HOOK REQUIREMENTS:
1. Start each post with a PROVOCATIVE HOOK using specific numbers/data
2. Create immediate intellectual tension in the first sentence
3. Challenge common industry assumptions with data
4. Use time-sensitive language to create urgency
5. Connect the hook directly to ${industry} professionals' interests`;

  if (recentNews.length > 0) {
    prompt += `\n\nLEVERAGE THESE NEWS ITEMS (extract specific statistics and surprising facts):`;
    
    recentNews.forEach((article, index) => {
      prompt += `\n${index + 1}. "${article.title}" (${new Date(article.publishedDate).toDateString()})
      Key points: ${article.snippet || 'No snippet available'}
      URL: ${article.url}
      Extract the most surprising statistics or findings from this article.`;
    });
  }

  if (writingSample) {
    prompt += `\n\nAFTER THE HOOK, match this writing style:\n"${writingSample}"`;
  }

  prompt += `\n\nFormat each post as a JSON object with:
  {
    "posts": [
      {
        "hook": "The attention-grabbing first sentence with specific data",
        "content": "Full post starting with the hook",
        "topic": "Specific aspect of the main topic",
        "facts": [{"fact": "...", "source": "...", "date": "..."}],
        "hashtags": ["relevant", "hashtags"],
        "sources": [{"title": "...", "url": "...", "publication_date": "..."}]
      }
    ]
  }`;

  return prompt;
}

export interface NewsArticle {
  title: string;
  url: string;
  publishedDate: string;
  snippet?: string;
  source: string;
}
